import { Easing, interpolate } from "remotion";
import type { WorldObject } from "./layout";

// ─────────────────────────────────────────────────────────────────────────────
// ONE shared camera, keyframed from the scene windows: hold → travel → hold.
//   • travel = 20 frames, centred on the beat boundary, so the new object springs
//     in while the camera is still settling on it ("it landed as I got there")
//   • a face gap between beats: the camera starts to leave in the last 6 frames of
//     the outgoing beat, parks off-line while he talks, and finishes the move in the
//     first 10 frames of the next beat — coming back from his face, the camera has
//     clearly moved on
//   • zoom dips ~10% mid-travel (pull out, push in) on its own key set
//   • repeated keys = holds; the last two keys are identical (stable end hold)
// Easing.inOut(cubic) on every segment; everything drives off the frame.
// ─────────────────────────────────────────────────────────────────────────────

export const TRAVEL = 20;
export const MERGE_GAP = 12; // gaps shorter than this are treated as contiguous

type PosKey = { f: number; x: number; y: number };
type ZoomKey = { f: number; z: number };
export type Camera = { pos: PosKey[]; zoom: ZoomKey[] };

// strictly increasing frames (later key wins on a tie)
const tidy = <K extends { f: number }>(keys: K[]): K[] => {
  const out: K[] = [];
  for (const k of keys) {
    const last = out[out.length - 1];
    if (last && k.f <= last.f) {
      if (k.f === last.f) out[out.length - 1] = k;
      else out.push({ ...k, f: last.f + 1 });
    } else out.push(k);
  }
  return out;
};

export function buildCamera(objs: WorldObject[], totalFrames: number): Camera {
  const pos: PosKey[] = [];
  const zoom: ZoomKey[] = [];
  if (!objs.length) return { pos: [{ f: 0, x: 540, y: 0 }], zoom: [{ f: 0, z: 1 }] };
  const H = TRAVEL / 2;

  objs.forEach((o, i) => {
    if (i === 0) {
      // push in from slightly below and wider as the world first fades in
      pos.push({ f: o.from - 12, x: o.fx, y: o.fy + 70 }, { f: o.from + 8, x: o.fx, y: o.fy });
      zoom.push({ f: o.from - 12, z: o.z * 0.86 }, { f: o.from + 8, z: o.z });
      return;
    }
    const p = objs[i - 1];
    const dip = Math.min(p.z, o.z) * 0.9;
    if (o.from - p.to < MERGE_GAP) {
      // contiguous beats: one clean move across the cut
      pos.push({ f: o.from - H, x: p.fx, y: p.fy }, { f: o.from + H, x: o.fx, y: o.fy });
      zoom.push({ f: o.from - H, z: p.z }, { f: o.from, z: dip }, { f: o.from + H, z: o.z });
    } else {
      // face gap: begin leaving (visible 6 frames), park, finish arriving (visible 10)
      const k = 0.14;
      const mx = p.fx + (o.fx - p.fx) * k;
      const my = p.fy + (o.fy - p.fy) * k;
      pos.push(
        { f: p.to - 6, x: p.fx, y: p.fy },
        { f: p.to, x: mx, y: my },
        { f: o.from - H, x: mx, y: my },
        { f: o.from + H, x: o.fx, y: o.fy },
      );
      zoom.push({ f: p.to - 6, z: p.z }, { f: p.to, z: p.z * 0.97 }, { f: o.from - H, z: p.z * 0.97 }, { f: o.from, z: dip }, { f: o.from + H, z: o.z });
    }
  });
  const last = objs[objs.length - 1];
  pos.push({ f: totalFrames - 1, x: last.fx, y: last.fy });
  zoom.push({ f: totalFrames - 1, z: last.z });
  return { pos: tidy(pos), zoom: tidy(zoom) };
}

const opts = { easing: Easing.inOut(Easing.cubic), extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

export function camAt(cam: Camera, frame: number) {
  const pf = cam.pos.map((k) => k.f);
  const zf = cam.zoom.map((k) => k.f);
  return {
    x: pf.length > 1 ? interpolate(frame, pf, cam.pos.map((k) => k.x), opts) : cam.pos[0].x,
    y: pf.length > 1 ? interpolate(frame, pf, cam.pos.map((k) => k.y), opts) : cam.pos[0].y,
    z: zf.length > 1 ? interpolate(frame, zf, cam.zoom.map((k) => k.z), opts) : cam.zoom[0].z,
  };
}

/** per object: the frames its arrival travel spans (for the trail that leads the camera) */
export function arrival(objs: WorldObject[], i: number): [number, number] {
  return [objs[i].from - TRAVEL / 2, objs[i].from + TRAVEL / 2];
}

// ── world visibility: the beat windows, merged across tiny gaps; the last one is held
// to the very end (stable end hold, no face flash on the final cut)
export function worldWindows(objs: WorldObject[], totalFrames: number): [number, number][] {
  const w: [number, number][] = [];
  for (const o of objs) {
    const last = w[w.length - 1];
    if (last && o.from - last[1] < MERGE_GAP) last[1] = Math.max(last[1], o.to);
    else w.push([o.from, o.to]);
  }
  if (w.length) w[w.length - 1][1] = totalFrames + 1;
  return w;
}

export const FADE = 4;
export function worldOpacity(windows: [number, number][], frame: number) {
  for (const [a, b] of windows) {
    if (frame < a || frame >= b) continue;
    if (frame < a + FADE) return (frame - a + 1) / (FADE + 1);
    if (frame >= b - FADE) return (b - frame) / (FADE + 1);
    return 1;
  }
  return 0;
}
