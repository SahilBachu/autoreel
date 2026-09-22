import React from "react";
import {
  AbsoluteFill,
  Audio,
  Easing,
  Img,
  OffthreadVideo,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { Word } from "../../types";
import { AccentProvider, F2, resolveAccent, useAccent } from "../../auto/theme";
import { Caption2 } from "../../auto/fx";
import { useGeistFonts } from "../../auto/fonts2";
import { ANCHOR, B, C, L, WINDOWS_MS, WORLD, camera } from "./camera";

// ─────────────────────────────────────────────────────────────────────────────
// HereticWorld — the "Heretic" reel re-created BY HAND as ONE connected world with
// a travelling camera instead of seven full-screen cards. Kept as the reference
// experiment (composition "WorldHeretic"); the scene-driven generalisation the bot
// renders is ../WorldReel.tsx.
//
// Style contract: flat charcoal surfaces, hairline borders, no glow / bloom /
// gradients / glass. One flat red accent, used only for the refusal direction
// and the cut. Every motion shows causality; all of it drives off the frame.
// ─────────────────────────────────────────────────────────────────────────────

export type HereticWorldData = {
  videoSrc: string;
  captions: Word[];
  accent?: string;
  music?: string;
  sfx?: { file: string; atMs: number; trimBeforeMs?: number; volume?: number }[];
  voiceBoost?: number;
  shot?: string; // the real GitHub screenshot
};

const asset = (s: string) => (s.startsWith("http") ? s : staticFile(s));
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const seg = (f: number, a: number, b: number, easing?: (t: number) => number) =>
  interpolate(f, [a, b], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing });
const typed = (text: string, f: number, start: number, cps: number, fps: number) =>
  text.slice(0, Math.max(0, Math.floor(((f - start) / fps) * cps)));

// ── Identity: the wordmark + structural metadata (all real) ──────────────────
const Identity: React.FC = () => (
  <>
    <div
      style={{
        position: "absolute",
        left: L.wordmark.x,
        top: L.wordmark.y,
        fontFamily: F2.sans,
        fontWeight: 800,
        fontSize: 220,
        lineHeight: 1,
        letterSpacing: "-0.055em",
        color: C.text,
      }}
    >
      heretic
    </div>
    <div
      style={{
        position: "absolute",
        left: L.meta.x,
        top: L.meta.y,
        display: "flex",
        gap: 34,
        alignItems: "center",
        fontFamily: F2.mono,
        fontSize: 38,
        color: C.dim,
        letterSpacing: "-0.01em",
      }}
    >
      <span>p-e-w/heretic</span>
      <span style={{ width: 6, height: 6, background: C.faint, borderRadius: 1 }} />
      <span>Python</span>
      <span style={{ width: 6, height: 6, background: C.faint, borderRadius: 1 }} />
      <span>pip</span>
    </div>
  </>
);

// ── Terminal: the two real commands, typed and executed on the beat ──────────
const Terminal: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = L.term;
  const cmd1 = "pip install heretic-llm";
  const cmd2 = "heretic <model>";
  const c1 = typed(cmd1, f, B.typeCmd1, 13, fps);
  const c1done = c1.length === cmd1.length;
  const c2 = typed(cmd2, f, B.typeCmd2, 16, fps);
  const c2done = c2.length === cmd2.length;
  const blink = Math.floor(f / 16) % 2 === 0;

  // which line owns the cursor
  const cursorLine = f < B.enter1 ? 0 : f < B.enter2 ? 4 : 5;

  const Line: React.FC<{ i: number; children?: React.ReactNode; show?: boolean }> = ({ i, children, show = true }) => (
    <div
      style={{
        position: "absolute",
        left: t.pad + 12,
        top: t.bar + t.pad + i * t.lh,
        height: t.lh,
        lineHeight: `${t.lh}px`,
        fontFamily: F2.mono,
        fontSize: t.fs,
        whiteSpace: "pre",
        color: C.dim,
        opacity: show ? 1 : 0,
      }}
    >
      {children}
      {cursorLine === i && show && (f < B.typeCmd1 || (i === 0 && !c1done) || (i === 4 && !c2done) || blink) ? (
        <span style={{ display: "inline-block", width: 18, height: 34, background: C.text, verticalAlign: -6, marginLeft: 2 }} />
      ) : null}
    </div>
  );

  return (
    <div style={{ position: "absolute", left: t.x, top: t.y, width: t.w, height: t.h, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 14, overflow: "hidden" }}>
      {/* title bar */}
      <div style={{ position: "absolute", left: 0, top: 0, right: 0, height: t.bar, borderBottom: `1px solid ${C.line}`, display: "flex", alignItems: "center", padding: "0 24px", gap: 10 }}>
        {[0, 1, 2].map((i) => (
          <span key={i} style={{ width: 13, height: 13, borderRadius: 7, background: "#3A3A40" }} />
        ))}
        <span style={{ marginLeft: "auto", fontFamily: F2.mono, fontSize: 20, color: C.faint, letterSpacing: "0.08em" }}>bash</span>
      </div>
      <Line i={0}>
        <span style={{ color: C.faint }}>$ </span>
        <span style={{ color: C.text }}>{c1}</span>
      </Line>
      <Line i={1} show={f >= B.enter1}>Collecting heretic-llm</Line>
      <Line i={2} show={f >= B.enter1 + 2}>Installing collected packages: heretic-llm</Line>
      <Line i={3} show={f >= B.enter1 + 4}>Successfully installed heretic-llm</Line>
      <Line i={4} show={f >= B.typeCmd2 - 1}>
        <span style={{ color: C.faint }}>$ </span>
        <span style={{ color: C.text }}>{c2.split("<")[0]}</span>
        <span style={{ color: C.dim }}>{c2.includes("<") ? "<" + c2.split("<")[1] : ""}</span>
      </Line>
      <Line i={5} show={f >= B.enter2} />
    </div>
  );
};

// ── Connector: the run command leads into the model ───────────────────────────
const Connector: React.FC = () => {
  const f = useCurrentFrame();
  const t = L.term;
  const y0 = t.y + t.bar + t.pad + 4 * t.lh + t.lh / 2; // the `heretic <model>` line
  const y1 = L.block.y + L.block.h / 2;
  const x0 = t.x + t.w;
  const x1 = L.block.x;
  const xm = (x0 + x1) / 2;
  const draw = seg(f, B.enter2, B.enter2 + 26, Easing.out(Easing.cubic));
  return (
    <svg style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }} width={1} height={1}>
      <path
        d={`M ${x0} ${y0} H ${xm} V ${y1} H ${x1}`}
        fill="none"
        stroke={C.line2}
        strokeWidth={2}
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1 - draw}
      />
    </svg>
  );
};

// ── Mechanism (hero): the refusal direction found inside the model and cut ────
const DOTS = (() => {
  const cols = 24, rows = 22, pitch = 38, ox = 63, oy = 80;
  const cx = ox + ((cols - 1) * pitch) / 2;
  const cy = oy + ((rows - 1) * pitch) / 2;
  const th = (-28 * Math.PI) / 180;
  const d = { x: Math.cos(th), y: Math.sin(th) };
  const pts: { x: number; y: number; on: boolean }[] = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const x = ox + c * pitch, y = oy + r * pitch;
      const perp = Math.abs((x - cx) * d.y - (y - cy) * d.x);
      pts.push({ x, y, on: perp <= 16 });
    }
  return { pts, cx, cy, d, oy, rows, pitch };
})();

const Mechanism: React.FC = () => {
  const f = useCurrentFrame();
  const a = useAccent();
  const b = L.block;
  const { pts, cx, cy, d } = DOTS;
  const red = a.hex;

  const scanY = interpolate(f, [B.scanStart, B.scanEnd], [DOTS.oy - 30, DOTS.oy + (DOTS.rows - 1) * DOTS.pitch + 30], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.quad) });
  const scanning = f >= B.scanStart && f <= B.scanEnd;
  const lineDraw = seg(f, B.lineStart, B.lineEnd, Easing.out(Easing.cubic));
  const cutDraw = seg(f, B.cut, B.cut + 5, Easing.out(Easing.cubic));
  const gone = seg(f, B.removeStart, B.removeEnd, Easing.in(Easing.quad));
  const labelIn = seg(f, B.label, B.label + 6);
  const strike = seg(f, B.removeStart, B.removeStart + 6, Easing.out(Easing.cubic));
  const dirOut = seg(f, B.removeStart, B.removeStart + 3);
  const removedIn = seg(f, B.removeStart + 3, B.removeStart + 8);

  const R = 520; // half-length of the direction line
  const p = (k: number) => ({ x: cx + d.x * k, y: cy + d.y * k });
  const A0 = p(-R), A1 = p(-10), B0 = p(10), B1 = p(R);
  const shift = gone * 70;
  const n = { x: -d.y, y: d.x };
  const cut0 = { x: cx - n.x * 52, y: cy - n.y * 52 };
  const cut1 = { x: cx + n.x * 52, y: cy + n.y * 52 };
  const lab = { x: cx + 150, y: cy + 130 };

  return (
    <div style={{ position: "absolute", left: b.x, top: b.y, width: b.w, height: b.h, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 14, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 32, top: 22, fontFamily: F2.mono, fontSize: 26, color: C.faint, letterSpacing: "0.14em", textTransform: "uppercase" }}>model</div>
      <svg width={b.w} height={b.h} style={{ position: "absolute", left: 0, top: 0 }}>
        {/* the model: a neutral field of activations */}
        {pts.map((q, i) => {
          const found = q.on && f >= B.scanStart && scanY >= q.y;
          const pop = found ? seg(f, 0, 1) : 0; // found → flat red, larger; removed → hole
          const r = found ? 6 + 1.5 * pop : 4;
          const op = q.on && f >= B.removeStart ? 1 - gone : 1;
          return <circle key={i} cx={q.x} cy={q.y} r={r} fill={found ? red : "rgba(242,242,243,0.30)"} opacity={op} />;
        })}
        {/* scan */}
        {scanning ? <line x1={0} x2={b.w} y1={scanY} y2={scanY} stroke="rgba(242,242,243,0.45)" strokeWidth={3} /> : null}
        {/* the direction — drawn through the aligned dots, then severed */}
        {f >= B.lineStart ? (
          <g>
            <line x1={A0.x - d.x * shift} y1={A0.y - d.y * shift} x2={A1.x - d.x * shift} y2={A1.y - d.y * shift} stroke={red} strokeWidth={4} pathLength={1} strokeDasharray={1} strokeDashoffset={f < B.removeStart ? 1 - Math.min(1, lineDraw * 2) : 0} opacity={1 - gone} />
            <line x1={B0.x + d.x * shift} y1={B0.y + d.y * shift} x2={B1.x + d.x * shift} y2={B1.y + d.y * shift} stroke={red} strokeWidth={4} pathLength={1} strokeDasharray={1} strokeDashoffset={f < B.removeStart ? 1 - Math.max(0, lineDraw * 2 - 1) : 0} opacity={1 - gone} />
            {/* before the cut the line is continuous across the centre */}
            {f < B.cut ? <line x1={A1.x} y1={A1.y} x2={B0.x} y2={B0.y} stroke={red} strokeWidth={4} opacity={lineDraw >= 0.5 ? 1 : 0} /> : null}
          </g>
        ) : null}
        {/* the cut — stays as a scar */}
        {f >= B.cut ? <line x1={cut0.x} y1={cut0.y} x2={cut1.x} y2={cut1.y} stroke={red} strokeWidth={8} strokeLinecap="square" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - cutDraw} /> : null}
        {/* label */}
        {f >= B.label ? (
          <g opacity={labelIn}>
            <text x={lab.x} y={lab.y} fontFamily={F2.mono} fontSize={40} fontWeight={700} fill={red} opacity={f >= B.removeStart ? 1 - 0.55 * strike : 1}>
              refusal
            </text>
            {f >= B.removeStart ? <line x1={lab.x - 4} x2={lab.x - 4 + 176 * strike} y1={lab.y - 13} y2={lab.y - 13} stroke={red} strokeWidth={4} /> : null}
            {/* one word at a time — crossfading them in the same spot rendered as mush */}
            {removedIn < 1 ? (
              <text x={lab.x} y={lab.y + 40} fontFamily={F2.mono} fontSize={26} fill={C.dim} letterSpacing="0.12em" opacity={1 - dirOut}>
                DIRECTION
              </text>
            ) : (
              <text x={lab.x} y={lab.y + 40} fontFamily={F2.mono} fontSize={26} fill={C.text} letterSpacing="0.12em">
                REMOVED
              </text>
            )}
          </g>
        ) : null}
      </svg>
    </div>
  );
};

// ── Page: the real GitHub screenshot, as evidence ────────────────────────────
const Page: React.FC<{ src?: string }> = ({ src }) => {
  const f = useCurrentFrame();
  const p = L.page;
  if (!src) return null;
  return (
    <div style={{ position: "absolute", left: p.x, top: p.y, width: p.w, height: p.h, overflow: "hidden", borderRadius: 10, border: `1px solid ${C.line2}`, background: "#fff", opacity: seg(f, B.pageIn, B.pageIn + 20) }}>
      <Img src={asset(src)} style={{ width: p.w, display: "block" }} />
    </div>
  );
};

// ── Wall: over 5,000 models published — one square per model ─────────────────
const Wall: React.FC = () => {
  const f = useCurrentFrame();
  const w = L.wall;
  const pitch = w.cell + w.gap;
  const W = w.cols * pitch - w.gap, H = w.rows * pitch - w.gap;
  const total = w.cols * w.rows; // 5,000
  const n = Math.round(interpolate(f, [B.countStart, B.countEnd], [0, total], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) }));
  const full = Math.floor(n / w.cols), rem = n % w.cols;
  const show = f >= B.countStart;
  const done = n >= total;
  return (
    <>
      <div style={{ position: "absolute", left: L.counter.x, top: L.counter.y, opacity: show ? 1 : 0, width: W }}>
        <div style={{ fontFamily: F2.sans, fontWeight: 800, fontSize: 190, lineHeight: 1, letterSpacing: "-0.05em", color: C.text, fontVariantNumeric: "tabular-nums" }}>
          {n.toLocaleString("en-US")}
          <span style={{ opacity: done ? 1 : 0 }}>+</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 14, fontFamily: F2.mono, fontSize: 30, color: C.dim, letterSpacing: "0.02em" }}>
          <span>models published with it</span>
          <span style={{ color: C.faint, fontSize: 24 }}>one square = one model</span>
        </div>
      </div>
      <svg width={W} height={H} style={{ position: "absolute", left: w.x, top: w.y }}>
        <defs>
          <pattern id="wall-full" width={pitch} height={pitch} patternUnits="userSpaceOnUse">
            <rect width={w.cell} height={w.cell} fill="#D9D9DC" />
          </pattern>
        </defs>
        {full > 0 ? <rect width={W} height={full * pitch} fill="url(#wall-full)" /> : null}
        {rem > 0 ? <rect y={full * pitch} width={rem * pitch} height={w.cell} fill="url(#wall-full)" /> : null}
      </svg>
    </>
  );
};

// ── URL: where to get it — types in as the camera pulls out ──────────────────
const Url: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const text = "github.com/p-e-w/heretic";
  const s = typed(text, f, B.urlStart, 44, fps);
  return (
    <div style={{ position: "absolute", left: L.url.x, top: L.url.y, width: L.url.w, textAlign: "center", fontFamily: F2.mono, fontSize: 100, fontWeight: 600, letterSpacing: "-0.02em", color: C.text, whiteSpace: "pre" }}>
      {s}
      {f >= B.urlStart && s.length < text.length ? <span style={{ display: "inline-block", width: 44, height: 90, background: C.text, verticalAlign: -10 }} /> : null}
    </div>
  );
};

// ── the world + camera ────────────────────────────────────────────────────────
const World: React.FC<{ shot?: string }> = ({ shot }) => {
  const f = useCurrentFrame();
  const { fx, fy, z } = camera(f);
  return (
    <AbsoluteFill style={{ background: C.bg, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: WORLD.w,
          height: WORLD.h,
          transformOrigin: "0 0",
          transform: `translate(${ANCHOR.x - fx * z}px, ${ANCHOR.y - fy * z}px) scale(${z})`,
          background: C.bg,
        }}
      >
        <Identity />
        <Terminal />
        <Connector />
        <Mechanism />
        <Page src={shot} />
        <Wall />
        <Url />
      </div>
    </AbsoluteFill>
  );
};

export const HereticWorld: React.FC<HereticWorldData> = ({ videoSrc, captions, accent, music, sfx, voiceBoost, shot }) => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const f = (ms: number) => Math.round((ms / 1000) * fps);
  useGeistFonts();

  // world visibility: the cutaway windows, 3-frame fades at the outer edges (as AutoReel does)
  // the last window is held to the very end (stable end hold, clean cut — no face flash)
  let op = 0;
  const FADE = 3;
  WINDOWS_MS.forEach(([a, b], i) => {
    const from = f(a);
    const last = i === WINDOWS_MS.length - 1;
    const to = last ? Number.POSITIVE_INFINITY : f(b);
    if (frame < from || frame >= to) return;
    op = 1;
    if (frame < from + FADE) op = (frame - from + 1) / (FADE + 1);
    else if (!last && frame >= to - FADE) op = (to - frame) / (FADE + 1);
  });

  return (
    <AccentProvider value={resolveAccent(accent)}>
      <AbsoluteFill style={{ background: C.bg }}>
        {videoSrc ? (
          <OffthreadVideo src={asset(videoSrc)} volume={voiceBoost ?? 1} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : null}

        {op > 0 ? (
          <AbsoluteFill style={{ opacity: clamp01(op) }}>
            <World shot={shot} />
          </AbsoluteFill>
        ) : null}

        {/* audio — verbatim from AutoReel */}
        {music ? <Audio src={asset(music)} volume={0.32} loop /> : null}
        {(sfx ?? []).map((s, i) => (
          <Sequence key={`sfx${i}`} from={f(s.atMs)} durationInFrames={Math.round(1.6 * fps)} layout="none">
            <Audio src={asset(s.file)} volume={s.volume ?? 0.16} trimBefore={f(s.trimBeforeMs ?? 0)} />
          </Sequence>
        ))}

        <Caption2 words={captions} timeMs={(frame / fps) * 1000} />
      </AbsoluteFill>
    </AccentProvider>
  );
};
