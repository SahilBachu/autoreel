import { random } from "remotion";
import type { Scene } from "../auto/scenes";

// ─────────────────────────────────────────────────────────────────────────────
// WorldReel layout — the director's scene plan laid out as OBJECTS in one world.
// Everything here is in WORLD pixels except ZONE (screen pixels).
//
// Where objects park (motion v3): the camera maps an object's box CENTRE to the screen
// anchor (540, ZONE.cy) — upper-middle, "top-centre-ish", the comfortable place to
// watch on a phone. Measured from his phone-down clips (1080×1920): hair top ~y300-380,
// eyes ~y720-750, nose ~y800, mouth ~y930-1020, chin ~y1060; the caption pill sits at
// ~y1265-1360. A parked object is centred at y660 and never taller (on screen) than the
// band y190→1150, so it overlaps his face — the "things come over me" look he asked for —
// while the caption pill keeps a clear ~115px margin under the pool's feather.
// ─────────────────────────────────────────────────────────────────────────────

export const BOX_W = 1080;
export const ZONE = { cy: 660, top: 190, bottom: 1150 };
export const ANCHOR = { x: 540, y: ZONE.cy };
const VIS_H = 2 * Math.min(ZONE.cy - ZONE.top, ZONE.bottom - ZONE.cy); // tallest on-screen box (940)
export const Z_MAX = 1.04; // widest content is ~1000px — past this it would touch the frame edges
export const Z_MIN = 0.72;

// natural content height per kind at ~1000px wide (the box the component is centred in).
// Content is centred in its box, so an estimate that's a bit off just spills evenly both
// ways. Kinds whose height depends on their content are refined in objectHeight().
export const OBJECT_H: Record<string, number> = {
  headline: 520, decrypt: 520, callout: 520, quote: 560,
  stat: 640, statrow: 440, linechart: 700, barchart: 700, donut: 700, table: 780,
  bento: 900, calendar: 820, timeline: 820, chat: 640, notifications: 520, checklist: 720, kbd: 420,
  tweet: 600, terminal: 520, code: 560, browser: 1090, screenshot: 1090, phone: 1110, logo: 520, logowall: 720, versus: 420, ascii: 900,
  command: 640, diff: 780, pricing: 900, leaderboard: 820, progress: 440, toggles: 460, dashboard: 720, search: 520,
  receipt: 820, waveform: 520, inbox: 820, poll: 760, ticker: 760, kanban: 860, prompt: 580, rating: 620,
  toolcard: 700, install: 660, runlog: 560, beforeafter: 460, catch: 560, getit: 620,
  // v3 kinds
  flow: 430, cursor: 560, highlight: 930, json: 620, stack: 660, kinetic: 370, split: 420, logoorbit: 860, repo: 510,
  custom: 1060, clawd: 740, painted: 740,
};
/** any kind not in the table (new components land here before they're measured) —
 *  a mid-size card: parks at full zoom (1.04) and spans y265→1055 on screen. */
export const DEFAULT_H = 760;

const lerpClamp = (v: number, v0: number, v1: number, h0: number, h1: number) => h0 + (h1 - h0) * Math.max(0, Math.min(1, (v - v0) / (v1 - v0)));
const len = (x: unknown) => (Array.isArray(x) ? x.length : 0);

/** content-dependent heights (the component agent's measurements) */
function refine(s: Scene): number | undefined {
  switch (s.kind) {
    case "flow": {
      // chain 430; branching (a node with 2+ in/out edges) or 5+ nodes 650
      const edges: unknown[] = Array.isArray(s.edges) ? s.edges : [];
      const seen = new Map<string, number>();
      for (const e of edges) if (Array.isArray(e)) for (const [k, v] of [["o", e[0]], ["i", e[1]]]) seen.set(`${k}:${String(v)}`, (seen.get(`${k}:${String(v)}`) ?? 0) + 1);
      const branching = [...seen.values()].some((c) => c > 1);
      return branching || len(s.nodes) >= 5 ? 650 : 430;
    }
    case "cursor":
      return lerpClamp(len(s.items), 3, 6, 560, 800);
    case "json": {
      let text = "";
      try {
        text = typeof s.data === "string" ? JSON.stringify(JSON.parse(s.data), null, 2) : JSON.stringify(s.data ?? {}, null, 2);
      } catch {
        text = String(s.data ?? "");
      }
      return lerpClamp(Math.min(16, text.split("\n").length), 8, 16, 620, 790);
    }
    case "kinetic":
      return lerpClamp(String(s.text ?? "").length, 14, 40, 320, 420);
    case "split": {
      const rows = Math.max(len(s.left?.lines ?? s.left?.items), len(s.right?.lines ?? s.right?.items));
      return rows > 3 ? 470 : 400;
    }
    case "repo":
      return len(s.spark) ? 740 : 510;
    case "toolcard":
      return len(s.specs) ? 1000 : 700;
    default:
      return undefined;
  }
}

/** box height for a scene: a numeric `worldH` on the scene wins, then the content-aware
 *  refinement, then the table, then DEFAULT_H. */
export const objectHeight = (s: Scene): number => {
  const o = typeof s.worldH === "number" && isFinite(s.worldH) ? s.worldH : undefined;
  return Math.max(320, Math.min(1400, o ?? refine(s) ?? OBJECT_H[s.kind] ?? DEFAULT_H));
};

export type WorldObject = {
  i: number;
  scene: Scene;
  from: number; // frames — the beat's planned window (the object mounts at `from`)
  to: number;
  cx: number; // world box centre = the camera focal that parks it at ANCHOR
  cy: number;
  w: number;
  h: number;
  z: number; // hold zoom
  fx: number;
  fy: number;
  // slow drift the camera makes over a long hold (world px; direction seeded per object)
  dx: number;
  dy: number;
};

// serpentine on two columns: right, down, left, down, right… — every travel is ONE
// axis-aligned move, so the eye always knows where it went. Objects are packed close
// (only the current object — plus the next one during a travel — is ever mounted, so a
// neighbour can't intrude on a hold): mid-travel both are on screen, the move reads as
// one continuous world instead of an empty whip. Small seeded offsets break the grid.
const X_PITCH = 1180;
const GAP_Y = 220;

export function layoutWorld(scenes: Scene[], fps: number): WorldObject[] {
  const f = (ms: number) => Math.round((ms / 1000) * fps);
  const out: WorldObject[] = [];
  scenes.forEach((scene, i) => {
    const col = [0, 1, 1, 0][i % 4];
    const prev = out[i - 1];
    const h = objectHeight(scene);
    const w = BOX_W;
    const jx = (random(`wx${i}`) - 0.5) * 60;
    const jy = (random(`wy${i}`) - 0.5) * 70;
    let cx = 540 + col * X_PITCH + jx;
    let cy = 800 + jy;
    if (prev) {
      const horizontal = col !== [0, 1, 1, 0][(i - 1) % 4];
      if (horizontal) cy = prev.cy + jy;
      else {
        cx = prev.cx + jx;
        cy = prev.cy + prev.h / 2 + h / 2 + GAP_Y;
      }
    }
    // hold zoom: short objects sit close, tall ones pull back to fit the band
    const z = Math.max(Z_MIN, Math.min(Z_MAX, VIS_H / h));
    const side = random(`wd${i}`) < 0.5 ? -1 : 1;
    out.push({
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
      fy: cy,
      dx: side * (8 + random(`wdx${i}`) * 10),
      dy: 10 + random(`wdy${i}`) * 14, // the camera glides down a touch → the card rises slowly
    });
  });
  return out;
}
