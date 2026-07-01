import {
  AbsoluteFill,
  continueRender,
  delayRender,
  interpolate,
  random,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { useEffect, useState } from "react";
import { F2, T, useAccent } from "./theme";
import { getLogo } from "./logos";
import type { Word } from "../types";

// ─────────────────────────────────────────────────────────────────────────────
// FX layer for brand v2. Everything here is FRAME-DETERMINISTIC (drives off
// useCurrentFrame + remotion's seeded random) — no wall clocks, no Math.random.
// ─────────────────────────────────────────────────────────────────────────────

export const useEnter = (delay = 0, cfg: { damping?: number; stiffness?: number; mass?: number } = {}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: { damping: 22, stiffness: 130, mass: 0.9, ...cfg } });
};

const asset = (s: string) => (s.startsWith("http") || s.startsWith("data:") ? s : staticFile(s));

// static noise overlay (data-URI SVG turbulence = identical every frame)
const NOISE =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' seed='7'/></filter><rect width='300' height='300' filter='url(%23n)' opacity='0.5'/></svg>`,
  );

// ── Bg — the dark canvas behind every scene ───────────────────────────────────
// "plain": faint accent haze top • "grid": + hairline grid • "shader": drifting
// liquid accent blobs (our deterministic take on the LiquidMetal look).
export type BgVariant = "plain" | "grid" | "shader";

export const Bg: React.FC<{ variant?: BgVariant }> = ({ variant = "plain" }) => {
  const a = useAccent();
  const f = useCurrentFrame();
  const drift = (p: number, amp: number) => Math.sin(f / (110 + p * 30) + p * 2.1) * amp;
  return (
    <AbsoluteFill style={{ background: `linear-gradient(180deg, ${T.bg2} 0%, ${T.bg} 55%)`, overflow: "hidden" }}>
      {variant === "grid" ? (
        <AbsoluteFill
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)`,
            backgroundSize: "72px 72px",
            maskImage: "radial-gradient(ellipse 90% 70% at 50% 38%, black 30%, transparent 78%)",
          }}
        />
      ) : null}
      {variant === "shader" ? (
        <>
          <div
            style={{
              position: "absolute",
              width: 1500,
              height: 1500,
              left: -350 + drift(0, 70),
              top: -520 + drift(1, 55),
              borderRadius: "50%",
              background: `radial-gradient(circle at 40% 40%, ${a.glow}, transparent 62%)`,
              filter: "blur(90px)",
              transform: `rotate(${f / 14}deg)`,
            }}
          />
          <div
            style={{
              position: "absolute",
              width: 1100,
              height: 1100,
              right: -380 - drift(2, 60),
              bottom: -160 + drift(3, 70),
              borderRadius: "50%",
              background: `radial-gradient(circle at 60% 55%, ${a.soft}, transparent 60%)`,
              filter: "blur(80px)",
            }}
          />
          <div
            style={{
              position: "absolute",
              width: 800,
              height: 320,
              left: 140 + drift(4, 90),
              top: 620 + drift(5, 40),
              borderRadius: "50%",
              background: `linear-gradient(100deg, transparent, ${a.soft}, transparent)`,
              filter: "blur(70px)",
              transform: `rotate(${-8 + drift(6, 5)}deg)`,
            }}
          />
        </>
      ) : (
        <div
          style={{
            position: "absolute",
            width: 1400,
            height: 900,
            left: -160,
            top: -420,
            background: `radial-gradient(ellipse at 50% 30%, ${a.soft}, transparent 65%)`,
            filter: "blur(60px)",
          }}
        />
      )}
      {/* film grain + vignette — kills the "flat digital" feel */}
      <AbsoluteFill style={{ backgroundImage: `url("${NOISE}")`, backgroundRepeat: "repeat", opacity: 0.05 }} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 120% 90% at 50% 45%, transparent 55%, rgba(0,0,0,0.55) 100%)" }} />
    </AbsoluteFill>
  );
};

// ── Scene — wrapper every v2 component sits in (content lifted above captions)
export const Scene: React.FC<{ bg?: BgVariant; children: React.ReactNode }> = ({ bg = "plain", children }) => (
  <AbsoluteFill>
    <Bg variant={bg} />
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: "90px 84px 400px" }}>{children}</AbsoluteFill>
  </AbsoluteFill>
);

// small kicker label used across components
export const Kicker: React.FC<{ text: string }> = ({ text }) => {
  const a = useAccent();
  return (
    <div
      style={{
        fontFamily: F2.mono,
        fontSize: 26,
        letterSpacing: "0.26em",
        textTransform: "uppercase",
        color: a.hex,
        textShadow: `0 0 24px ${a.glow}`,
        marginBottom: 34,
        textAlign: "center",
      }}
    >
      {text}
    </div>
  );
};

// glassy panel used across components
export const Panel: React.FC<{ children: React.ReactNode; style?: React.CSSProperties; glow?: boolean }> = ({ children, style, glow }) => {
  const a = useAccent();
  return (
    <div
      style={{
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: 28,
        boxShadow: glow ? `0 0 90px -20px ${a.glow}, inset 0 1px 0 ${T.borderBright}` : `inset 0 1px 0 ${T.border}`,
        backdropFilter: "blur(12px)",
        ...style,
      }}
    >
      {children}
    </div>
  );
};

// ── DecryptText — scramble → resolve, left to right (frame-deterministic) ────
const SCRAMBLE = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz0123456789#$%&<>*[]{}";
export const DecryptText: React.FC<{
  text: string;
  delay?: number;
  cps?: number; // reveal speed, chars/second
  size?: number;
  align?: "center" | "left";
}> = ({ text, delay = 4, cps = 28, size = 92, align = "center" }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const a = useAccent();
  const revealed = Math.max(0, ((f - delay) / fps) * cps);
  return (
    <div style={{ fontFamily: F2.mono, fontWeight: 700, fontSize: size, lineHeight: 1.18, letterSpacing: "-0.01em", textAlign: align, wordBreak: "break-word" }}>
      {text.split("").map((ch, i) => {
        if (ch === " ") return <span key={i}> </span>;
        if (i < revealed) return <span key={i} style={{ color: T.text }}>{ch}</span>;
        if (i < revealed + 10) {
          const r = SCRAMBLE[Math.floor(random(`${i}:${Math.floor(f / 2)}`) * SCRAMBLE.length)];
          return (
            <span key={i} style={{ color: a.hex, textShadow: `0 0 22px ${a.glow}` }}>{r}</span>
          );
        }
        return <span key={i} style={{ color: T.faint }}>·</span>;
      })}
    </div>
  );
};

// ── AsciiImage — real image dissolves into glowing ASCII (matrix style) ──────
// src: public path/url, or brand: a real logo name (rasterized from its SVG).
const RAMP = " .:-=+*#%@";
export const AsciiImage: React.FC<{ src?: string; brand?: string; label?: string; res?: number }> = ({ src, brand, label, res = 64 }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const a = useAccent();
  const [grid, setGrid] = useState<{ rows: string[]; url: string } | null>(null);
  const [handle] = useState(() => delayRender("ascii-image"));

  useEffect(() => {
    let url = "";
    if (brand) {
      const ic = getLogo(brand);
      if (ic) {
        url =
          "data:image/svg+xml;utf8," +
          encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='512' height='512'><path fill='white' d='${ic.path}'/></svg>`);
      }
    }
    if (!url && src) url = asset(src);
    if (!url) {
      continueRender(handle);
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const cols = res;
      const rows = Math.round((img.height / img.width) * cols * 0.52); // chars are ~2x tall
      const c = document.createElement("canvas");
      c.width = cols;
      c.height = rows;
      const ctx = c.getContext("2d")!;
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, cols, rows);
      ctx.drawImage(img, 0, 0, cols, rows);
      const d = ctx.getImageData(0, 0, cols, rows).data;
      const out: string[] = [];
      for (let y = 0; y < rows; y++) {
        let line = "";
        for (let x = 0; x < cols; x++) {
          const i = (y * cols + x) * 4;
          const lum = (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255;
          line += RAMP[Math.min(RAMP.length - 1, Math.floor(lum * RAMP.length))];
        }
        out.push(line);
      }
      setGrid({ rows: out, url });
      continueRender(handle);
    };
    img.onerror = () => continueRender(handle);
    img.src = url;
  }, [src, brand, res, handle]);

  if (!grid) return null;

  // 0→1: real image · 1→2: dissolve to ascii (rows sweep down + flicker)
  const t = interpolate(f, [0, Math.round(0.8 * fps), Math.round(2.0 * fps)], [0, 1, 2], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const sweep = interpolate(t, [1, 2], [0, grid.rows.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const fontSize = Math.min(1080, 900) / grid.rows[0].length * 1.72;

  return (
    <div style={{ position: "relative", width: 900 }}>
      <img
        src={grid.url}
        style={{ width: "100%", borderRadius: 24, opacity: interpolate(t, [0.9, 1.6], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }), display: "block" }}
      />
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", overflow: "hidden" }}>
        {grid.rows.map((row, y) => {
          const on = y < sweep;
          const flick = random(`r${y}:${Math.floor(f / 3)}`);
          return (
            <div
              key={y}
              style={{
                fontFamily: F2.mono,
                fontSize,
                lineHeight: 1,
                whiteSpace: "pre",
                color: a.hex,
                opacity: on ? 0.55 + 0.45 * flick : 0,
                textShadow: `0 0 14px ${a.glow}`,
              }}
            >
              {row}
            </div>
          );
        })}
      </div>
      {label ? (
        <div style={{ fontFamily: F2.mono, fontSize: 28, color: T.dim, textAlign: "center", marginTop: 26, letterSpacing: "0.08em" }}>{label}</div>
      ) : null}
    </div>
  );
};

// ── Caption2 — Geist captions on a dark hairline pill ─────────────────────────
export const Caption2: React.FC<{ words: Word[]; timeMs: number }> = ({ words, timeMs }) => {
  if (!words.length) return null;
  let cur = -1;
  for (let i = 0; i < words.length; i++) {
    if (words[i].startMs <= timeMs) cur = i;
    else break;
  }
  if (cur < 0) return null;
  const windowWords = words.slice(Math.max(0, cur - 2), cur + 1);
  const since = (timeMs - words[cur].startMs) / 1000;
  const lift = interpolate(since, [0, 0.12], [7, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 560 }}>
      <div
        style={{
          transform: `translateY(${lift}px)`,
          background: "rgba(7,7,9,0.82)",
          border: `1px solid ${T.border}`,
          borderRadius: 18,
          padding: "14px 30px",
          display: "flex",
          gap: 15,
          maxWidth: 920,
          flexWrap: "wrap",
          justifyContent: "center",
          boxShadow: "0 18px 50px -12px rgba(0,0,0,0.7)",
        }}
      >
        {windowWords.map((w, i) => (
          <span key={`${cur}-${i}`} style={{ fontFamily: F2.sans, fontWeight: 700, fontSize: 56, color: T.text, letterSpacing: "-0.015em" }}>
            {w.text}
          </span>
        ))}
      </div>
    </AbsoluteFill>
  );
};
