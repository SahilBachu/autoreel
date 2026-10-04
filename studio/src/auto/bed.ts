// MUSIC BED level over time. The bot sets the base level (props.musicVolume) so the bed sits
// a fixed distance under his normalised voice; this shapes it per frame:
//   - fades in over the first moments and out over the last second (no hard start/stop)
//   - while he talks it stays at the base level
//   - in a real pause (no word for GAP_MIN_MS) it lifts by GAP_LIFT_DB, then ducks back
//     just before he speaks again, so the gaps don't feel dead and the words stay clear
// Pure + deterministic: same words in → same curve out.

import type { Word } from "../types";

export const GAP_LIFT_DB = 4;
const GAP_MIN_MS = 700; // shorter silences are breaths, not pauses
const PRE_MS = 200; // duck back this long before the next word
const POST_MS = 250; // and hold the duck this long after a word ends
const RAMP_MS = 300; // how long a full lift/duck takes
const FADE_IN_MS = 400;
const FADE_OUT_MS = 1200;

export function bedCurve(words: Word[], fps: number, totalFrames: number): Float32Array {
  const n = Math.max(1, Math.ceil(totalFrames));
  const speaking = new Uint8Array(n);
  const F = (ms: number) => Math.round((ms / 1000) * fps);
  const ws = (words ?? []).filter((w) => Number.isFinite(w.startMs) && Number.isFinite(w.endMs)).sort((a, b) => a.startMs - b.startMs);
  // merge words into talk spans, bridging breath-length gaps
  const spans: [number, number][] = [];
  for (const w of ws) {
    const last = spans[spans.length - 1];
    if (last && w.startMs - last[1] < GAP_MIN_MS) last[1] = Math.max(last[1], w.endMs);
    else spans.push([w.startMs, w.endMs]);
  }
  for (const [a, b] of spans) for (let f = Math.max(0, F(a - PRE_MS)); f < Math.min(n, F(b + POST_MS)); f++) speaking[f] = 1;

  const lift = Math.pow(10, GAP_LIFT_DB / 20);
  const step = (lift - 1) / Math.max(1, F(RAMP_MS));
  // look ahead so the duck has finished by the time the next word starts
  const ahead = F(RAMP_MS);
  const out = new Float32Array(n);
  let g = 1;
  for (let f = 0; f < n; f++) {
    let target = lift;
    for (let k = f; k <= Math.min(n - 1, f + ahead); k++) if (speaking[k]) { target = 1; break; }
    g = target > g ? Math.min(target, g + step) : Math.max(target, g - step);
    const fadeIn = Math.min(1, f / Math.max(1, F(FADE_IN_MS)));
    const fadeOut = Math.min(1, (n - 1 - f) / Math.max(1, F(FADE_OUT_MS)));
    out[f] = g * fadeIn * Math.max(0, fadeOut);
  }
  return out;
}
