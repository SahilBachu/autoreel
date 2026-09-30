import type { Word } from "../types";
import { LEAD, TAIL, type Beat } from "./camera";
import type { WorldObject } from "./layout";

// ─────────────────────────────────────────────────────────────────────────────
// The talking-head layer (motion v3). He records phone-down now — static framing — so the
// footage gets its life here:
//   • PUNCH-INS: eased zooms (10 frames, fast-out) between a wide (1.00-1.02) and a tight
//     (1.06-1.08) framing, on the beats a human editor would cut on: when the hook leaves,
//     when the world releases to his face, and at sentence starts while his face has the
//     frame (≥2.4s apart). Under a held object it relaxes toward a neutral 1.03 (~2s) so
//     the next release has room to punch.
//   • CREEP: +0.3%/s slow push while his face has the frame (≤2.5%) — a long face beat
//     never freezes.
//   • PARALLAX: while the camera travels, the face (the far plane) slides a little the same
//     way the world's content moves and swells ~3%, then eases home — the world reads as
//     floating above him.
// Scale is anchored on his face (FACE) and never drops below 1, so the frame edges never show.
// ─────────────────────────────────────────────────────────────────────────────

/** his face in the phone-down clips (nose; 1080×1920) — the zoom anchor */
export const FACE = { x: 620, y: 800 };

const PUNCH = 10;
const MIN_GAP_S = 2.4;
const CREEP_PER_S = 0.003;
const CREEP_MAX = 0.025;
const TIGHT = [1.065, 1.08];
const WIDE = [1.0, 1.02];
const NEUTRAL = 1.03; // where the framing drifts while an object holds over him

export type FaceTrack = { s: Float32Array; ox: Float32Array; oy: Float32Array };

const punchEase = (u: number) => 1 - Math.pow(1 - u, 3);
const smooth = (u: number) => u * u * (3 - 2 * u);

/** frames where a new sentence starts (after . ! ? or a ≥350ms pause) */
export function sentenceStarts(words: Word[], fps: number): number[] {
  const out: number[] = [];
  for (let i = 1; i < words.length; i++) {
    const p = words[i - 1];
    if (/[.!?]["')\]]?$/.test(p.text) || words[i].startMs - p.endMs >= 350) out.push(Math.round((words[i].startMs / 1000) * fps));
  }
  return out;
}

export function buildFaceTrack(opts: {
  words: Word[];
  fps: number;
  total: number;
  worldOp: Float32Array;
  introEnd: number; // frame the hook leaves (0 = none)
  objs: WorldObject[];
  beats: Beat[];
}): FaceTrack {
  const { words, fps, total, worldOp, introEnd, objs, beats } = opts;
  const N = total + 2;
  const s = new Float32Array(N).fill(1);
  const ox = new Float32Array(N);
  const oy = new Float32Array(N);
  const faceFree = (f: number) => (worldOp[Math.min(N - 1, Math.max(0, f))] ?? 0) < 0.35;

  // ── punch points
  const cand: number[] = [];
  if (introEnd > 0) cand.push(introEnd - 4);
  beats.forEach((b) => { if (b.after === "release") cand.push(b.depart + 2); });
  for (const f of sentenceStarts(words, fps)) if (f > introEnd + 6 && faceFree(f) && faceFree(f + 30)) cand.push(f - 2);
  cand.sort((a, b) => a - b);
  const gap = Math.round(MIN_GAP_S * fps);
  const punches: number[] = [];
  for (const f of cand) if (f > 0 && f < total - 20 && (!punches.length || f - punches[punches.length - 1] >= gap)) punches.push(f);

  // ── base framing: the hook's slow push, then punches; between punches it creeps in while
  // his face has the frame, and relaxes toward NEUTRAL while an object holds over him
  let level = 1;
  let from = 1;
  let start = -1;
  let creep = 0;
  let tight = 0;
  let wide = 0;
  let pi = 0;
  const relax = 1 / (2 * fps); // ~2s time constant
  for (let f = 0; f < N; f++) {
    if (pi < punches.length && f === punches[pi]) {
      from = f > 0 ? s[f - 1] : 1;
      level = from < 1.04 ? TIGHT[tight++ % TIGHT.length] : WIDE[wide++ % WIDE.length];
      start = f;
      creep = 0;
      pi++;
    }
    if (start < 0 && f < introEnd) {
      s[f] = 1 + 0.035 * smooth(f / Math.max(1, introEnd)); // the hook: a slow push on him
      level = s[f];
      continue;
    }
    const u = start >= 0 ? Math.min(1, (f - start) / PUNCH) : 1;
    if (u < 1) {
      s[f] = from + (level - from) * punchEase(u);
      continue;
    }
    if (faceFree(f)) creep = Math.min(CREEP_MAX, creep + CREEP_PER_S / fps);
    else {
      level += (NEUTRAL - level) * relax;
      creep -= creep * relax;
    }
    s[f] = Math.min(1.1, level + creep);
  }

  // ── parallax during camera travels: swell + slide with the world, ease home
  beats.forEach((b, i) => {
    if (b.enter !== "travel") return;
    const p = objs[i - 1];
    const o = objs[i];
    const dx = o.fx - p.fx;
    const dy = o.fy - p.fy;
    const L = Math.hypot(dx, dy) || 1;
    // camera moves +d → content moves −d on screen; the far plane follows a little
    const ux = -dx / L;
    const uy = -dy / L;
    const a = b.from - LEAD;
    const peak = b.from + TAIL;
    const home = peak + 40;
    for (let f = Math.max(0, a); f < Math.min(N, home); f++) {
      const g = f < peak ? smooth((f - a) / (peak - a)) : 1 - smooth((f - peak) / (home - peak));
      s[f] += 0.03 * g;
      ox[f] += ux * 22 * g;
      oy[f] += uy * 22 * g;
    }
  });

  // never let a slide expose a frame edge: |offset| ≤ the margin the scale creates
  for (let f = 0; f < N; f++) {
    s[f] = Math.max(1, Math.min(1.1, s[f]));
    const m = s[f] - 1;
    ox[f] = Math.max(-m * (1080 - FACE.x), Math.min(m * FACE.x, ox[f]));
    oy[f] = Math.max(-m * (1920 - FACE.y), Math.min(m * FACE.y, oy[f]));
  }
  return { s, ox, oy };
}
