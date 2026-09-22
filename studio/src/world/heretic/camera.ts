import { Easing, interpolate } from "remotion";

// ─────────────────────────────────────────────────────────────────────────────
// HereticWorld (reference experiment) — ONE world (2800×2700, ~2.6× the viewport
// width), one camera. Everything below is in WORLD pixels. The camera maps the
// focal point (fx, fy) to screen (540, 660) — deliberately above centre so the
// focal action sits clear of the caption band (screen y ≥ ~1250).
// The generalised, scene-driven camera lives in ../camera.ts.
// ─────────────────────────────────────────────────────────────────────────────

export const WORLD = { w: 2800, h: 2700 };
export const ANCHOR = { x: 540, y: 660 };

// flat charcoal palette — no glow, no haze, no gradients
export const C = {
  bg: "#151517",
  panel: "#1D1D20",
  panel2: "#232327",
  line: "rgba(255,255,255,0.10)",
  line2: "rgba(255,255,255,0.20)",
  text: "#F2F2F3",
  dim: "rgba(242,242,243,0.62)",
  faint: "rgba(242,242,243,0.32)",
};

// ── layout (world px) ────────────────────────────────────────────────────────
export const L = {
  wordmark: { x: 200, y: 150 },
  meta: { x: 204, y: 400 },
  term: { x: 200, y: 640, w: 1300, h: 460, bar: 52, pad: 28, lh: 50, fs: 32 },
  block: { x: 1600, y: 200, w: 1000, h: 920 },
  page: { x: 1600, y: 1500, w: 1000, h: 800 }, // screenshot 2560×3200 scaled to 1000 wide, top 800 world px shown
  counter: { x: 200, y: 1230 },
  wall: { x: 200, y: 1500, cols: 100, rows: 50, cell: 10, gap: 3 },
  url: { x: 200, y: 2320, w: 2400 },
};

// ── cutaway windows (ms) — identical to the production render so his face
// breathes in the same places. Contiguous windows are merged (hard cut inside).
export const WINDOWS_MS: [number, number][] = [
  [0, 3760],
  [6440, 12080], // identity → install/run
  // mechanism. Extended ~1.4s past the production window: the cut has to land on the word
  // "cuts" (~f593), and the removed state is the payoff of the whole video — at the old
  // 20.08s end it was on screen for six frames before cutting back to his face.
  [16860, 21500],
  [22880, 30940], // page → wall → settle (held to the end)
];

// ── camera keyframes (frame → fx, fy, zoom). Repeated adjacent keys = holds.
// Moves are 18–24 frames. Camera keeps travelling during the face gaps.
//   f0-108   hold  tight on the prompt line while the command types
//   108-130  pull out a little (face gap) — parked wider at f130
//   196-218  continue the pull-out as the wordmark is revealed ("it's called Heretic")
//   290-308  push into the terminal body as Enter fires (install output)
//   380-404  travel right along the connector to the model block (face gap)
//   620-642  drop down to the GitHub page (face gap)
//   717-735  pan across the page to the About column (stars, description)
//   777-797  travel left/down to the wall of models (hard cut → visible move)
//   866-890  pull out to the whole world; hold to the end (two identical keys)
export const KEY_T = [0, 108, 130, 196, 218, 290, 308, 380, 404, 620, 642, 717, 735, 777, 797, 866, 890, 947];
const FX = [490, 490, 700, 700, 850, 850, 700, 700, 2100, 2100, 1986, 1986, 2214, 2214, 850, 850, 1400, 1400];
const FY = [821, 821, 1000, 1000, 872, 872, 1053, 1053, 700, 700, 1886, 1886, 1886, 1886, 1859, 1859, 1445, 1445];
const FZ = [2.1, 2.1, 1.3, 1.3, 0.72, 0.72, 1.15, 1.15, 1.0, 1.0, 1.4, 1.4, 1.4, 1.4, 0.78, 0.78, 0.43, 0.43];

const ease = Easing.inOut(Easing.cubic);
const opts = { easing: ease, extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

export function camera(frame: number) {
  return {
    fx: interpolate(frame, KEY_T, FX, opts),
    fy: interpolate(frame, KEY_T, FY, opts),
    z: interpolate(frame, KEY_T, FZ, opts),
  };
}

// ── beat frames (30 fps) — absolute world time; components read these directly
export const B = {
  typeCmd1: 6, // "$ pip install heretic-llm" starts typing
  enter1: 297, // Enter → pip output
  typeCmd2: 303, // "$ heretic <model>" starts typing (keyboard sfx at f300)
  enter2: 334, // Enter → runs; connector draws toward the model
  scanStart: 507, // window opens: scan sweeps the model
  scanEnd: 545,
  lineStart: 547, // refusal direction draws through the aligned dots
  lineEnd: 561,
  label: 558,
  cut: 585, // "cuts" — perpendicular stroke (window fades out at f599, so all of this lands before)
  removeStart: 590, // halves slide apart, aligned dots become holes
  removeEnd: 598,
  pageIn: 615, // the GitHub page exists once the camera heads for it (world is off-screen then)
  countStart: 777, // wall fills + counter counts
  countEnd: 819,
  urlStart: 868, // URL types in as the camera pulls out
};
