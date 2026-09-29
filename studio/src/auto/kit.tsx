import React, { createContext, useContext } from "react";
import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { F2, T, useAccent } from "./theme";
import { getLogo } from "./logos";
import { useSceneMode } from "./fx";

// ─────────────────────────────────────────────────────────────────────────────
// KIT — the building blocks every scene is made of (the v2/v3 library AND the
// code-generated `custom` components). Small, obvious APIs; all FRAME-DETERMINISTIC
// (useCurrentFrame + springs; never wall-clock / Math.random / CSS animation).
// Colours come from useAccent() + T only. Documented in COMPONENTS.md "## kit".
//
//   timing   useT · useBeat · schedule · ramp · clamp01
//   motion   rise · pop · slide · focusIn · wave · breathe · <Float> · <PushIn>
//   surfaces <Surface> · <ObjectCard> · <Window> · <Beam> · <Sheen> · <Chip> · <Label> · <Kicker>
//   text     typed · <TypeText> · <Caret> · <Counter> · <Roll> · <RevealText> · parseNum
//   graph    bezier · cubic · <Edge> (draw-in + flowing packets)
//   pointer  <Cursor> · cursorAt · <Ripple>
//   emphasis <HighlightBox> · <Marker> · <Underline>
//   brand    <LogoTile> · <LogoChip> · <LogoDraw>
//   lists    <TickList> · <Check> · <Spinner> · <LiveDot>
// ─────────────────────────────────────────────────────────────────────────────

type CSS = React.CSSProperties;
type Kids = { children?: React.ReactNode };

// ── timing ───────────────────────────────────────────────────────────────────

/** frames the current beat is on screen (plan startMs→endMs). Provided by scenes.tsx. */
export const SceneDurCtx = createContext(0);
/** how long this scene holds, in frames (120 when unknown). Pace choreography to it. */
export const useBeat = () => {
  const d = useContext(SceneDurCtx);
  return d > 0 ? d : 120;
};

export const SPRING = {
  soft: { damping: 22, stiffness: 120, mass: 0.9 }, // panels, big moves
  snappy: { damping: 19, stiffness: 190, mass: 0.7 }, // rows, chips, text
  bouncy: { damping: 11, stiffness: 220, mass: 0.7 }, // pops, ticks, badges (overshoots)
  slow: { damping: 30, stiffness: 55, mass: 1.2 }, // long settles, drifts
};
export type SpringKind = keyof typeof SPRING;

/**
 * The one hook most components need.
 *   const { f, fps, beat, sp } = useT();
 *   const e = sp(4);              // soft spring that starts at frame 4 → 0..1 (may overshoot)
 *   const chip = sp(20, "bouncy");
 */
export const useT = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const beat = useBeat();
  const sp = (delay = 0, kind: SpringKind = "soft") => (isFinite(delay) ? spring({ frame: f - delay, fps, config: SPRING[kind] }) : 0);
  return { f, fps, beat, sp };
};

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** eased 0→1 (or from→to) between frames a..b, clamped both ends */
export const ramp = (f: number, a: number, b: number, from = 0, to = 1, ease: (t: number) => number = Easing.inOut(Easing.cubic)) =>
  interpolate(f, [a, Math.max(a + 1, b)], [from, to], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });

/**
 * n start frames spread across the beat — first at `start`, the last near `fill` × beat.
 * The step is clamped to [min, max], so a 2.5s beat stays snappy and an 8s beat doesn't crawl.
 */
export const schedule = (n: number, beat: number, o: { start?: number; fill?: number; min?: number; max?: number } = {}) => {
  const { start = 8, fill = 0.5, min = 5, max = 30 } = o;
  if (n <= 1) return [start];
  const step = Math.max(min, Math.min(max, (beat * fill - start) / (n - 1)));
  return Array.from({ length: n }, (_, i) => Math.round(start + i * step));
};

// ── motion styles (spread into style={{...}}) ────────────────────────────────

/** fade + lift + tiny scale. p = a spring value. */
export const rise = (p: number, dist = 28, s0 = 0.97): CSS => ({
  opacity: clamp01(p * 1.3),
  transform: `translateY(${(1 - p) * dist}px) scale(${s0 + (1 - s0) * p})`,
});
/** scale pop from s0 */
export const pop = (p: number, s0 = 0.6): CSS => ({ opacity: clamp01(p * 1.6), transform: `scale(${s0 + (1 - s0) * p})` });
/** horizontal slide in from dx */
export const slide = (p: number, dx = -28): CSS => ({ opacity: clamp01(p * 1.3), transform: `translateX(${(1 - p) * dx}px)` });
/** blur → sharp (the "focus pull" entrance for text) */
export const focusIn = (p: number, blur = 12, dist = 14): CSS => ({
  opacity: clamp01(p * 1.25),
  filter: `blur(${Math.max(0, 1 - p) * blur}px)`,
  transform: `translateY(${(1 - p) * dist}px)`,
});

/** -1..1 sine with a period in frames */
export const wave = (f: number, period = 90, phase = 0) => Math.sin((f / period) * Math.PI * 2 + phase);
/** 0..1 slow breathing (glows, pulses) */
export const breathe = (f: number, period = 110, phase = 0) => 0.5 + 0.5 * wave(f, period, phase);

/**
 * Hold-life: a settled object hovers (±amp px) with a hair of 3D tilt so a 6s hold never
 * looks frozen. Eases in from `from` so it doesn't fight the entrance.
 */
export const Float: React.FC<Kids & { amp?: number; period?: number; seed?: number; tilt?: number; from?: number; style?: CSS }> = ({ children, amp = 5, period = 170, seed = 0, tilt = 0.5, from = 16, style }) => {
  const f = useCurrentFrame();
  const k = ramp(f, from, from + 40);
  const y = wave(f, period, seed) * amp * k;
  const x = wave(f, period * 1.37, seed + 1.3) * amp * 0.45 * k;
  const rx = wave(f, period * 1.21, seed + 0.7) * tilt * k;
  const ry = wave(f, period * 1.59, seed + 2.1) * tilt * k;
  return <div style={{ transform: `perspective(1800px) translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) rotateX(${rx.toFixed(3)}deg) rotateY(${ry.toFixed(3)}deg)`, ...style }}>{children}</div>;
};

/** slow Ken-Burns push-in across the beat (1 → 1+amount), for screenshots / hero moments */
export const PushIn: React.FC<Kids & { amount?: number; from?: number; origin?: string; style?: CSS }> = ({ children, amount = 0.04, from = 10, origin = "50% 40%", style }) => {
  const f = useCurrentFrame();
  const beat = useBeat();
  const s = 1 + amount * ramp(f, from, Math.max(from + 60, beat + 60), 0, 1, Easing.out(Easing.quad));
  return <div style={{ transform: `scale(${s})`, transformOrigin: origin, ...style }}>{children}</div>;
};

// ── surfaces ─────────────────────────────────────────────────────────────────

/**
 * A light travelling around the parent's rounded border (Vercel/Linear "border beam").
 * Parent must be position:relative. One per scene, on the hero surface.
 */
export const Beam: React.FC<{ radius?: number; period?: number; delay?: number; width?: number; strength?: number }> = ({ radius = 28, period = 150, delay = 20, width = 1.6, strength = 1 }) => {
  const a = useAccent();
  const f = useCurrentFrame();
  if (f < delay) return null;
  const ang = (((f - delay) / period) * 360) % 360;
  const on = ramp(f, delay, delay + 24) * strength;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        borderRadius: radius,
        padding: width,
        background: `conic-gradient(from ${ang}deg at 50% 50%, transparent 0deg, transparent 250deg, ${a.dim} 310deg, ${a.hex} 345deg, transparent 360deg)`,
        WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
        WebkitMaskComposite: "xor",
        maskComposite: "exclude",
        opacity: on,
        pointerEvents: "none",
      }}
    />
  );
};

/** a soft diagonal light band that crosses the parent every `every` frames (parent: relative + overflow hidden) */
export const Sheen: React.FC<{ every?: number; delay?: number; opacity?: number; angle?: number }> = ({ every = 110, delay = 24, opacity = 0.07, angle = 115 }) => {
  const f = useCurrentFrame();
  if (f < delay) return null;
  const t = (((f - delay) % every) + every) % every;
  const pos = interpolate(t, [0, every * 0.42], [-30, 130], { extrapolateRight: "clamp", easing: Easing.inOut(Easing.quad) });
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        background: `linear-gradient(${angle}deg, transparent ${pos - 18}%, rgba(255,255,255,${opacity}) ${pos}%, transparent ${pos + 18}%)`,
      }}
    />
  );
};

/**
 * The glass card. tone "glass" (translucent, frosted) or "solid" (terminal/editor black).
 * glow = accent halo (tight in object mode). beam / sheen = hold-life (use on ONE hero surface).
 */
export const Surface: React.FC<Kids & { style?: CSS; radius?: number; glow?: boolean; beam?: boolean; sheen?: boolean; tone?: "glass" | "solid"; hot?: boolean }> = ({
  children,
  style,
  radius = 28,
  glow,
  beam,
  sheen,
  tone = "glass",
  hot,
}) => {
  const a = useAccent();
  const obj = useSceneMode() === "object";
  const halo = glow ? (obj ? `0 0 64px -30px ${a.glow}` : `0 0 110px -26px ${a.glow}`) : null;
  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: radius,
        // over his face (object mode) the glass is DARK frosted glass so dim text keeps its contrast
        background:
          tone === "solid"
            ? "linear-gradient(180deg, #111116, #0B0B0F)"
            : obj
              ? "linear-gradient(180deg, rgba(30,30,37,0.80), rgba(14,14,18,0.76))"
              : "linear-gradient(180deg, rgba(255,255,255,0.075), rgba(255,255,255,0.032))",
        border: `1px solid ${hot ? a.dim : T.border}`,
        boxShadow: [halo, "inset 0 1px 0 rgba(255,255,255,0.09)", "0 40px 90px -40px rgba(0,0,0,0.85)"].filter(Boolean).join(", "),
        backdropFilter: tone === "glass" ? "blur(18px)" : undefined,
        ...style,
      }}
    >
      {children}
      {sheen ? <Sheen /> : null}
      {beam ? <Beam radius={radius} /> : null}
    </div>
  );
};

/**
 * Open layouts (a chart, a big number, a list) sit on a glass card when they're a world
 * object over his face; in cover mode (own dark background) they stay bare.
 */
export const ObjectCard: React.FC<Kids & { style?: CSS; pad?: string; glow?: boolean }> = ({ children, style, pad = "44px 48px", glow }) => {
  const obj = useSceneMode() === "object";
  if (!obj) return <>{children}</>;
  return (
    <Surface glow={glow} radius={34} style={{ padding: pad, ...style }}>
      {children}
    </Surface>
  );
};

/** traffic lights (muted so they never compete with the accent) */
export const Lights: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <div style={{ display: "flex", gap: size * 0.7 }}>
    {["#FF5F57", "#FEBC2E", "#28C840"].map((c) => (
      <div key={c} style={{ width: size, height: size, borderRadius: size, background: c, opacity: 0.82 }} />
    ))}
  </div>
);

/** window chrome: lights + title + optional right slot, solid body. For terminals, editors, apps. */
export const Window: React.FC<Kids & { title?: React.ReactNode; right?: React.ReactNode; style?: CSS; bodyStyle?: CSS; glow?: boolean; beam?: boolean; sheen?: boolean }> = ({
  children,
  title,
  right,
  style,
  bodyStyle,
  glow,
  beam,
  sheen,
}) => (
  <Surface tone="solid" radius={26} glow={glow} beam={beam} sheen={sheen} style={{ border: `1px solid ${T.borderBright}`, ...style }}>
    <div style={{ height: 62, display: "flex", alignItems: "center", gap: 18, padding: "0 24px", background: "rgba(255,255,255,0.035)", borderBottom: `1px solid ${T.border}` }}>
      <Lights />
      <div style={{ flex: 1, minWidth: 0, fontFamily: F2.mono, fontSize: 23, color: T.dim, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</div>
      {right}
    </div>
    <div style={bodyStyle}>{children}</div>
  </Surface>
);

/** pill chip. hero = accent. */
export const Chip: React.FC<Kids & { hero?: boolean; style?: CSS; mono?: boolean }> = ({ children, hero, style, mono = true }) => {
  const a = useAccent();
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        fontFamily: mono ? F2.mono : F2.sans,
        fontWeight: 600,
        fontSize: 23,
        letterSpacing: mono ? "0.04em" : "-0.01em",
        padding: "10px 20px",
        borderRadius: 999,
        whiteSpace: "nowrap",
        background: hero ? a.soft : "rgba(255,255,255,0.05)",
        border: `1px solid ${hero ? a.dim : T.borderBright}`,
        color: hero ? a.hex : T.dim,
        boxShadow: hero ? `0 0 30px -10px ${a.glow}` : "none",
        ...style,
      }}
    >
      {children}
    </span>
  );
};

/**
 * Section kicker (mono, uppercase, accent) — same API as fx's Kicker but legible when it
 * floats over his face: a dark shadow under the accent glow.
 */
export const Kicker: React.FC<{ text: string; style?: CSS }> = ({ text, style }) => {
  const a = useAccent();
  return (
    <div style={{ fontFamily: F2.mono, fontWeight: 500, fontSize: 27, letterSpacing: "0.24em", textTransform: "uppercase", color: a.hex, textShadow: `0 2px 14px rgba(0,0,0,0.95), 0 0 26px ${a.glow}`, marginBottom: 30, textAlign: "center", ...style }}>
      {text}
    </div>
  );
};

/** tiny mono uppercase label (kickers, column heads). accent = coloured. */
export const Label: React.FC<Kids & { accent?: boolean; style?: CSS }> = ({ children, accent, style }) => {
  const a = useAccent();
  return (
    <div style={{ fontFamily: F2.mono, fontSize: 22, letterSpacing: "0.22em", textTransform: "uppercase", color: accent ? a.hex : T.faint, textShadow: accent ? `0 0 20px ${a.glow}` : "none", ...style }}>
      {children}
    </div>
  );
};

// ── text ─────────────────────────────────────────────────────────────────────

/** how much of `text` is typed at frame f */
export const typed = (text: string, f: number, start: number, cps: number, fps: number) => {
  const n = Math.max(0, Math.min(text.length, Math.floor(((f - start) / fps) * cps)));
  return { shown: text.slice(0, n), done: n >= text.length, doneAt: start + Math.ceil((text.length / cps) * fps) };
};

/** blinking caret — solid while `solid` (i.e. while typing), blinks otherwise */
export const Caret: React.FC<{ block?: boolean; solid?: boolean; color?: string }> = ({ block, solid, color }) => {
  const a = useAccent();
  const f = useCurrentFrame();
  const on = solid || Math.floor(f / 15) % 2 === 0;
  return <span style={{ color: color ?? a.hex, opacity: on ? 1 : 0, marginLeft: 2 }}>{block ? "▋" : "▍"}</span>;
};

/** text that types itself. caret: "typing" (only while typing) | "always" | "none" */
export const TypeText: React.FC<{ text: string; start?: number; cps?: number; caret?: "typing" | "always" | "none"; style?: CSS }> = ({ text, start = 0, cps = 34, caret = "typing", style }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = typed(text, f, start, cps, fps);
  const showCaret = caret === "always" ? f >= start - 6 : caret === "typing" ? f >= start && !t.done : false;
  return (
    <span style={style}>
      {t.shown}
      {showCaret ? <Caret solid={!t.done} /> : null}
    </span>
  );
};

/** split "$3,000+" → {pre:"$", num:3000, dec:0, commas:true, post:"+"}; null when there's no number */
export const parseNum = (value: string) => {
  const m = String(value).match(/^([^\d]*?)(\d[\d,]*\.?\d*)(.*)$/);
  if (!m) return null;
  const raw = m[2];
  const num = parseFloat(raw.replace(/,/g, ""));
  if (!isFinite(num)) return null;
  return { pre: m[1], num, dec: (raw.split(".")[1] || "").length, commas: raw.indexOf(",") >= 0, post: m[3] };
};
const withCommas = (s: string) => {
  const [i, d] = s.split(".");
  return i.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + (d !== undefined ? "." + d : "");
};
/** the value string at count-up progress t (0..1) — keeps prefix/suffix/decimals/commas */
export const countTo = (value: string, t: number) => {
  const p = parseNum(value);
  if (!p) return value;
  const s = (p.num * t).toFixed(p.dec);
  return p.pre + (p.commas ? withCommas(s) : s) + p.post;
};

/** a number that counts up to `value` (a props string) — tabular figures, ease-out */
export const Counter: React.FC<{ value: string; start?: number; dur?: number; style?: CSS }> = ({ value, start = 4, dur = 34, style }) => {
  const f = useCurrentFrame();
  const t = ramp(f, start, start + dur, 0, 1, Easing.out(Easing.cubic));
  return <span style={{ fontVariantNumeric: "tabular-nums", ...style }}>{countTo(value, t)}</span>;
};

/**
 * Odometer: each digit of `value` rolls into place like a slot counter (left digits land first).
 * Non-digit characters fade in. Great on hero numbers. `value` must be a real number from props.
 */
export const Roll: React.FC<{ value: string; start?: number; dur?: number; stagger?: number; style?: CSS }> = ({ value, start = 4, dur = 36, stagger = 4, style }) => {
  const f = useCurrentFrame();
  const chars = String(value).split("");
  let di = 0;
  return (
    <span style={{ display: "inline-flex", alignItems: "flex-start", fontVariantNumeric: "tabular-nums", lineHeight: 1.1, ...style }}>
      {chars.map((ch, i) => {
        if (!/\d/.test(ch)) {
          const o = ramp(f, start + 6, start + 18);
          return (
            <span key={i} style={{ opacity: o, display: "inline-block", whiteSpace: "pre" }}>
              {ch}
            </span>
          );
        }
        const k = di++;
        const d = parseInt(ch, 10);
        const a0 = start + k * stagger;
        const vis = ramp(f, a0 - 2, a0 + 6);
        const spins = 1;
        const pos = ramp(f, a0, a0 + dur, 0, d + 10 * spins, Easing.out(Easing.cubic));
        const prev = ramp(f - 1, a0, a0 + dur, 0, d + 10 * spins, Easing.out(Easing.cubic));
        const blur = Math.min(3, Math.abs(pos - prev) * 1.6);
        const m = pos % 10;
        return (
          <span key={i} style={{ display: "inline-block", height: "1.1em", overflow: "hidden", position: "relative", opacity: vis }}>
            <span style={{ display: "flex", flexDirection: "column", transform: `translateY(${-m * 1.1}em)`, filter: blur > 0.2 ? `blur(${blur.toFixed(2)}px)` : undefined }}>
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((n, j) => (
                <span key={j} style={{ height: "1.1em", display: "block" }}>
                  {n}
                </span>
              ))}
            </span>
          </span>
        );
      })}
    </span>
  );
};

/**
 * Title reveal: each word rises out of its own mask (the pro "type slides up" look).
 * emphasis = a word that takes the accent.
 */
export const RevealText: React.FC<{ text: string; start?: number; step?: number; style?: CSS; emphasis?: string; center?: boolean }> = ({ text, start = 0, step = 3, style, emphasis, center }) => {
  const { f, fps } = useT();
  const a = useAccent();
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const words = text.split(/\s+/).filter(Boolean);
  return (
    <span style={{ display: "inline-flex", flexWrap: "wrap", justifyContent: center ? "center" : "flex-start", columnGap: "0.26em", ...style }}>
      {words.map((w, i) => {
        const p = spring({ frame: f - start - i * step, fps, config: SPRING.snappy });
        const hot = emphasis && norm(emphasis).length > 0 && norm(w) === norm(emphasis);
        return (
          <span key={i} style={{ display: "inline-block", overflow: "hidden", paddingBottom: "0.08em", marginBottom: "-0.08em" }}>
            <span style={{ display: "inline-block", transform: `translateY(${(1 - p) * 105}%)`, color: hot ? a.hex : undefined, textShadow: hot ? `0 0 36px ${a.glow}` : undefined }}>{w}</span>
          </span>
        );
      })}
    </span>
  );
};

// ── graph: edges + flowing packets ───────────────────────────────────────────

export type Pt = { x: number; y: number };

/** a cubic through explicit control points → { d (SVG path), at(t) → point } */
export const cubic = (p0: Pt, c0: Pt, c1: Pt, p1: Pt) => {
  const at = (t: number): Pt => {
    const u = 1 - t;
    return {
      x: u * u * u * p0.x + 3 * u * u * t * c0.x + 3 * u * t * t * c1.x + t * t * t * p1.x,
      y: u * u * u * p0.y + 3 * u * u * t * c0.y + 3 * u * t * t * c1.y + t * t * t * p1.y,
    };
  };
  return { d: `M ${p0.x} ${p0.y} C ${c0.x} ${c0.y}, ${c1.x} ${c1.y}, ${p1.x} ${p1.y}`, at };
};

/** smooth cubic between two points, leaving/entering horizontally ("h") or vertically ("v") */
export const bezier = (p0: Pt, p1: Pt, dir: "h" | "v" = "h") => {
  const sx = Math.sign(p1.x - p0.x) || 1;
  const sy = Math.sign(p1.y - p0.y) || 1;
  const kx = Math.max(50, Math.abs(p1.x - p0.x) * 0.5) * sx;
  const ky = Math.max(50, Math.abs(p1.y - p0.y) * 0.5) * sy;
  const c0 = dir === "h" ? { x: p0.x + kx, y: p0.y } : { x: p0.x, y: p0.y + ky };
  const c1 = dir === "h" ? { x: p1.x - kx, y: p1.y } : { x: p1.x, y: p1.y - ky };
  const at = (t: number): Pt => {
    const u = 1 - t;
    return {
      x: u * u * u * p0.x + 3 * u * u * t * c0.x + 3 * u * t * t * c1.x + t * t * t * p1.x,
      y: u * u * u * p0.y + 3 * u * u * t * c0.y + 3 * u * t * t * c1.y + t * t * t * p1.y,
    };
  };
  return { d: `M ${p0.x} ${p0.y} C ${c0.x} ${c0.y}, ${c1.x} ${c1.y}, ${p1.x} ${p1.y}`, at };
};

/**
 * A connector that draws itself in (start..start+dur), optionally lights up (`hot` 0..1),
 * fires one bright run-packet at `pulseAt`, and then keeps `packets` dots flowing along it
 * from `flowFrom` (the n8n "data moving" look). Render inside an <svg>.
 */
export const Edge: React.FC<{
  from: Pt;
  to: Pt;
  dir?: "h" | "v";
  start?: number;
  dur?: number;
  hot?: number;
  pulseAt?: number;
  pulseDur?: number;
  flowFrom?: number;
  packets?: number;
  period?: number;
  width?: number;
  /** explicit control points (overrides dir) — e.g. a U-turn between rows */
  via?: [Pt, Pt];
}> = ({ from, to, dir = "h", start = 0, dur = 16, hot = 0, pulseAt, pulseDur = 18, flowFrom, packets = 2, period = 54, width = 2.5, via }) => {
  const a = useAccent();
  const f = useCurrentFrame();
  const { d, at } = via ? cubic(from, via[0], via[1], to) : bezier(from, to, dir);
  const draw = ramp(f, start, start + dur);
  if (draw <= 0) return null;
  const dots: React.ReactNode[] = [];
  if (pulseAt !== undefined && f >= pulseAt && f <= pulseAt + pulseDur + 6) {
    const t = ramp(f, pulseAt, pulseAt + pulseDur, 0, 1, Easing.inOut(Easing.quad));
    [0, 0.05, 0.1].forEach((lag, k) => {
      const p = at(clamp01(t - lag));
      dots.push(<circle key={`p${k}`} cx={p.x} cy={p.y} r={7 - k * 2} fill={a.hex} opacity={(1 - k * 0.3) * (t >= 1 ? ramp(f, pulseAt + pulseDur, pulseAt + pulseDur + 6, 1, 0) : 1)} style={{ filter: `drop-shadow(0 0 8px ${a.glow})` }} />);
    });
  }
  if (flowFrom !== undefined && f >= flowFrom) {
    const fade = ramp(f, flowFrom, flowFrom + 12);
    for (let k = 0; k < packets; k++) {
      const t = ((f - flowFrom) / period + k / packets) % 1;
      const p = at(t);
      dots.push(<circle key={`f${k}`} cx={p.x} cy={p.y} r={4.5} fill={a.hex} opacity={Math.sin(Math.PI * t) * 0.95 * fade} style={{ filter: `drop-shadow(0 0 6px ${a.glow})` }} />);
    }
  }
  return (
    <g>
      <path d={d} fill="none" stroke="rgba(255,255,255,0.17)" strokeWidth={width} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} />
      {hot > 0 ? <path d={d} fill="none" stroke={a.hex} strokeWidth={width} strokeLinecap="round" opacity={hot * 0.75} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} style={{ filter: `drop-shadow(0 0 6px ${a.glow})` }} /> : null}
      {dots}
    </g>
  );
};

// ── pointer ──────────────────────────────────────────────────────────────────

/** a cursor waypoint: be at (x,y) by frame `at`, stay `hold` frames; click = press + ripple on arrival */
export type CursorKey = { x: number; y: number; at: number; hold?: number; click?: boolean };

/** cursor position at frame f (eased moves with a slight arc between waypoints) */
export const cursorAt = (keys: CursorKey[], f: number): Pt => {
  if (!keys.length) return { x: 0, y: 0 };
  if (f <= keys[0].at) return { x: keys[0].x, y: keys[0].y };
  for (let i = 0; i < keys.length - 1; i++) {
    const k0 = keys[i];
    const k1 = keys[i + 1];
    const leave = k0.at + (k0.hold ?? 0);
    if (f <= leave) return { x: k0.x, y: k0.y };
    if (f < k1.at) {
      const t = ramp(f, leave, k1.at, 0, 1, Easing.inOut(Easing.cubic));
      const arc = Math.sin(Math.PI * t) * Math.min(60, Math.hypot(k1.x - k0.x, k1.y - k0.y) * 0.12);
      const len = Math.hypot(k1.x - k0.x, k1.y - k0.y) || 1;
      const nx = -(k1.y - k0.y) / len;
      const ny = (k1.x - k0.x) / len;
      return { x: k0.x + (k1.x - k0.x) * t + nx * arc, y: k0.y + (k1.y - k0.y) * t + ny * arc };
    }
  }
  const l = keys[keys.length - 1];
  return { x: l.x, y: l.y };
};

/** an expanding accent ring (click feedback). Absolutely positioned at (x,y) in the parent. */
export const Ripple: React.FC<{ x: number; y: number; at: number; size?: number }> = ({ x, y, at, size = 90 }) => {
  const a = useAccent();
  const f = useCurrentFrame();
  if (f < at || f > at + 22) return null;
  const t = ramp(f, at, at + 20, 0, 1, Easing.out(Easing.cubic));
  const s = size * (0.25 + t);
  return (
    <>
      <div style={{ position: "absolute", left: x - s / 2, top: y - s / 2, width: s, height: s, borderRadius: "50%", border: `3px solid ${a.hex}`, opacity: 1 - t, boxShadow: `0 0 24px ${a.glow}`, pointerEvents: "none" }} />
      <div style={{ position: "absolute", left: x - 11, top: y - 11, width: 22, height: 22, borderRadius: "50%", background: a.hex, opacity: (1 - t) * 0.6, pointerEvents: "none" }} />
    </>
  );
};

/**
 * A macOS-style pointer that travels through waypoints (parent coords, parent position:relative),
 * presses on `click` keys (scale dip + ripple). appear = frame it fades in.
 */
export const Cursor: React.FC<{ keys: CursorKey[]; size?: number; appear?: number }> = ({ keys, size = 52, appear }) => {
  const f = useCurrentFrame();
  const p = cursorAt(keys, f);
  const a0 = appear ?? (keys[0]?.at ?? 0) - 8;
  const vis = ramp(f, a0, a0 + 8);
  let press = 1;
  for (const k of keys) {
    if (!k.click) continue;
    const c = k.at + 2;
    if (f >= c - 3 && f <= c + 8) press = Math.min(press, 1 - 0.16 * Math.sin(Math.PI * clamp01((f - (c - 3)) / 11)));
  }
  return (
    <>
      {keys.filter((k) => k.click).map((k, i) => (
        <Ripple key={i} x={k.x} y={k.y} at={k.at + 2} />
      ))}
      <div style={{ position: "absolute", left: p.x - size * 0.18, top: p.y - size * 0.08, width: size, height: size, opacity: vis, transform: `scale(${press})`, transformOrigin: "18% 8%", pointerEvents: "none", filter: "drop-shadow(0 6px 10px rgba(0,0,0,0.55))" }}>
        <svg width={size} height={size} viewBox="0 0 32 32">
          <path d="M6 3 L6 25 L11.5 19.8 L15.2 28.2 L19 26.6 L15.4 18.4 L23 18.4 Z" fill="#fff" stroke="#0A0A0C" strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
      </div>
    </>
  );
};

// ── emphasis ─────────────────────────────────────────────────────────────────

/**
 * An accent box that DRAWS itself around a region (x,y,w,h in the parent's px), soft fill,
 * breathing glow once drawn, optional label chip below it (above if flip).
 */
export const HighlightBox: React.FC<{ x: number; y: number; w: number; h: number; start?: number; radius?: number; label?: string; flip?: boolean; stroke?: number }> = ({ x, y, w, h, start = 0, radius = 14, label, flip, stroke = 4 }) => {
  const a = useAccent();
  const { f, fps } = useT();
  const draw = ramp(f, start, start + 16, 0, 1, Easing.out(Easing.cubic));
  if (draw <= 0) return null;
  const glowK = f > start + 16 ? breathe(f, 70) : 0;
  const lp = spring({ frame: f - start - 12, fps, config: SPRING.bouncy });
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h, pointerEvents: "none" }}>
      <div style={{ position: "absolute", inset: 0, borderRadius: radius, background: a.soft, opacity: draw * 0.85, boxShadow: `0 0 ${30 + glowK * 30}px ${a.glow}` }} />
      <svg width={w} height={h} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <rect x={0} y={0} width={w} height={h} rx={radius} fill="none" stroke={a.hex} strokeWidth={stroke} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} style={{ filter: `drop-shadow(0 0 8px ${a.glow})` }} />
      </svg>
      {label ? (
        <div style={{ position: "absolute", left: 0, ...(flip ? { bottom: h + 16 } : { top: h + 16 }), ...pop(lp, 0.7), transformOrigin: "left center" }}>
          <span style={{ display: "inline-block", fontFamily: F2.sans, fontWeight: 700, fontSize: 30, letterSpacing: "-0.01em", color: T.bg, background: a.hex, padding: "10px 20px", borderRadius: 14, whiteSpace: "nowrap", boxShadow: `0 10px 40px -8px ${a.glow}` }}>{label}</span>
        </div>
      ) : null}
    </div>
  );
};

/** inline highlighter pen: an accent wash sweeps behind the text */
export const Marker: React.FC<Kids & { start?: number; dur?: number; style?: CSS }> = ({ children, start = 0, dur = 14, style }) => {
  const a = useAccent();
  const f = useCurrentFrame();
  const t = ramp(f, start, start + dur, 0, 1, Easing.out(Easing.cubic));
  return (
    <span
      style={{
        backgroundImage: `linear-gradient(${a.soft}, ${a.soft})`,
        backgroundRepeat: "no-repeat",
        backgroundSize: `${t * 100}% 100%`,
        borderRadius: 8,
        padding: "0 0.14em",
        boxDecorationBreak: "clone",
        WebkitBoxDecorationBreak: "clone",
        color: t > 0.5 ? a.hex : undefined,
        ...style,
      }}
    >
      {children}
    </span>
  );
};

/** an accent bar that grows left→right (under a word / a number) */
export const Underline: React.FC<{ start?: number; dur?: number; width?: number | string; thickness?: number; style?: CSS }> = ({ start = 0, dur = 16, width = "100%", thickness = 6, style }) => {
  const a = useAccent();
  const f = useCurrentFrame();
  const t = ramp(f, start, start + dur, 0, 1, Easing.out(Easing.cubic));
  return (
    <div style={{ width, height: thickness, ...style }}>
      <div style={{ width: `${t * 100}%`, height: "100%", borderRadius: thickness, background: `linear-gradient(90deg, ${a.dim}, ${a.hex})`, boxShadow: `0 0 18px ${a.glow}` }} />
    </div>
  );
};

// ── brand ────────────────────────────────────────────────────────────────────

/** a brand's real logo (white) in a glass tile — or its initial when there's no mark */
export const LogoTile: React.FC<{ brand?: string; letter?: string; size?: number; glow?: boolean; radius?: number; style?: CSS }> = ({ brand, letter, size = 64, glow, radius, style }) => {
  const a = useAccent();
  const ic = brand ? getLogo(brand) : null;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: radius ?? size * 0.28,
        flexShrink: 0,
        background: "linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.04))",
        border: `1px solid ${T.borderBright}`,
        boxShadow: glow ? `0 0 ${size * 0.7}px -${size * 0.14}px ${a.glow}, inset 0 1px 0 rgba(255,255,255,0.16)` : "inset 0 1px 0 rgba(255,255,255,0.12)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        ...style,
      }}
    >
      {ic ? (
        <svg width={size * 0.54} height={size * 0.54} viewBox="0 0 24 24" fill="#fff">
          <path d={ic.path} />
        </svg>
      ) : (
        <span style={{ fontFamily: F2.sans, fontWeight: 700, fontSize: size * 0.44, color: T.text }}>{(letter ?? brand ?? "?").trim().slice(0, 1).toUpperCase()}</span>
      )}
    </div>
  );
};

/** logo + label pill */
export const LogoChip: React.FC<{ brand?: string; label: string; size?: number; hero?: boolean; style?: CSS }> = ({ brand, label, size = 26, hero, style }) => {
  const a = useAccent();
  const ic = brand ? getLogo(brand) : null;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 20px 10px 14px",
        borderRadius: 999,
        background: hero ? a.soft : "rgba(255,255,255,0.05)",
        border: `1px solid ${hero ? a.dim : T.borderBright}`,
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {ic ? (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="#fff">
          <path d={ic.path} />
        </svg>
      ) : (
        <span style={{ width: 10, height: 10, borderRadius: 5, background: a.hex, display: "inline-block" }} />
      )}
      <span style={{ fontFamily: F2.sans, fontWeight: 600, fontSize: size * 0.95, color: hero ? T.text : T.dim }}>{label}</span>
    </span>
  );
};

/** hero logo reveal: the real mark's outline DRAWS, then fills. Falls back to LogoTile's letter. */
export const LogoDraw: React.FC<{ brand: string; size?: number; start?: number; dur?: number; color?: string }> = ({ brand, size = 120, start = 0, dur = 26, color = "#fff" }) => {
  const f = useCurrentFrame();
  const ic = getLogo(brand);
  if (!ic) return <span style={{ fontFamily: F2.sans, fontWeight: 700, fontSize: size * 0.5, color: T.text }}>{brand.slice(0, 1).toUpperCase()}</span>;
  const draw = ramp(f, start, start + dur, 0, 1, Easing.inOut(Easing.cubic));
  const fill = ramp(f, start + dur * 0.6, start + dur + 8);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ overflow: "visible" }}>
      <path d={ic.path} fill={color} fillOpacity={fill} stroke={color} strokeWidth={0.35} strokeOpacity={1 - fill * 0.6} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} />
    </svg>
  );
};

// ── lists + small marks ──────────────────────────────────────────────────────

/** a check mark; progress 0..1 draws the stroke */
export const Check: React.FC<{ size?: number; color?: string; width?: number; progress?: number }> = ({ size = 24, color, width = 3.2, progress = 1 }) => {
  const a = useAccent();
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color ?? a.hex} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - clamp01(progress)} />
    </svg>
  );
};

/** frame-driven spinner arc */
export const Spinner: React.FC<{ size?: number; color?: string }> = ({ size = 28, color }) => {
  const a = useAccent();
  const f = useCurrentFrame();
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ transform: `rotate(${(f * 24) % 360}deg)` }}>
      <circle cx="12" cy="12" r="9" stroke={T.border} strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke={color ?? a.hex} strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
};

/** a pulsing "live" dot with a soft ring */
export const LiveDot: React.FC<{ size?: number; color?: string }> = ({ size = 12, color }) => {
  const a = useAccent();
  const f = useCurrentFrame();
  const t = (f % 48) / 48;
  const c = color ?? a.hex;
  return (
    <span style={{ position: "relative", display: "inline-block", width: size, height: size, flexShrink: 0 }}>
      <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: c, boxShadow: `0 0 12px ${c}` }} />
      <span style={{ position: "absolute", inset: -size * t * 0.9, borderRadius: "50%", border: `2px solid ${c}`, opacity: (1 - t) * 0.7 }} />
    </span>
  );
};

/** checklist: boxes appear, ticks DRAW, text brightens — paced by `starts` (see schedule) */
export const TickList: React.FC<{ items: string[]; starts?: number[]; size?: number; gap?: number }> = ({ items, starts, size = 42, gap = 26 }) => {
  const a = useAccent();
  const { f, sp, beat } = useT();
  const at = starts ?? schedule(items.length, beat, { start: 8, fill: 0.45, max: 22 });
  return (
    <div style={{ display: "flex", flexDirection: "column", gap }}>
      {items.map((it, i) => {
        const e = sp(at[i], "snappy");
        const tick = ramp(f, at[i] + 6, at[i] + 16, 0, 1, Easing.out(Easing.cubic));
        const box = sp(at[i] + 6, "bouncy");
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: size * 0.55, ...slide(e, -26) }}>
            <div style={{ width: size * 1.15, height: size * 1.15, borderRadius: size * 0.34, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: tick > 0 ? a.soft : "transparent", border: `1.5px solid ${tick > 0 ? a.dim : T.borderBright}`, boxShadow: tick > 0.9 ? `0 0 26px -6px ${a.glow}` : "none", transform: `scale(${tick > 0 ? 0.9 + 0.1 * box : 1})` }}>
              <Check size={size * 0.62} progress={tick} width={3.4} />
            </div>
            <span style={{ fontFamily: F2.sans, fontWeight: 500, fontSize: size, letterSpacing: "-0.015em", lineHeight: 1.18, color: tick > 0.6 ? T.text : T.dim }}>{it}</span>
          </div>
        );
      })}
    </div>
  );
};
