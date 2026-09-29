#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// make-kit.mjs — synthesises the v3 UI sound kit (studio/public/sfx/v3/*.wav).
//
//   node public/sfx/v3/make-kit.mjs            (from studio/)  → writes the .wav files here
//   node public/sfx/v3/make-kit.mjs <outDir>   → writes somewhere else (for A/B-ing a tweak)
//
// Pure Node, no dependencies, fully deterministic (seeded noise) — re-running it gives
// byte-identical files. Why not ffmpeg lavfi? Remotion's bundled ffmpeg is a stripped
// build (no aevalsrc / anoisesrc / lowpass / ebur128), and time-varying filters (the
// whoosh's moving band, the riser's sweep) are much cleaner sample-by-sample anyway.
//
// Every file goes through the same finish(): DC block → tail trim → raised-cosine fade
// in/out (starts and ends on exact zero, no clicks) → loudness-match to KIT_REF_LUFS
// (max momentary, BS.1770 K-weighted, 400 ms) under a true-peak ceiling → 16-bit TPDF
// dither → 48 kHz stereo WAV. So the kit is level-matched: sound.ts sets the mix level.
// ─────────────────────────────────────────────────────────────────────────────
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SR = 48000;
const KIT_REF_LUFS = -20; // every file's max momentary loudness (sound.ts assumes this)
const TP_CEIL_DB = -1.5; // true-peak ceiling (dBTP)
const OUT = process.argv[2] ?? dirname(fileURLToPath(import.meta.url));

const TAU = Math.PI * 2;
const sec = (s) => Math.round(s * SR);
const db = (x) => 20 * Math.log10(Math.max(Math.abs(x), 1e-12));
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const smooth = (x) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
const rcos = (x) => { const u = clamp01(x); return 0.5 - 0.5 * Math.cos(Math.PI * u); }; // 0→1 raised cosine

// ── noise ────────────────────────────────────────────────────────────────────
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
class Noise {
  constructor(seed) { this.r = mulberry32(seed); this.b = [0, 0, 0, 0, 0, 0, 0]; this.br = 0; }
  white() { return this.r() * 2 - 1; }
  pink() { // Paul Kellet's refined pink filter
    const w = this.white(), b = this.b;
    b[0] = 0.99886 * b[0] + w * 0.0555179; b[1] = 0.99332 * b[1] + w * 0.0750759;
    b[2] = 0.969 * b[2] + w * 0.153852; b[3] = 0.8665 * b[3] + w * 0.3104856;
    b[4] = 0.55 * b[4] + w * 0.5329522; b[5] = -0.7616 * b[5] - w * 0.016898;
    const o = b[0] + b[1] + b[2] + b[3] + b[4] + b[5] + b[6] + w * 0.5362;
    b[6] = w * 0.115926;
    return o * 0.11;
  }
  brown() { this.br = (this.br + 0.02 * this.white()) / 1.02; return this.br * 3.5; }
}

// ── filters ──────────────────────────────────────────────────────────────────
// Simper's TPT state-variable filter: stable under per-sample cutoff modulation.
// bpN = unity-peak band-pass.
class SVF {
  constructor() { this.a = 0; this.b = 0; }
  run(x, fc, q) {
    const g = Math.tan((Math.PI * Math.min(fc, SR * 0.45)) / SR), k = 1 / q;
    const a1 = 1 / (1 + g * (g + k)), a2 = g * a1, a3 = g * a2;
    const v3 = x - this.b, v1 = a1 * this.a + a2 * v3, v2 = this.b + a2 * this.a + a3 * v3;
    this.a = 2 * v1 - this.a; this.b = 2 * v2 - this.b;
    this.lp = v2; this.bp = v1; this.bpN = k * v1; this.hp = x - k * v1 - v2;
    return this;
  }
}
// in-place 2-pole (12 dB/oct) tone shaping on a stereo pair
function tone([L, R], { lp, hp, q = 0.707 }) {
  for (const ch of [L, R]) {
    const fl = new SVF(), fh = new SVF();
    for (let i = 0; i < ch.length; i++) {
      let x = ch[i];
      if (hp) x = fh.run(x, hp, q).hp;
      if (lp) x = fl.run(x, lp, q).lp;
      ch[i] = x;
    }
  }
}

// small, dark stereo room — convolution with a synthetic impulse response: decorrelated
// noise per channel, exponential decay (rt = RT60), low-passed progressively (bright
// early, dark tail), a few ms of pre-delay. Dense and smooth (no comb flutter on short
// sounds). The IR is energy-normalised, so `wet` is simply the tail's gain (0.1 ≈ -20 dB).
function room([L, R], { wet = 0.1, rt = 0.32, pre = 0.007, bright = 6000, dark = 1400, seed = 5 }) {
  const len = Math.min(0.45, rt * 1.1), n = sec(len), p = sec(pre);
  const irs = [0, 1].map((c) => {
    const nz = new Noise(seed + c * 17), f = new SVF(), ir = new Float64Array(n + p);
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      const fc = dark + (bright - dark) * Math.exp(-t / (rt / 5));
      ir[p + i] = f.run(nz.white(), fc, 0.6).lp * Math.exp((-6.9 * t) / rt) * rcos(t / 0.003) * rcos((len - t) / 0.03);
    }
    let e = 0;
    for (const v of ir) e += v * v;
    const g = 1 / Math.sqrt(e);
    for (let i = 0; i < ir.length; i++) ir[i] *= g;
    return ir;
  });
  const N = L.length, inp = new Float64Array(N);
  for (let i = 0; i < N; i++) inp[i] = (L[i] + R[i]) * 0.5;
  const outs = irs.map((ir) => {
    const o = new Float64Array(N);
    for (let i = 0; i < N; i++) {
      const x = inp[i];
      if (Math.abs(x) < 1e-7) continue;
      const kmax = Math.min(ir.length, N - i);
      for (let k = 0; k < kmax; k++) o[i + k] += x * ir[k];
    }
    return o;
  });
  for (let i = 0; i < N; i++) { L[i] += outs[0][i] * wet; R[i] += outs[1][i] * wet; }
}

// ── loudness (ITU-R BS.1770-4 K-weighting @ 48 kHz) ──────────────────────────
function biquad(x, b, a) {
  const y = new Float64Array(x.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const v = b[0] * x[i] + b[1] * x1 + b[2] * x2 - a[1] * y1 - a[2] * y2;
    x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v;
  }
  return y;
}
const kw = (x) => biquad(
  biquad(x, [1.53512485958697, -2.69169618940638, 1.19839281085285], [1, -1.69065929318241, 0.73248077421585]),
  [1, -2, 1], [1, -1.99004745483398, 0.99007225036621],
);
function momentaryMax(L, R) {
  const pad = sec(0.45), n = L.length + 2 * pad;
  const pl = new Float64Array(n), pr = new Float64Array(n);
  pl.set(L, pad); pr.set(R, pad);
  const kl = kw(pl), kr = kw(pr);
  const cs = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) cs[i + 1] = cs[i] + kl[i] * kl[i] + kr[i] * kr[i];
  const W = sec(0.4), hop = sec(0.005);
  let best = 0;
  for (let s = 0; s + W <= n; s += hop) best = Math.max(best, (cs[s + W] - cs[s]) / W);
  return -0.691 + 10 * Math.log10(Math.max(best, 1e-12));
}
// 4x windowed-sinc oversampled peak (true-peak estimate)
function truePeak(ch) {
  const T = 16, O = 4;
  let pk = 0;
  const taps = [];
  for (let o = 1; o < O; o++) {
    const fr = o / O, row = [];
    for (let k = -T + 1; k <= T; k++) {
      const x = k - fr, w = 0.5 + 0.5 * Math.cos((Math.PI * x) / T);
      row.push(x === 0 ? 1 : (Math.sin(Math.PI * x) / (Math.PI * x)) * w);
    }
    taps.push(row);
  }
  for (let i = 0; i < ch.length; i++) {
    pk = Math.max(pk, Math.abs(ch[i]));
    for (const row of taps) {
      let s = 0;
      for (let k = -T + 1, j = 0; k <= T; k++, j++) { const idx = i + k; if (idx >= 0 && idx < ch.length) s += ch[idx] * row[j]; }
      pk = Math.max(pk, Math.abs(s));
    }
  }
  return pk;
}

// ── output ───────────────────────────────────────────────────────────────────
function wav16(path, L, R, seed) {
  const n = L.length, data = Buffer.alloc(n * 4), r = mulberry32(seed);
  for (let i = 0; i < n; i++) {
    const edge = i < 32 || i >= n - 32; // exact digital silence at both ends
    for (const [c, x] of [[0, L[i]], [1, R[i]]]) {
      const d = edge ? 0 : r() - r(); // TPDF, ±1 LSB
      const v = Math.max(-32768, Math.min(32767, Math.round(x * 32767 + d)));
      data.writeInt16LE(v, i * 4 + c * 2);
    }
  }
  const h = Buffer.alloc(44);
  h.write("RIFF", 0); h.writeUInt32LE(36 + data.length, 4); h.write("WAVE", 8);
  h.write("fmt ", 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(2, 22);
  h.writeUInt32LE(SR, 24); h.writeUInt32LE(SR * 4, 28); h.writeUInt16LE(4, 32); h.writeUInt16LE(16, 34);
  h.write("data", 36); h.writeUInt32LE(data.length, 40);
  writeFileSync(path, Buffer.concat([h, data]));
}

const report = [];
function finish(name, [L, R], { fadeInMs = 2, fadeOutMs = 30, maxLen = 1.2, floorDb = -60 }) {
  // DC block (~4 Hz)
  for (const ch of [L, R]) {
    let x1 = 0, y1 = 0;
    for (let i = 0; i < ch.length; i++) { const y = ch[i] - x1 + 0.9995 * y1; x1 = ch[i]; y1 = y; ch[i] = y; }
  }
  // tail trim: last sample above floorDb (re peak), capped at maxLen
  let pk = 0;
  for (let i = 0; i < L.length; i++) pk = Math.max(pk, Math.abs(L[i]), Math.abs(R[i]));
  const thr = pk * 10 ** (floorDb / 20);
  let end = L.length;
  while (end > 1 && Math.abs(L[end - 1]) < thr && Math.abs(R[end - 1]) < thr) end--;
  end = Math.min(end, sec(maxLen));
  const l = L.slice(0, end), r = R.slice(0, end);
  const fi = Math.max(1, sec(fadeInMs / 1000)), fo = Math.max(1, sec(fadeOutMs / 1000));
  for (let i = 0; i < end; i++) {
    const g = rcos(i / fi) * rcos((end - 1 - i) / fo);
    l[i] *= g; r[i] *= g;
  }
  // loudness match under the true-peak ceiling
  const m = momentaryMax(l, r);
  let g = 10 ** ((KIT_REF_LUFS - m) / 20);
  const tp = Math.max(truePeak(l), truePeak(r));
  const ceil = 10 ** (TP_CEIL_DB / 20);
  const limited = tp * g > ceil;
  if (limited) g = ceil / tp;
  for (let i = 0; i < end; i++) { l[i] *= g; r[i] *= g; }
  const file = `${name}.wav`;
  wav16(join(OUT, file), l, r, name.length * 7919);
  report.push({ file, ms: Math.round((end / SR) * 1000), M: +momentaryMax(l, r).toFixed(1), tp: +db(tp * g).toFixed(1), limited });
}

// ── the sounds ───────────────────────────────────────────────────────────────
const stereo = (s) => [new Float64Array(sec(s)), new Float64Array(sec(s))];
const pan = (p) => { const a = ((p + 1) * Math.PI) / 4; return [Math.cos(a) * Math.SQRT2, Math.sin(a) * Math.SQRT2]; };

// AIR WHOOSH — camera travel. Pink noise through a wide band-pass whose centre rides the
// envelope (brighter at the fastest point, like air speed), a little brown-noise body,
// decorrelated side noise for width. Swell peaks at HIT (= mid-travel). dir: +1 content
// arrives from the right, -1 from the left, 0 = vertical move (centred, darkens as it lands).
function whoosh(name, { dir, seed, D = 0.6, hit = 0.26, bright = 1 }) {
  const out = stereo(D + 0.4), [L, R] = out;
  const nm = new Noise(seed), ns = new Noise(seed + 101), nb = new Noise(seed + 202);
  const fm = new SVF(), fs = new SVF(), fb = new SVF();
  for (let i = 0; i < sec(D); i++) {
    const t = i / SR;
    const env = t < hit ? Math.sin((Math.PI / 2) * (t / hit)) ** 2 : ((1 + Math.cos((Math.PI * (t - hit)) / (D - hit))) / 2) ** 1.6;
    const settle = dir === 0 ? -0.55 * smooth((t - hit) / (D - hit)) : 0;
    const fc = 300 * bright * 2 ** (2.5 * env + settle);
    const air = fm.run(nm.pink(), fc, 0.75).bpN * env;
    const side = fs.run(ns.pink(), fc * 1.12, 0.75).bpN * env * 0.4;
    const body = fb.run(nb.brown(), 210, 0.7).lp * env ** 1.5 * 0.45;
    const p = dir * (0.42 - 0.6 * smooth(t / D)); // enters from its side, drifts past centre
    const [gl, gr] = pan(p);
    const mono = air + body;
    L[i] = mono * gl + side;
    R[i] = mono * gr - side;
  }
  tone(out, { hp: 90, lp: 6500 });
  room(out, { wet: 0.12, rt: 0.35 });
  finish(name, out, { fadeInMs: 3, fadeOutMs: 60, maxLen: 0.72 });
}

// UI TICK — a glassy/wooden micro-resonance: three inharmonic partials with fast
// exponential decays + a sub-millisecond contact transient. ~2 kHz sits where phone
// speakers are most efficient, so it reads even very quiet.
function tick(name, { pitch = 1, seed }) {
  const out = stereo(0.35), [L, R] = out;
  const nz = new Noise(seed), hp = new SVF();
  const parts = [[1870, 0.0092, 1], [3050, 0.004, 0.3], [1190, 0.0145, 0.42]];
  for (let i = 0; i < L.length; i++) {
    const t = i / SR;
    let x = 0;
    for (const [f, tau, a] of parts) x += a * Math.sin(TAU * f * pitch * t) * Math.exp(-t / tau);
    x += hp.run(nz.white(), 2600, 0.7).hp * Math.exp(-t / 0.0006) * 0.4;
    x *= rcos(t / 0.0004);
    L[i] = x; R[i] = x;
  }
  tone(out, { lp: 9000 });
  room(out, { wet: 0.1, rt: 0.22 });
  finish(name, out, { fadeInMs: 0.4, fadeOutMs: 40, maxLen: 0.24 });
}

// SOFT POP — an object landing: a round sine "bloop" with a small upward glide
// (400 → 600 Hz in ~10 ms), a hint of 2nd harmonic, and a low-passed air puff.
function pop(name, { seed }) {
  const out = stereo(0.45), [L, R] = out;
  const nz = new Noise(seed), lp = new SVF();
  let ph = 0;
  for (let i = 0; i < L.length; i++) {
    const t = i / SR;
    const f = 400 + 200 * (1 - Math.exp(-t / 0.01));
    ph += (TAU * f) / SR;
    const env = rcos(t / 0.003) * Math.exp(-t / 0.042);
    const x = (Math.sin(ph) + 0.12 * Math.sin(2 * ph + 0.4)) * env
      + lp.run(nz.white(), 1500, 0.7).lp * Math.exp(-t / 0.006) * 0.55 * rcos(t / 0.001);
    L[i] = x; R[i] = x;
  }
  tone(out, { hp: 120, lp: 7000 });
  room(out, { wet: 0.13, rt: 0.28 });
  finish(name, out, { fadeInMs: 1, fadeOutMs: 50, maxLen: 0.3 });
}

// SOFT KEY TAP — a low-profile (laptop / Magic-Keyboard) key, not a mechanical clack:
// a band-passed contact click + tiny bottom-out click, a short "thock" body with a
// slight downward pitch, and a narrow plate resonance.
function keyTap([L, R], at, { seed, level = 1, pitch = 1, p = 0 }) {
  const nz = new Noise(seed), bp = new SVF(), pl = new SVF();
  const [gl, gr] = pan(p), o = sec(at);
  let pa = 0, pb = 0;
  for (let i = 0; i < sec(0.14) && o + i < L.length; i++) {
    const t = i / SR;
    const burst = Math.exp(-t / 0.0014) + (t > 0.0068 ? 0.32 * Math.exp(-(t - 0.0068) / 0.001) : 0);
    const click = bp.run(nz.white() * burst, 2900 * pitch, 0.9).bpN * 0.6;
    pa += (TAU * 205 * pitch * (1 + 0.08 * Math.exp(-t / 0.006))) / SR;
    pb += (TAU * 540 * pitch) / SR;
    const thock = Math.sin(pa) * Math.exp(-t / 0.012) * 0.34 + Math.sin(pb) * Math.exp(-t / 0.01) * 0.42;
    const plate = pl.run(nz.white(), 1450 * pitch, 5).bpN * Math.exp(-t / 0.01) * 2;
    const x = (click + thock + plate) * rcos(t / 0.0008) * level;
    L[o + i] += x * gl; R[o + i] += x * gr;
  }
}
function keys(name, taps) {
  const out = stereo(0.7);
  taps.forEach((tp, i) => keyTap(out, tp.at, { seed: 900 + i * 37, ...tp }));
  tone(out, { hp: 110, lp: 9000 });
  room(out, { wet: 0.08, rt: 0.2 });
  finish(name, out, { fadeInMs: 0.3, fadeOutMs: 40, maxLen: 0.6 });
}

// CONFIRM — two soft rising notes (a fifth: D5 → A5, 85 ms apart). Each note is a
// ratio-2 FM tone whose index collapses in ~30 ms: a gentle "struck" attack that settles
// into a near-pure sine, two-stage decay like a tine. Low-passed, a little room.
function chime([L, R], at, { f, level, p }) {
  const [gl, gr] = pan(p), o = sec(at);
  for (let i = 0; o + i < L.length; i++) {
    const t = i / SR;
    const I = 1.05 * Math.exp(-t / 0.028) + 0.06;
    const car = Math.sin(TAU * f * t + I * Math.sin(TAU * 2 * f * t));
    const ting = 0.05 * Math.sin(TAU * f * 4.02 * t) * Math.exp(-t / 0.03);
    const env = rcos(t / 0.003) * (0.74 * Math.exp(-t / 0.12) + 0.26 * Math.exp(-t / 0.26));
    const x = (car + ting) * env * level;
    L[o + i] += x * gl; R[o + i] += x * gr;
  }
}
function confirm(name) {
  const out = stereo(0.9);
  chime(out, 0, { f: 587.33, level: 0.78, p: -0.12 });
  chime(out, 0.085, { f: 880, level: 1, p: 0.12 });
  tone(out, { hp: 150, lp: 5200 });
  room(out, { wet: 0.14, rt: 0.45 });
  finish(name, out, { fadeInMs: 1.5, fadeOutMs: 200, maxLen: 0.7 });
}

// SOFT THUMP — low emphasis under a big number: a felt mallet on a wooden box, not a
// cinematic boom. Three layers: a sub sine dropping 100 → 50 Hz (felt on headphones), a
// "box" body resonance 200 → 165 Hz gently saturated (asymmetric → 2nd + 3rd harmonics at
// 330-600 Hz — what a phone speaker actually plays), and a soft knock + felt puff on the
// attack for definition. Phone-band loss is kept to a few dB (a pure sub thump loses ~25).
function thump(name, { seed }) {
  const out = stereo(0.7), [L, R] = out;
  const nz = new Noise(seed), lp = new SVF();
  let ps = 0, pb = 0;
  for (let i = 0; i < L.length; i++) {
    const t = i / SR;
    ps += (TAU * (50 + 50 * Math.exp(-t / 0.028))) / SR;
    pb += (TAU * (180 + 45 * Math.exp(-t / 0.02))) / SR;
    const atk = rcos(t / 0.003);
    const sub = Math.sin(ps) * Math.exp(-t / 0.11) * 0.45;
    const b = Math.sin(pb) * Math.exp(-t / 0.065);
    const box = (Math.tanh(2.6 * (b + 0.5 * b * b)) / Math.tanh(2.6)) * 0.7;
    const knock = Math.sin(TAU * 470 * t) * Math.exp(-t / 0.032) * 0.75 + Math.sin(TAU * 760 * t) * Math.exp(-t / 0.014) * 0.22;
    const felt = lp.run(nz.white(), 1300, 0.7).lp * Math.exp(-t / 0.01) * 0.45 * rcos(t / 0.001);
    const x = (sub + box + knock + felt) * atk;
    L[i] = x; R[i] = x;
  }
  tone(out, { hp: 32, lp: 3500 });
  room(out, { wet: 0.06, rt: 0.25 });
  finish(name, out, { fadeInMs: 2, fadeOutMs: 80, maxLen: 0.55 });
}

// SOFT RISER — ~0.9 s of filtered air rising into a reveal and stopping ON the hit
// (a 25 ms release at the very end). Band centre sweeps 300 Hz → 3.6 kHz, Q tightens,
// the image widens. Starts audible (no dead head) so it can be placed by its end.
function riser(name, { seed, D = 0.9 }) {
  const out = stereo(D + 0.35), [L, R] = out;
  const nm = new Noise(seed), ns = new Noise(seed + 77);
  const fm = new SVF(), fs = new SVF();
  for (let i = 0; i < sec(D); i++) {
    const t = i / SR, u = t / D;
    const env = (0.07 + 0.93 * u ** 2.2) * (1 - rcos((t - (D - 0.025)) / 0.025));
    const fc = 300 * 2 ** (3.6 * u ** 1.3);
    const q = 0.8 + 1.3 * u;
    const m = fm.run(nm.pink(), fc, q).bpN * env;
    const s = fs.run(ns.pink(), fc * 1.1, q).bpN * env * (0.15 + 0.4 * u);
    L[i] = m + s; R[i] = m - s;
  }
  tone(out, { hp: 150, lp: 7000 });
  room(out, { wet: 0.12, rt: 0.4 });
  finish(name, out, { fadeInMs: 10, fadeOutMs: 120, maxLen: D + 0.2 });
}

// ── build ────────────────────────────────────────────────────────────────────
mkdirSync(OUT, { recursive: true });
whoosh("whoosh-air-right", { dir: 1, seed: 11 });
whoosh("whoosh-air-left", { dir: -1, seed: 23 });
whoosh("whoosh-air-down", { dir: 0, seed: 37, bright: 0.92 });
tick("tick-a", { pitch: 1, seed: 41 });
tick("tick-b", { pitch: 1.122, seed: 43 }); // +2 semitones: successive ticks step up
pop("pop-soft", { seed: 53 });
keys("keys-3", [
  { at: 0, level: 1, pitch: 1, p: -0.08 },
  { at: 0.118, level: 0.78, pitch: 1.05, p: 0.1 },
  { at: 0.262, level: 0.9, pitch: 0.97, p: -0.02 },
]);
keys("key-1", [{ at: 0, level: 1, pitch: 1.02, p: 0 }, { at: 0.085, level: 0.5, pitch: 1.16, p: 0 }]); // press + soft release
confirm("confirm");
thump("thump-soft", { seed: 61 });
riser("riser-soft", { seed: 71 });

console.table(report);
