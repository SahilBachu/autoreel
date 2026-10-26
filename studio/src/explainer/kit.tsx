import React, { useMemo } from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import { F2 } from "../auto/theme";

// ─────────────────────────────────────────────────────────────────────────────
// EXPLAINER KIT — the shared vocabulary of the faceless "how it actually works" series.
// The look (after @speedy_devv, 17.5M views on "how does a touchscreen really work"): a dark
// charcoal studio, semi-real 3D objects, the invisible physics drawn in warm gold, honest
// "magnified illustration" notes, and captions at the TOP, 1-3 words at a time, with the key
// word in a Figma-style selection box. Every per-video scene file builds on these.
// ─────────────────────────────────────────────────────────────────────────────

export const X = {
  bg: "#0A0B0E",
  bg2: "#14161C",
  gold: "#F5B13D",
  goldHot: "#FFD27A",
  select: "#0D99FF", // Figma selection blue
  text: "#F4F5F7",
  dim: "rgba(244,245,247,0.42)",
  faint: "rgba(244,245,247,0.26)",
  xray: "#69B4FF",
  danger: "#FF5A4E",
};

export type Word = { text: string; startMs: number; endMs: number };
export type Line = { scene: string; text: string };

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const ease = Easing.bezier(0.16, 1, 0.3, 1);
export const easeInOut = Easing.bezier(0.65, 0, 0.35, 1);

/** 0→1 between frames a and b (eased). */
export const prog = (f: number, a: number, b: number, e: (t: number) => number = ease) => interpolate(f, [a, Math.max(a + 1, b)], [0, 1], { ...clamp, easing: e });

// ── timing: the script's lines -> when each starts and ends (from ElevenLabs word timings) ──
export type Timed = Line & { i: number; startMs: number; endMs: number; firstWord: number; words: number };
export function timeLines(lines: Line[], words: Word[]): Timed[] {
  let w = 0;
  return lines.map((l, i) => {
    const n = l.text.trim().split(/\s+/).length;
    const first = words[Math.min(w, words.length - 1)];
    const last = words[Math.min(w + n - 1, words.length - 1)];
    const t: Timed = { ...l, i, startMs: first?.startMs ?? 0, endMs: last?.endMs ?? 0, firstWord: w, words: n };
    w += n;
    return t;
  });
}

/** words with an `em` flag (the script marks emphasis as *word*) */
export function emphasise(lines: Line[], words: Word[]): (Word & { em: boolean })[] {
  const marks = lines.flatMap((l) => l.text.trim().split(/\s+/).map((tok) => tok.includes("*")));
  return words.map((w, i) => ({ ...w, text: w.text.replace(/\*/g, ""), em: !!marks[i] }));
}

// ── captions (top, speedy-style) ─────────────────────────────────────────────
type CW = Word & { em: boolean };
function chunk(words: CW[]): CW[][] {
  const out: CW[][] = [];
  let cur: CW[] = [];
  for (const w of words) {
    cur.push(w);
    const brk = /[.,!?;:]$/.test(w.text) || cur.length >= 3 || (cur.length >= 2 && w.em);
    if (brk) {
      out.push(cur);
      cur = [];
    }
  }
  if (cur.length) out.push(cur);
  return out;
}

const Handles: React.FC = () => {
  const h = (pos: React.CSSProperties) => (
    <div style={{ position: "absolute", width: 13, height: 13, background: "#fff", border: `2.5px solid ${X.select}`, borderRadius: 2, ...pos }} />
  );
  return (
    <>
      {h({ left: -8, top: -8 })}
      {h({ right: -8, top: -8 })}
      {h({ left: -8, bottom: -8 })}
      {h({ right: -8, bottom: -8 })}
    </>
  );
};

export const Captions: React.FC<{ words: CW[]; top?: number }> = ({ words, top = 250 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ms = (frame / fps) * 1000;
  const chunks = useMemo(() => chunk(words), [words]);
  const idx = chunks.findIndex((c, i) => ms >= c[0].startMs - 60 && (i === chunks.length - 1 || ms < chunks[i + 1][0].startMs - 60));
  if (idx < 0) return null;
  const c = chunks[idx];
  const age = ms - (c[0].startMs - 60);
  const pop = interpolate(age, [0, 140], [0.92, 1], { ...clamp, easing: ease });
  const op = interpolate(age, [0, 90], [0, 1], clamp);
  return (
    <AbsoluteFill style={{ alignItems: "center", pointerEvents: "none" }}>
      <div style={{ position: "absolute", top, left: 80, right: 80, display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "0 18px", opacity: op, scale: String(pop) }}>
        {c.map((w, i) => {
          const said = ms >= w.startMs - 30;
          const boxIn = interpolate(ms - w.startMs, [0, 160], [0, 1], { ...clamp, easing: ease });
          return (
            <span key={i} style={{ position: "relative", fontFamily: F2.sans, fontWeight: said ? 700 : 500, fontSize: 64, lineHeight: 1.18, letterSpacing: "-0.02em", color: said ? X.text : X.dim, textShadow: "0 4px 30px rgba(0,0,0,0.6)" }}>
              {w.em && said ? (
                <span style={{ position: "absolute", left: -12, right: -12, top: 2, bottom: 0, border: `3px solid ${X.select}`, background: "rgba(13,153,255,0.16)", opacity: boxIn, scale: String(0.9 + 0.1 * boxIn) }}>
                  <Handles />
                </span>
              ) : null}
              <span style={{ position: "relative" }}>{w.text}</span>
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ── HUD: honesty note, source line, counters ─────────────────────────────────
export const Note: React.FC<{ text: string; side?: "left" | "right"; bottom?: number; op?: number }> = ({ text, side = "left", bottom = 120, op = 1 }) => (
  <div style={{ position: "absolute", bottom, [side]: 64, fontFamily: F2.sans, fontWeight: 500, fontSize: 24, color: X.faint, opacity: op, letterSpacing: "0.01em", textAlign: side }}>{text}</div>
);

export const Counter: React.FC<{ label: string; value: number; total: number; op?: number }> = ({ label, value, total, op = 1 }) => (
  <div style={{ position: "absolute", top: 96, right: 64, opacity: op, display: "flex", alignItems: "center", gap: 16, fontFamily: F2.mono, fontSize: 30, letterSpacing: "0.08em", color: X.dim }}>
    <span>{label}</span>
    <div style={{ display: "flex", gap: 8 }}>
      {Array.from({ length: total }, (_, i) => (
        <div key={i} style={{ width: 42, height: 42, borderRadius: 9, border: `2.5px solid ${i < value ? X.gold : "rgba(255,255,255,0.25)"}`, background: i < value ? "rgba(245,177,61,0.22)" : "transparent", color: i < value ? X.goldHot : X.faint, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 700 }}>
          {i + 1}
        </div>
      ))}
    </div>
  </div>
);

/** a label with a leader line, in screen space: the dot sits at (x, y), the text at (tx, ty) */
export const Leader: React.FC<{ x: number; y: number; tx: number; ty: number; text: string; sub?: string; op: number; color?: string; align?: "left" | "right" }> = ({ x, y, tx, ty, text, sub, op, color = X.text, align = "left" }) => (
  <div style={{ position: "absolute", inset: 0, opacity: op, pointerEvents: "none" }}>
    <svg width="1080" height="1920" style={{ position: "absolute", inset: 0 }}>
      <line x1={x} y1={y} x2={tx} y2={ty} stroke={color} strokeWidth={2} strokeOpacity={0.75} strokeDasharray={`${op * 600} 600`} />
      <circle cx={x} cy={y} r={7} fill={color} />
    </svg>
    <div style={{ position: "absolute", top: ty - 22, [align === "left" ? "left" : "right"]: align === "left" ? tx + 14 : 1080 - tx + 14, fontFamily: F2.sans, color, textAlign: align }}>
      <div style={{ fontWeight: 700, fontSize: 34, letterSpacing: "0.04em", textTransform: "uppercase" }}>{text}</div>
      {sub ? <div style={{ fontWeight: 500, fontSize: 26, color: X.dim, marginTop: 4 }}>{sub}</div> : null}
    </div>
  </div>
);

// the studio backdrop behind the 3D (DOM, so it's free): charcoal, a soft key glow, vignette
export const Backdrop: React.FC<{ glow?: string; glowY?: number }> = ({ glow = "rgba(120,140,190,0.16)", glowY = 48 }) => (
  <AbsoluteFill style={{ background: `radial-gradient(ellipse 85% 55% at 50% ${glowY}%, ${glow}, transparent 70%), linear-gradient(180deg, ${X.bg2}, ${X.bg} 60%)` }}>
    <AbsoluteFill style={{ background: "radial-gradient(ellipse 120% 90% at 50% 50%, transparent 55%, rgba(0,0,0,0.65) 100%)" }} />
  </AbsoluteFill>
);

// ── 3D helpers ───────────────────────────────────────────────────────────────

/** camera keyframes -> position + rotation (rotation from lookAt), eased between keys */
export type CamKey = { f: number; pos: [number, number, number]; look: [number, number, number]; fov?: number };
export function camAt(keys: CamKey[], frame: number, drift = 0): { position: [number, number, number]; rotation: [number, number, number]; fov: number } {
  let a = keys[0], b = keys[keys.length - 1];
  for (let i = 0; i < keys.length - 1; i++) if (frame >= keys[i].f && frame <= keys[i + 1].f) { a = keys[i]; b = keys[i + 1]; break; }
  if (frame < keys[0].f) b = a;
  if (frame > keys[keys.length - 1].f) a = b;
  const t = a === b ? 0 : easeInOut(Math.min(1, Math.max(0, (frame - a.f) / (b.f - a.f))));
  const L = (p: number[], q: number[]) => p.map((v, i) => v + (q[i] - v) * t) as [number, number, number];
  const lp = L(a.pos, b.pos), look = L(a.look, b.look);
  // a slow handheld-ish drift (deterministic), scaled by distance to the subject
  const dist = Math.hypot(lp[0] - look[0], lp[1] - look[1], lp[2] - look[2]);
  const pos: [number, number, number] = [lp[0] + Math.sin(frame / 97) * drift * dist * 0.012, lp[1] + Math.sin(frame / 131 + 1.3) * drift * dist * 0.008, lp[2]];
  // a CAMERA, not a plain Object3D: lookAt points a camera's -Z at the target (an Object3D's +Z)
  const o = new THREE.PerspectiveCamera();
  o.position.set(...pos);
  o.lookAt(new THREE.Vector3(...look));
  return { position: pos, rotation: [o.rotation.x, o.rotation.y, o.rotation.z], fov: (a.fov ?? 35) + ((b.fov ?? 35) - (a.fov ?? 35)) * t };
}

/** a glow sprite: additive radial gradient (cheap "bloom" that also renders fast on the runner) */
let glowTex: THREE.Texture | null = null;
function glowTexture() {
  if (glowTex) return glowTex;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, "rgba(255,255,255,1)");
  r.addColorStop(0.25, "rgba(255,255,255,0.55)");
  r.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = r;
  g.fillRect(0, 0, 128, 128);
  glowTex = new THREE.CanvasTexture(c);
  return glowTex;
}
export const Glow: React.FC<{ position: [number, number, number]; size: number; color?: string; opacity?: number }> = ({ position, size, color = X.gold, opacity = 1 }) => (
  <sprite position={position} scale={[size, size, 1]}>
    <spriteMaterial map={glowTexture()} color={color} transparent opacity={opacity} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
  </sprite>
);

/**
 * A bendable ribbon (one layer of a folding screen). Its centreline runs flat for `leg`, then
 * curls through `angle` radians on a circle of `radius` (centre above it), then runs straight
 * again for whatever length is left of `length`. Equal-length layers at bigger radii therefore
 * end short of the inner ones: the outer layers "travel farther" and have to slide.
 */
export function ribbonGeometry(o: { length: number; leg: number; radius: number; angle: number; width: number; thick: number; segs?: number }): THREE.BufferGeometry {
  const segs = o.segs ?? 120;
  const arc = o.radius * o.angle;
  const at = (s: number): { p: [number, number]; n: [number, number] } => {
    if (s <= o.leg || o.angle === 0) return { p: [s - o.leg, 0], n: [0, 1] }; // flat ribbon: straight all the way
    if (s <= o.leg + arc) {
      const phi = (s - o.leg) / o.radius;
      return { p: [o.radius * Math.sin(phi), o.radius * (1 - Math.cos(phi))], n: [-Math.sin(phi), Math.cos(phi)] };
    }
    const A = o.angle, e: [number, number] = [o.radius * Math.sin(A), o.radius * (1 - Math.cos(A))];
    const d = s - o.leg - arc;
    return { p: [e[0] + d * Math.cos(A), e[1] + d * Math.sin(A)], n: [-Math.sin(A), Math.cos(A)] };
  };
  const pos: number[] = [];
  const idx: number[] = [];
  const hw = o.width / 2, ht = o.thick / 2;
  for (let i = 0; i <= segs; i++) {
    const { p, n } = at((i / segs) * o.length);
    // 4 corners: inner/outer × front/back
    for (const [r, z] of [[-ht, -hw], [ht, -hw], [ht, hw], [-ht, hw]] as const) pos.push(p[0] + n[0] * r, p[1] + n[1] * r, z);
  }
  for (let i = 0; i < segs; i++) {
    const a = i * 4, b = (i + 1) * 4;
    for (let k = 0; k < 4; k++) {
      const k2 = (k + 1) % 4;
      idx.push(a + k, b + k, b + k2, a + k, b + k2, a + k2);
    }
  }
  // end caps
  idx.push(0, 1, 2, 0, 2, 3);
  const e = segs * 4;
  idx.push(e, e + 2, e + 1, e, e + 3, e + 2);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** where a world point lands on screen for a camAt() camera (same maths the 3D camera uses) */
export function project(p: [number, number, number], cam: { position: [number, number, number]; rotation: [number, number, number]; fov: number }, w = 1080, h = 1920): { x: number; y: number } {
  const c = new THREE.PerspectiveCamera(cam.fov, w / h, 0.1, 200);
  c.position.set(...cam.position);
  c.rotation.set(...cam.rotation);
  c.updateMatrixWorld();
  c.updateProjectionMatrix();
  const v = new THREE.Vector3(...p).project(c);
  return { x: ((v.x + 1) / 2) * w, y: ((1 - v.y) / 2) * h };
}

/** deterministic pseudo-random in [0,1) */
export const rand = (i: number) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
