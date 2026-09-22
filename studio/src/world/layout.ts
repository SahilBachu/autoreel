import { random } from "remotion";
import type { Scene } from "../auto/scenes";

// ─────────────────────────────────────────────────────────────────────────────
// WorldReel layout — the director's scene plan laid out as OBJECTS in one world.
// Everything here is in WORLD pixels. The camera (camera.ts) maps a focal point to
// the screen anchor (540, 0) — top-centre — so an object's box parks with its top
// edge at screen y = TOP. His face fills the middle of the real clips (hair from
// ~y480, eyes ~y930, mouth ~y1120, captions from ~y1290): objects hang from the
// top of the frame and overlap his hair / forehead, leaving eyes and mouth clear
// whenever the object is short enough; tall ones zoom out so they still stop
// above his eyes.
// ─────────────────────────────────────────────────────────────────────────────

export const BOX_W = 1080;
export const ANCHOR = { x: 540, y: 0 };
export const TOP = 84; // screen y an object's top edge parks at
export const EYES = 880; // screen y objects try to stay above (his eyes ~930)

// approximate content height per kind (the box the component is centred in). Content
// taller than this just spills past the box — the scrim under it bleeds 170px anyway.
export const OBJECT_H: Record<string, number> = {
  headline: 520, decrypt: 520, callout: 520, quote: 560,
  stat: 500, statrow: 440, linechart: 700, barchart: 700, donut: 700, table: 780,
  bento: 900, calendar: 820, timeline: 820, chat: 900, notifications: 820, checklist: 720, kbd: 420,
  tweet: 600, terminal: 720, code: 780, browser: 1090, screenshot: 1090, phone: 1110, logo: 520, logowall: 720, versus: 620, ascii: 900,
  command: 820, diff: 780, pricing: 900, leaderboard: 820, progress: 440, toggles: 720, dashboard: 720, search: 520,
  receipt: 820, waveform: 520, inbox: 820, poll: 760, ticker: 760, kanban: 860, prompt: 580, rating: 620,
  toolcard: 780, install: 660, runlog: 780, beforeafter: 740, catch: 720, getit: 620,
  custom: 1060,
};
const DEFAULT_H = 780;

export type WorldObject = {
  i: number;
  scene: Scene;
  from: number; // frames — the beat's window (= when the object exists and animates)
  to: number;
  cx: number; // world box centre
  cy: number;
  w: number;
  h: number;
  z: number; // hold zoom
  fx: number; // camera focal that parks the box at TOP
  fy: number;
};

// serpentine on two columns: right, down, left, down, right… — every travel is ONE
// axis-aligned move, so the eye always knows where it went. Small seeded offsets keep
// it from reading as a grid.
const X_PITCH = 1320;
const Y_PITCH = 1520;

export function layoutWorld(scenes: Scene[], fps: number): WorldObject[] {
  const f = (ms: number) => Math.round((ms / 1000) * fps);
  return scenes.map((scene, i) => {
    const col = [0, 1, 1, 0][i % 4];
    const row = Math.floor(i / 2);
    const jx = (random(`wx${i}`) - 0.5) * 90;
    const jy = (random(`wy${i}`) - 0.5) * 120;
    const h = OBJECT_H[scene.kind] ?? DEFAULT_H;
    const w = BOX_W;
    const cx = 540 + col * X_PITCH + jx;
    const cy = 800 + row * Y_PITCH + jy;
    // hold zoom: short objects sit close (a touch over 1), tall ones pull back so the
    // box bottom still lands above his eyes.
    const z = Math.max(0.74, Math.min(1.04, (EYES - TOP) / h));
    return {
      i,
      scene,
      from: f(scene.startMs),
      to: f(scene.endMs),
      cx,
      cy,
      w,
      h,
      z,
      fx: cx,
      fy: cy - h / 2 - (TOP - ANCHOR.y) / z,
    };
  });
}
