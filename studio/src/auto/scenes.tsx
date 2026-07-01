import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  Easing,
} from "remotion";
import { S, SF } from "../reel_cursor/skin";

// ─────────────────────────────────────────────────────────────────────────────
// Bespoke, animated, PARAMETRIC motion-graphic scenes. Nothing is hardcoded to a
// topic — the director fills every scene with the actual words/numbers of the reel.
// Everything moves (springs, staggers, counters, typing, drifting bg) so no frame
// is dead. Design system = skin.ts (cream paper, terracotta #C0532F, dark, serif+grotesk).
// ─────────────────────────────────────────────────────────────────────────────

export type Bg = "paper" | "warm" | "dark" | "cream";

const asset = (s: string) => (s.startsWith("http") ? s : staticFile(s));
const spr = (frame: number, fps: number, delay = 0, cfg = {}) =>
  spring({ frame: frame - delay, fps, config: { damping: 22, stiffness: 130, mass: 0.9, ...cfg } });

// ── animated backgrounds ─────────────────────────────────────────────────────
const Drift: React.FC<{ children?: React.ReactNode; hue: string; hue2: string }> = ({ children, hue, hue2 }) => {
  const f = useCurrentFrame();
  const x = Math.sin(f / 90) * 40;
  const y = Math.cos(f / 110) * 40;
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <div style={{ position: "absolute", width: 1400, height: 1400, left: -200 + x, top: -300 + y, borderRadius: "50%", background: hue, filter: "blur(120px)", opacity: 0.55 }} />
      <div style={{ position: "absolute", width: 1200, height: 1200, right: -260 - x, bottom: -260 - y, borderRadius: "50%", background: hue2, filter: "blur(130px)", opacity: 0.5 }} />
      {children}
    </AbsoluteFill>
  );
};

export const SceneBg: React.FC<{ bg?: Bg; children: React.ReactNode }> = ({ bg = "paper", children }) => {
  const dots = (
    <AbsoluteFill style={{ backgroundImage: "radial-gradient(rgba(26,25,23,0.10) 2.2px, transparent 2.2px)", backgroundSize: "46px 46px", opacity: 0.9 }} />
  );
  if (bg === "dark")
    return (
      <AbsoluteFill style={{ background: "#0B0A09" }}>
        <Drift hue="rgba(192,83,47,0.55)" hue2="rgba(40,36,32,0.9)" />
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: "70px 80px 360px" }}>{children}</AbsoluteFill>
      </AbsoluteFill>
    );
  if (bg === "warm")
    return (
      <AbsoluteFill style={{ background: "linear-gradient(160deg,#C0532F,#8f3d22)" }}>
        <Drift hue="rgba(255,180,120,0.4)" hue2="rgba(120,40,20,0.6)" />
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: "70px 80px 360px" }}>{children}</AbsoluteFill>
      </AbsoluteFill>
    );
  // paper / cream
  return (
    <AbsoluteFill style={{ background: bg === "cream" ? "#F2EEE6" : S.paper }}>
      {dots}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: "70px 80px 360px" }}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};

// ── kinetic headline: words spring in one-by-one, one word can be terracotta-boxed
export const Headline: React.FC<{ text: string; emphasis?: string; bg?: Bg }> = ({ text, emphasis, bg = "paper" }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = text.split(" ");
  const onDark = bg === "dark" || bg === "warm";
  // adaptive size so a 4–6 word hook reads as a clean 1–2 lines, not a jagged stack
  const size = Math.max(74, Math.min(132, Math.round(1850 / Math.max(text.length, 9))));
  return (
    <SceneBg bg={bg}>
      <div style={{ textAlign: "center", maxWidth: 980, lineHeight: 1.05 }}>
        {words.map((w, i) => {
          const e = spr(f, fps, 3 + i * 3, { damping: 18 });
          const isEmph = emphasis && w.toLowerCase().replace(/[^a-z0-9]/g, "") === emphasis.toLowerCase().replace(/[^a-z0-9]/g, "");
          return (
            <span
              key={i}
              style={{
                display: "inline-block",
                margin: "4px 10px",
                fontFamily: SF.display,
                fontWeight: 700,
                fontSize: size,
                letterSpacing: "-0.02em",
                color: isEmph ? S.white : onDark ? S.white : S.ink,
                background: isEmph ? S.rust : "transparent",
                borderRadius: 16,
                padding: isEmph ? "0 22px" : 0,
                opacity: e,
                transform: `translateY(${interpolate(e, [0, 1], [46, 0])}px) rotate(${interpolate(e, [0, 1], [4, 0])}deg)`,
              }}
            >
              {w}
            </span>
          );
        })}
      </div>
    </SceneBg>
  );
};

// ── giant number that counts up (stat reveal) ────────────────────────────────
export const Stat: React.FC<{ value: string; sub?: string; kicker?: string; bg?: Bg }> = ({ value, sub, kicker, bg = "dark" }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const onDark = bg === "dark" || bg === "warm";
  const m = value.match(/^([^\d]*)([\d.,]+)(.*)$/);
  const t = interpolate(f, [4, 26], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  let shown = value;
  if (m) {
    const num = parseFloat(m[2].replace(/,/g, ""));
    const dec = (m[2].split(".")[1] || "").length;
    shown = m[1] + (num * t).toFixed(dec) + m[3];
  }
  const e = spr(f, fps, 0, { damping: 16 });
  return (
    <SceneBg bg={bg}>
      <div style={{ textAlign: "center", transform: `scale(${interpolate(e, [0, 1], [0.8, 1])})` }}>
        {kicker ? <div style={{ fontFamily: SF.body, fontWeight: 700, fontSize: 34, letterSpacing: "0.18em", textTransform: "uppercase", color: S.rust, marginBottom: 26 }}>{kicker}</div> : null}
        <div style={{ fontFamily: SF.display, fontWeight: 700, fontSize: 320, lineHeight: 0.9, color: onDark ? S.white : S.ink, letterSpacing: "-0.04em" }}>
          {shown}
        </div>
        {sub ? <div style={{ fontFamily: SF.serif, fontStyle: "italic", fontWeight: 600, fontSize: 66, color: onDark ? S.whiteDim : S.inkSoft, marginTop: 24 }}>{sub}</div> : null}
      </div>
    </SceneBg>
  );
};

// ── animated comparison bars (parametric rows) ───────────────────────────────
export const Compare: React.FC<{ title?: string; unit?: string; rows: { label: string; value: number; note?: string; highlight?: boolean }[]; bg?: Bg }> = ({ title, unit, rows, bg = "paper" }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const max = Math.max(...rows.map((r) => r.value), 1);
  const onDark = bg === "dark" || bg === "warm";
  return (
    <SceneBg bg={bg}>
      <div style={{ width: "100%", maxWidth: 900 }}>
        {title ? <div style={{ fontFamily: SF.body, fontWeight: 700, fontSize: 34, letterSpacing: "0.14em", textTransform: "uppercase", color: S.rust, marginBottom: 44, textAlign: "center" }}>{title}</div> : null}
        {rows.map((r, i) => {
          const e = spr(f, fps, 6 + i * 7, { damping: 200 });
          const w = interpolate(e, [0, 1], [0, (r.value / max) * 100]);
          const shownVal = (r.value * interpolate(e, [0, 1], [0, 1])).toFixed(Number.isInteger(r.value) ? 0 : 1);
          return (
            <div key={i} style={{ marginBottom: 40 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
                <span style={{ fontFamily: SF.display, fontWeight: 700, fontSize: 46, color: r.highlight ? S.rust : onDark ? S.white : S.ink }}>{r.label}</span>
                <span style={{ fontFamily: SF.display, fontWeight: 700, fontSize: 46, color: r.highlight ? S.rust : onDark ? S.whiteDim : S.inkSoft }}>{unit === "$" || unit === "€" || unit === "£" ? `${unit}${shownVal}` : `${shownVal}${unit || ""}`}</span>
              </div>
              <div style={{ height: 40, borderRadius: 12, background: onDark ? "rgba(255,255,255,0.10)" : "rgba(26,25,23,0.07)", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${w}%`, borderRadius: 12, background: r.highlight ? `linear-gradient(90deg,#C0532F,#e0703f)` : onDark ? "rgba(255,255,255,0.35)" : "rgba(26,25,23,0.30)" }} />
              </div>
            </div>
          );
        })}
      </div>
    </SceneBg>
  );
};

// ── code / terminal window that TYPES OUT its lines ──────────────────────────
export const Terminal: React.FC<{ title?: string; lines: string[]; bg?: Bg }> = ({ title, lines, bg = "warm" }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const e = spr(f, fps, 0, { damping: 18 });
  const CPS = 42; // chars/sec typing speed
  const chars = Math.floor((f / fps) * CPS);
  // reveal cumulatively across the lines
  let budget = chars;
  const rendered = lines.map((l) => {
    const take = Math.max(0, Math.min(l.length, budget));
    budget -= l.length + 1;
    return l.slice(0, take);
  });
  const activeLine = rendered.findIndex((r, i) => r.length < lines[i].length);
  return (
    <SceneBg bg={bg}>
      <div style={{ width: 900, borderRadius: 26, overflow: "hidden", background: "#151316", boxShadow: "0 50px 130px rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.08)", transform: `translateY(${interpolate(e, [0, 1], [40, 0])}px) scale(${interpolate(e, [0, 1], [0.94, 1])})`, opacity: e }}>
        <div style={{ height: 58, background: "#211d1a", display: "flex", alignItems: "center", gap: 11, padding: "0 24px" }}>
          <div style={{ width: 15, height: 15, borderRadius: 8, background: "#ff5f57" }} />
          <div style={{ width: 15, height: 15, borderRadius: 8, background: "#febc2e" }} />
          <div style={{ width: 15, height: 15, borderRadius: 8, background: "#28c840" }} />
          {title ? <span style={{ marginLeft: 16, fontFamily: SF.mono, fontSize: 24, color: "rgba(255,255,255,0.5)" }}>{title}</span> : null}
        </div>
        <div style={{ padding: "36px 40px", minHeight: 360 }}>
          {rendered.map((r, i) => (
            <div key={i} style={{ fontFamily: SF.mono, fontSize: 34, lineHeight: 1.6, color: i === 0 ? "#8fe6a4" : "rgba(255,255,255,0.9)", whiteSpace: "pre-wrap" }}>
              <span style={{ color: "rgba(255,255,255,0.3)" }}>{i === 0 ? "$ " : "  "}</span>
              {r}
              {i === activeLine ? <span style={{ opacity: Math.floor(f / 8) % 2 ? 1 : 0, color: S.rust }}>▋</span> : null}
            </div>
          ))}
        </div>
      </div>
    </SceneBg>
  );
};

// ── sequential bullet points with terracotta ticks ───────────────────────────
export const Points: React.FC<{ title?: string; items: string[]; bg?: Bg }> = ({ title, items, bg = "cream" }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const onDark = bg === "dark" || bg === "warm";
  return (
    <SceneBg bg={bg}>
      <div style={{ width: "100%", maxWidth: 880 }}>
        {title ? <div style={{ fontFamily: SF.serif, fontStyle: "italic", fontWeight: 700, fontSize: 76, color: onDark ? S.white : S.ink, marginBottom: 48 }}>{title}</div> : null}
        {items.map((it, i) => {
          const e = spr(f, fps, 8 + i * 10, { damping: 18 });
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 28, marginBottom: 34, opacity: e, transform: `translateX(${interpolate(e, [0, 1], [-40, 0])}px)` }}>
              <div style={{ minWidth: 56, width: 56, height: 56, borderRadius: 18, background: onDark ? S.white : S.rust, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: onDark ? "0 10px 24px -8px rgba(0,0,0,0.4)" : "0 10px 24px -8px rgba(192,83,47,0.7)" }}>
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={onDark ? S.rust : "#fff"} strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
              </div>
              <span style={{ fontFamily: SF.display, fontWeight: 600, fontSize: 52, color: onDark ? S.white : S.ink, lineHeight: 1.1 }}>{it}</span>
            </div>
          );
        })}
      </div>
    </SceneBg>
  );
};

// ── big serif statement with a boxed emphasis word ───────────────────────────
export const Quote: React.FC<{ pre: string; boxed: string; post?: string; bg?: Bg }> = ({ pre, boxed, post, bg = "paper" }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const e = spr(f, fps, 0);
  const onDark = bg === "dark" || bg === "warm";
  return (
    <SceneBg bg={bg}>
      <div style={{ textAlign: "center", maxWidth: 950, opacity: e, transform: `translateY(${interpolate(e, [0, 1], [30, 0])}px)` }}>
        <span style={{ fontFamily: SF.serif, fontStyle: "italic", fontWeight: 700, fontSize: 116, lineHeight: 1.08, color: onDark ? S.white : S.ink }}>
          {pre}{" "}
          <span style={{ background: S.rust, color: S.white, borderRadius: 14, padding: "0 18px", display: "inline-block", transform: `rotate(${interpolate(e, [0, 1], [-3, -1.2])}deg)` }}>{boxed}</span>
          {post ? ` ${post}` : ""}
        </span>
      </div>
    </SceneBg>
  );
};

// ── full-screen punchy callout, word-by-word ─────────────────────────────────
export const Callout: React.FC<{ text: string; bg?: Bg }> = ({ text, bg = "warm" }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = text.split(" ");
  const onDark = bg === "dark" || bg === "warm";
  const size = Math.max(80, Math.min(128, Math.round(1700 / Math.max(text.length, 8))));
  return (
    <SceneBg bg={bg}>
      <div style={{ textAlign: "center", maxWidth: 960 }}>
        {words.map((w, i) => {
          const e = spr(f, fps, 2 + i * 4, { damping: 16, stiffness: 160 });
          return (
            <span key={i} style={{ display: "inline-block", margin: "4px 12px", fontFamily: SF.display, fontWeight: 700, fontSize: size, letterSpacing: "-0.02em", color: onDark ? S.white : S.ink, opacity: e, transform: `scale(${interpolate(e, [0, 1], [0.5, 1])})` }}>{w}</span>
          );
        })}
      </div>
    </SceneBg>
  );
};

// ── real website/product screenshot in a rounded browser frame ───────────────
export const Screenshot: React.FC<{ src: string; label?: string }> = ({ src, label }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const e = spr(f, fps, 0, { damping: 200 });
  return (
    <SceneBg bg="dark">
      <div style={{ transform: `translateY(${interpolate(e, [0, 1], [40, 0])}px) scale(${interpolate(e, [0, 1], [0.92, 1])})`, width: 940, borderRadius: 30, overflow: "hidden", background: "#fff", boxShadow: "0 50px 130px rgba(0,0,0,0.55)" }}>
        <div style={{ height: 62, background: "#ecebe6", display: "flex", alignItems: "center", gap: 11, padding: "0 26px" }}>
          <div style={{ width: 17, height: 17, borderRadius: 9, background: "#ff5f57" }} />
          <div style={{ width: 17, height: 17, borderRadius: 9, background: "#febc2e" }} />
          <div style={{ width: 17, height: 17, borderRadius: 9, background: "#28c840" }} />
          {label ? <div style={{ marginLeft: 18, padding: "7px 20px", background: "#fff", borderRadius: 999, fontFamily: SF.body, fontWeight: 600, fontSize: 23, color: "#666" }}>{label}</div> : null}
        </div>
        <div style={{ height: 1040, overflow: "hidden" }}>
          <Img src={asset(src)} style={{ width: "100%", display: "block" }} />
        </div>
      </div>
    </SceneBg>
  );
};
