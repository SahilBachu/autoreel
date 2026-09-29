import type { Word } from "../types";
import type { WorldObject } from "./layout";

// ─────────────────────────────────────────────────────────────────────────────
// ONE shared camera (motion v3).
//
// TIMING — how long an object stays:
//   1. its planned end is snapped forward to the end of the phrase he is saying at that
//      moment (≤1.5s), so a graphic never leaves mid-sentence;
//   2. if the next object arrives within BRIDGE of that, this one HOLDS until the camera
//      travels to it — no flash of bare face between beats he's still talking through;
//   3. only a genuinely long gap releases the world: the camera pushes in and the world
//      fades to his face; it comes back travelling in from the old object's side.
//   4. the last object holds to the final frame — unless the reel runs on well past it
//      (> 1.5 × BRIDGE), then it releases like any other beat.
// The object MOUNTS when the camera starts travelling to it (from − LEAD), so it is already
// arriving mid-move, and unmounts once the camera has left it.
//
// MOTION — the camera never freezes:
//   • hold  : slow push-in (≈0.65%/s, ≤4.5%), a gentle glide, a tiny float
//   • travel: 22 frames (leave 9 before the beat, arrive 13 after), zoom dips ~9% mid-move
//   • everything is a TARGET path; the real camera is a spring-damper following it
//     (ω=16, ζ=0.6) — travels land with a ~1% overshoot and settle ~7 frames later.
//     The track is integrated once per render from frame 0, so it's fully deterministic.
// ─────────────────────────────────────────────────────────────────────────────

export const LEAD = 9; // travel starts this many frames before the beat
export const TAIL = 13; // …and the target arrives this many frames after it
export const TRAVEL = LEAD + TAIL;
export const BRIDGE_S = 2.2; // gaps shorter than this (after phrase snapping) are held through
export const EXIT = 10; // release: world fade-out length
const FADE_IN = 8;
const DIP = 0.09;
const OMEGA = 16;
const ZETA = 0.6;

export type Beat = {
  i: number;
  from: number; // the planned start = arrival centre (the object mounts LEAD frames earlier)
  settle: number; // target reaches the object
  depart: number; // camera starts leaving (next arrival) or the release begins
  end: number; // frame the object leaves the screen entirely
  after: "travel" | "release" | "end";
  enter: "travel" | "fresh"; // how the camera gets here
  heldTo: number; // frame the object is "about" until (phrase-snapped planned end)
};

// ── phrase snapping ──────────────────────────────────────────────────────────
/** the planned end, pushed to the end of the phrase in progress (never earlier). */
export function phraseEndMs(words: Word[], tMs: number, maxExtendMs = 1500): number {
  const PUNCT = /[.!?,;:]["')\]]?$/;
  let k = words.findIndex((w) => w.endMs > tMs);
  if (k < 0) return tMs;
  if (words[k].startMs >= tMs + 250) return tMs; // he'd already stopped — the thought ended
  const prev = words[k - 1];
  // a SENTENCE closed just before → the thought is over. A comma or a breath doesn't count:
  // "npm install, … cf, open source and open beta" is still the same thought, and holding a
  // touch long is the better failure than leaving while he's still on it.
  if (prev && prev.endMs <= tMs && /[.!?]["')\]]?$/.test(prev.text)) return tMs;
  const cap = tMs + maxExtendMs;
  for (; k < words.length; k++) {
    const w = words[k];
    const next = words[k + 1];
    const brk = PUNCT.test(w.text) || !next || next.startMs - w.endMs >= 280;
    if (brk || w.endMs >= cap) return Math.max(tMs, Math.min(w.endMs, cap + 500) + 150);
  }
  return tMs;
}

export function planBeats(objs: WorldObject[], words: Word[], fps: number, total: number): Beat[] {
  const toF = (ms: number) => Math.round((ms / 1000) * fps);
  const bridge = Math.round(BRIDGE_S * fps);
  const beats: Beat[] = [];
  objs.forEach((o, i) => {
    const next = objs[i + 1];
    const prev = beats[i - 1];
    const heldTo = Math.max(o.to, toF(phraseEndMs(words, (o.to / fps) * 1000)));
    const enter: Beat["enter"] = prev && prev.after === "travel" ? "travel" : "fresh";
    const settle = o.from + TAIL;
    if (!next) {
      // the closing card holds to the very end (no face flash on the final frames) — unless
      // the reel carries on well past it, then it releases like any other beat
      if (total - heldTo < bridge * 1.5) beats.push({ i, from: o.from, settle, depart: total + 1, end: total + 1, after: "end", enter, heldTo });
      else beats.push({ i, from: o.from, settle, depart: heldTo, end: heldTo + EXIT, after: "release", enter, heldTo });
    } else if (next.from - heldTo < bridge) {
      beats.push({ i, from: o.from, settle, depart: next.from - LEAD, end: next.from + TAIL + 2, after: "travel", enter, heldTo });
    } else {
      beats.push({ i, from: o.from, settle, depart: heldTo, end: heldTo + EXIT, after: "release", enter, heldTo });
    }
  });
  return beats;
}

// ── the target path ──────────────────────────────────────────────────────────
type Pose = { x: number; y: number; z: number };
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const ease3 = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
const easeSine = (u: number) => -(Math.cos(Math.PI * u) - 1) / 2;
const easeOut2 = (u: number) => 1 - (1 - u) * (1 - u);

function holdPose(o: WorldObject, b: Beat, f: number, fps: number): Pose {
  const len = Math.max(1, b.depart - b.settle);
  const tau = Math.max(0, f - b.settle);
  const p = easeSine(clamp01(tau / len));
  const push = Math.max(0.006, Math.min(0.045, 0.0065 * (len / fps)));
  const fl = Math.min(1, tau / 24); // float ramps in so the hold starts exactly on the pose
  return {
    x: o.fx + o.dx * p + 3.5 * Math.sin((2 * Math.PI * tau) / (5.3 * fps)) * fl,
    y: o.fy + o.dy * p + 3 * Math.sin((2 * Math.PI * tau) / (6.9 * fps)) * fl,
    z: o.z * (1 + push * p),
  };
}

function entryPose(objs: WorldObject[], i: number): Pose {
  const o = objs[i];
  const p = objs[i - 1];
  // first appearance: from slightly below and wider. after a face beat: from the old
  // object's side, so coming back from his face the camera has clearly moved on.
  if (!p) return { x: o.fx, y: o.fy + 80, z: o.z * 0.88 };
  return { x: o.fx + (p.fx - o.fx) * 0.12, y: o.fy + (p.fy - o.fy) * 0.12, z: o.z * 0.9 };
}

type Seg = { a: number; b: number; pose: (f: number) => Pose; visible: boolean };

function segments(objs: WorldObject[], beats: Beat[], fps: number): Seg[] {
  const segs: Seg[] = [];
  beats.forEach((b, i) => {
    const o = objs[i];
    const a = b.from - LEAD;
    const P1 = holdPose(o, b, b.settle, fps);
    const P0 = b.enter === "travel" ? holdPose(objs[i - 1], beats[i - 1], a, fps) : entryPose(objs, i);
    const dip = b.enter === "travel" ? DIP : 0;
    segs.push({
      a,
      b: b.settle,
      visible: true,
      pose: (f) => {
        const u = clamp01((f - a) / (b.settle - a));
        const e = ease3(u);
        return {
          x: P0.x + (P1.x - P0.x) * e,
          y: P0.y + (P1.y - P0.y) * e,
          z: (P0.z + (P1.z - P0.z) * e) * (1 - dip * Math.sin(Math.PI * u)),
        };
      },
    });
    segs.push({ a: b.settle, b: b.depart, visible: true, pose: (f) => holdPose(o, b, f, fps) });
    if (b.after === "release") {
      const R = holdPose(o, b, b.depart, fps);
      const n = objs[i + 1];
      const ddx = n ? Math.sign(n.fx - o.fx) * 50 : 0;
      const ddy = n ? Math.sign(n.fy - o.fy) * 50 : 0;
      segs.push({
        a: b.depart,
        b: b.end,
        visible: true,
        pose: (f) => {
          const e = easeOut2(clamp01((f - b.depart) / EXIT));
          return { x: R.x + ddx * e, y: R.y + ddy * e, z: R.z * (1 + 0.07 * e) };
        },
      });
      // hidden: park on the next entry pose so the follower snaps there unseen
      if (beats[i + 1]) {
        const E = entryPose(objs, i + 1);
        segs.push({ a: b.end, b: beats[i + 1].from - LEAD, visible: false, pose: () => E });
      } else {
        const F = { x: R.x + ddx, y: R.y + ddy, z: R.z * 1.07 };
        segs.push({ a: b.end, b: Number.MAX_SAFE_INTEGER, visible: false, pose: () => F });
      }
    }
  });
  return segs;
}

export type Track = {
  x: Float32Array;
  y: Float32Array;
  z: Float32Array;
  op: Float32Array; // world opacity
  vx: Float32Array; // screen-space camera velocity (px / frame)
  vy: Float32Array;
  vz: Float32Array; // relative zoom speed (Δz / z per frame)
};

export function buildTrack(objs: WorldObject[], beats: Beat[], fps: number, total: number): Track {
  const N = total + 2;
  const t: Track = {
    x: new Float32Array(N),
    y: new Float32Array(N),
    z: new Float32Array(N).fill(1),
    op: new Float32Array(N),
    vx: new Float32Array(N),
    vy: new Float32Array(N),
    vz: new Float32Array(N),
  };
  if (!objs.length) return t;
  const segs = segments(objs, beats, fps);
  const first = entryPose(objs, 0);
  const firstA = beats[0].from - LEAD;

  let x = first.x, y = first.y, z = first.z;
  let vx = 0, vy = 0, vz = 0;
  let si = 0;
  const SUB = 4;
  const dt = 1 / fps / SUB;
  for (let f = 0; f < N; f++) {
    while (si < segs.length - 1 && f >= segs[si].b && f >= segs[si + 1].a) si++;
    const s = segs[si];
    let target: Pose;
    let visible: boolean;
    if (f < firstA) {
      target = first;
      visible = false;
    } else if (f < s.a) {
      target = s.pose(s.a);
      visible = s.visible;
    } else {
      target = s.pose(Math.min(f, s.b));
      visible = s.visible;
    }
    if (!visible) {
      // unseen: snap (no lag carried into the next entrance)
      x = target.x; y = target.y; z = target.z;
      vx = vy = vz = 0;
    } else {
      for (let k = 0; k < SUB; k++) {
        vx += (OMEGA * OMEGA * (target.x - x) - 2 * ZETA * OMEGA * vx) * dt;
        vy += (OMEGA * OMEGA * (target.y - y) - 2 * ZETA * OMEGA * vy) * dt;
        vz += (OMEGA * OMEGA * (target.z - z) - 2 * ZETA * OMEGA * vz) * dt;
        x += vx * dt; y += vy * dt; z += vz * dt;
      }
    }
    t.x[f] = x; t.y[f] = y; t.z[f] = z;
    if (f > 0) {
      t.vx[f] = (t.x[f] - t.x[f - 1]) * z;
      t.vy[f] = (t.y[f] - t.y[f - 1]) * z;
      t.vz[f] = (t.z[f] - t.z[f - 1]) / z;
    }
  }

  // world opacity: fade in on a fresh entrance, fade out on a release, hold otherwise
  beats.forEach((b, i) => {
    const a = b.from - LEAD;
    const stop = b.after === "release" ? b.end : b.after === "end" ? N : beats[i + 1].from - LEAD;
    for (let f = Math.max(0, a); f < Math.min(N, stop); f++) {
      let o = 1;
      if (b.enter === "fresh") o = Math.min(o, clamp01((f - a + 1) / FADE_IN));
      if (b.after === "release") o = Math.min(o, clamp01((b.end - f) / EXIT));
      t.op[f] = Math.max(t.op[f], o);
    }
  });
  return t;
}

export const at = (arr: Float32Array, f: number) => arr[Math.max(0, Math.min(arr.length - 1, Math.round(f)))];
