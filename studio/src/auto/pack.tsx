import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig, Easing } from "remotion";
import { S, SF } from "../reel_cursor/skin";
import { SceneBg, type Bg } from "./scenes";
import { Logo, hasLogo } from "./logos";

// Visual-heavy component pack — real logos, charts, cards, device mocks. Same design language
// as scenes.tsx (skin.ts), spring motion. The director fills them with the reel's real content.

const asset = (s: string) => (s.startsWith("http") ? s : staticFile(s));
const spr = (frame: number, fps: number, delay = 0, cfg = {}) =>
  spring({ frame: frame - delay, fps, config: { damping: 22, stiffness: 130, mass: 0.9, ...cfg } });
const onDarkBg = (bg?: Bg) => bg === "dark" || bg === "warm";

// ── big real-logo drop ───────────────────────────────────────────────────────
export const LogoDrop: React.FC<{ name: string; tagline?: string; src?: string; bg?: Bg }> = ({ name, tagline, src, bg = "dark" }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const e = spr(f, fps, 0, { damping: 18 });
  const dark = onDarkBg(bg);
  const has = hasLogo(name);
  const size = Math.max(78, Math.min(160, Math.round(1500 / Math.max(name.length, 7))));
  return (
    <SceneBg bg={bg}>
      <div style={{ textAlign: "center", transform: `scale(${interpolate(e, [0, 1], [0.8, 1])})`, opacity: e }}>
        {/* real logo (or a screenshot) above the name — skip when there's neither, so the name isn't shown twice */}
        {src || has ? (
          <div style={{ marginBottom: 40, display: "flex", justifyContent: "center" }}>
            {src ? (
              <Img src={asset(src)} style={{ width: 190, height: 190, borderRadius: 44, objectFit: "cover", boxShadow: "0 30px 80px rgba(0,0,0,0.5)" }} />
            ) : (
              <Logo name={name} size={210} color={dark ? "#fff" : undefined} />
            )}
          </div>
        ) : null}
        <div style={{ fontFamily: SF.display, fontWeight: 700, fontSize: size, letterSpacing: "-0.03em", color: dark ? S.white : S.ink, whiteSpace: "nowrap" }}>{name}</div>
        {tagline ? <div style={{ fontFamily: SF.serif, fontStyle: "italic", fontSize: 56, color: dark ? S.whiteDim : S.inkSoft, marginTop: 16 }}>{tagline}</div> : null}
      </div>
    </SceneBg>
  );
};

// ── wall/grid of real brand logos (the whole industry) ───────────────────────
export const LogoWall: React.FC<{ title?: string; brands: string[]; bg?: Bg }> = ({ title, brands, bg = "dark" }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const dark = onDarkBg(bg);
  const cols = brands.length <= 4 ? 2 : 3;
  return (
    <SceneBg bg={bg}>
      <div style={{ width: "100%", maxWidth: 900 }}>
        {title ? <div style={{ fontFamily: SF.serif, fontStyle: "italic", fontWeight: 700, fontSize: 68, color: dark ? S.white : S.ink, textAlign: "center", marginBottom: 56 }}>{title}</div> : null}
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols},1fr)`, gap: 30 }}>
          {brands.slice(0, 9).map((b, i) => {
            const e = spr(f, fps, 6 + i * 5, { damping: 16 });
            return (
              <div key={i} style={{ height: 200, borderRadius: 28, background: dark ? "rgba(255,255,255,0.06)" : "#fff", border: `1px solid ${dark ? "rgba(255,255,255,0.10)" : S.border}`, boxShadow: dark ? "none" : "0 18px 44px -26px rgba(26,25,23,0.5)", display: "flex", alignItems: "center", justifyContent: "center", opacity: e, transform: `translateY(${interpolate(e, [0, 1], [30, 0])}px) scale(${interpolate(e, [0, 1], [0.85, 1])})` }}>
                <Logo name={b} size={96} color={dark ? "#fff" : undefined} />
              </div>
            );
          })}
        </div>
      </div>
    </SceneBg>
  );
};

// ── head-to-head VS (two real logos) ─────────────────────────────────────────
export const Versus: React.FC<{ a: string; b: string; aNote?: string; bNote?: string; bg?: Bg }> = ({ a, b, aNote, bNote, bg = "dark" }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const dark = onDarkBg(bg);
  const eA = spr(f, fps, 2, { damping: 18 });
  const eB = spr(f, fps, 8, { damping: 18 });
  const eV = spr(f, fps, 14, { damping: 12, stiffness: 180 });
  const card = (name: string, note: string | undefined, e: number, from: number) => {
    const has = hasLogo(name);
    return (
      <div style={{ flex: 1, textAlign: "center", opacity: e, transform: `translateX(${interpolate(e, [0, 1], [from, 0])}px)` }}>
        {has ? <div style={{ marginBottom: 22 }}><Logo name={name} size={150} color={dark ? "#fff" : undefined} /></div> : null}
        <div style={{ fontFamily: SF.display, fontWeight: 700, fontSize: has ? 52 : 62, color: dark ? S.white : S.ink, letterSpacing: "-0.02em" }}>{name}</div>
        {note ? <div style={{ fontFamily: SF.display, fontWeight: 700, fontSize: 44, color: dark ? S.white : S.rust, marginTop: 10 }}>{note}</div> : null}
      </div>
    );
  };
  return (
    <SceneBg bg={bg}>
      <div style={{ width: "100%", maxWidth: 940, display: "flex", alignItems: "center", gap: 20 }}>
        {card(a, aNote, eA, -80)}
        <div style={{ fontFamily: SF.serif, fontStyle: "italic", fontWeight: 700, fontSize: 88, color: dark ? S.white : S.rust, transform: `scale(${eV})`, flexShrink: 0 }}>vs</div>
        {card(b, bNote, eB, 80)}
      </div>
    </SceneBg>
  );
};

// ── animated area+line chart (a trend going up) ──────────────────────────────
export const LineChart: React.FC<{ title?: string; values: number[]; caption?: string; bg?: Bg }> = ({ title, values, caption, bg = "dark" }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const dark = onDarkBg(bg);
  const W = 900, H = 520, pad = 20;
  const vals = values.length ? values : [1, 2, 3];
  const max = Math.max(...vals), min = Math.min(...vals, 0);
  const pts = vals.map((v, i) => {
    const x = pad + (i / (vals.length - 1)) * (W - pad * 2);
    const y = H - pad - ((v - min) / (max - min || 1)) * (H - pad * 2);
    return [x, y] as const;
  });
  const line = pts.map((p, i) => (i ? "L" : "M") + p[0] + " " + p[1]).join(" ");
  const area = `${line} L ${pts[pts.length - 1][0]} ${H - pad} L ${pts[0][0]} ${H - pad} Z`;
  const draw = interpolate(f, [4, 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const last = pts[pts.length - 1];
  return (
    <SceneBg bg={bg}>
      <div style={{ width: "100%", maxWidth: 900 }}>
        {title ? <div style={{ fontFamily: SF.body, fontWeight: 700, fontSize: 34, letterSpacing: "0.14em", textTransform: "uppercase", color: S.rust, marginBottom: 30, textAlign: "center" }}>{title}</div> : null}
        <svg width="100%" viewBox={`0 0 ${W} ${H}`}>
          <defs>
            <linearGradient id="lc" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#C0532F" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#C0532F" stopOpacity="0" />
            </linearGradient>
            <clipPath id="reveal"><rect x="0" y="0" width={draw * W} height={H} /></clipPath>
          </defs>
          <g clipPath="url(#reveal)">
            <path d={area} fill="url(#lc)" />
            <path d={line} fill="none" stroke="#C0532F" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
          </g>
          {draw > 0.98 ? <circle cx={last[0]} cy={last[1]} r="14" fill="#C0532F" stroke={dark ? "#0B0A09" : "#fff"} strokeWidth="5" /> : null}
        </svg>
        {caption ? <div style={{ fontFamily: SF.display, fontWeight: 700, fontSize: 46, color: dark ? S.white : S.ink, textAlign: "center", marginTop: 26 }}>{caption}</div> : null}
      </div>
    </SceneBg>
  );
};

// ── vertical bar chart ───────────────────────────────────────────────────────
export const BarChart: React.FC<{ title?: string; unit?: string; rows: { label: string; value: number; highlight?: boolean }[]; bg?: Bg }> = ({ title, unit, rows, bg = "paper" }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const dark = onDarkBg(bg);
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <SceneBg bg={bg}>
      <div style={{ width: "100%", maxWidth: 880 }}>
        {title ? <div style={{ fontFamily: SF.body, fontWeight: 700, fontSize: 34, letterSpacing: "0.14em", textTransform: "uppercase", color: S.rust, marginBottom: 44, textAlign: "center" }}>{title}</div> : null}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 40, height: 560 }}>
          {rows.map((r, i) => {
            const e = spr(f, fps, 6 + i * 8, { damping: 200 });
            const h = interpolate(e, [0, 1], [0, (r.value / max) * 460]);
            const shown = (r.value * interpolate(e, [0, 1], [0, 1])).toFixed(Number.isInteger(r.value) ? 0 : 1);
            return (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, maxWidth: 200 }}>
                <div style={{ fontFamily: SF.display, fontWeight: 700, fontSize: 44, color: r.highlight ? S.rust : dark ? S.white : S.ink, marginBottom: 12 }}>{unit === "$" ? unit : ""}{shown}{unit && unit !== "$" ? unit : ""}</div>
                <div style={{ width: "100%", height: h, borderRadius: "16px 16px 4px 4px", background: r.highlight ? "linear-gradient(180deg,#e0703f,#C0532F)" : dark ? "rgba(255,255,255,0.28)" : "rgba(26,25,23,0.24)" }} />
                <div style={{ fontFamily: SF.body, fontWeight: 600, fontSize: 32, color: dark ? S.whiteDim : S.inkSoft, marginTop: 18, textAlign: "center" }}>{r.label}</div>
              </div>
            );
          })}
        </div>
      </div>
    </SceneBg>
  );
};

// ── donut ring with a big % in the center ────────────────────────────────────
export const Donut: React.FC<{ percent: number; label?: string; kicker?: string; bg?: Bg }> = ({ percent, label, kicker, bg = "dark" }) => {
  const f = useCurrentFrame();
  const dark = onDarkBg(bg);
  const R = 190, C = 2 * Math.PI * R;
  const p = interpolate(f, [4, 40], [0, Math.max(0, Math.min(100, percent))], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  return (
    <SceneBg bg={bg}>
      <div style={{ textAlign: "center" }}>
        {kicker ? <div style={{ fontFamily: SF.body, fontWeight: 700, fontSize: 32, letterSpacing: "0.18em", textTransform: "uppercase", color: S.rust, marginBottom: 30 }}>{kicker}</div> : null}
        <div style={{ position: "relative", width: 460, height: 460, margin: "0 auto" }}>
          <svg width="460" height="460" style={{ transform: "rotate(-90deg)" }}>
            <circle cx="230" cy="230" r={R} fill="none" stroke={dark ? "rgba(255,255,255,0.12)" : "rgba(26,25,23,0.10)"} strokeWidth="34" />
            <circle cx="230" cy="230" r={R} fill="none" stroke="#C0532F" strokeWidth="34" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - p / 100)} />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <div style={{ fontFamily: SF.display, fontWeight: 700, fontSize: 150, color: dark ? S.white : S.ink, lineHeight: 1 }}>{Math.round(p)}%</div>
          </div>
        </div>
        {label ? <div style={{ fontFamily: SF.serif, fontStyle: "italic", fontSize: 56, color: dark ? S.whiteDim : S.inkSoft, marginTop: 30 }}>{label}</div> : null}
      </div>
    </SceneBg>
  );
};

// ── row of a few big numbers ─────────────────────────────────────────────────
export const StatGrid: React.FC<{ items: { value: string; label: string }[]; bg?: Bg }> = ({ items, bg = "dark" }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const dark = onDarkBg(bg);
  return (
    <SceneBg bg={bg}>
      <div style={{ display: "flex", gap: 30, width: "100%", maxWidth: 940, justifyContent: "center" }}>
        {items.slice(0, 3).map((it, i) => {
          const e = spr(f, fps, 4 + i * 9, { damping: 18 });
          return (
            <div key={i} style={{ flex: 1, textAlign: "center", padding: "40px 20px", borderRadius: 30, background: dark ? "rgba(255,255,255,0.05)" : "#fff", border: `1px solid ${dark ? "rgba(255,255,255,0.10)" : S.border}`, opacity: e, transform: `translateY(${interpolate(e, [0, 1], [36, 0])}px)` }}>
              <div style={{ fontFamily: SF.display, fontWeight: 700, fontSize: 108, color: S.rust, lineHeight: 1, letterSpacing: "-0.03em" }}>{it.value}</div>
              <div style={{ fontFamily: SF.body, fontWeight: 600, fontSize: 32, color: dark ? S.whiteDim : S.inkSoft, marginTop: 18, lineHeight: 1.2 }}>{it.label}</div>
            </div>
          );
        })}
      </div>
    </SceneBg>
  );
};

// ── realistic X / tweet card ─────────────────────────────────────────────────
export const TweetCard: React.FC<{ name: string; handle: string; text: string; brand?: string; bg?: Bg }> = ({ name, handle, text, brand, bg = "dark" }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const e = spr(f, fps, 0, { damping: 18 });
  return (
    <SceneBg bg={bg}>
      <div style={{ width: 900, background: "#fff", borderRadius: 34, padding: "44px 46px", boxShadow: "0 50px 130px rgba(0,0,0,0.5)", opacity: e, transform: `translateY(${interpolate(e, [0, 1], [40, 0])}px) scale(${interpolate(e, [0, 1], [0.94, 1])})` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 28 }}>
          <div style={{ width: 92, height: 92, borderRadius: "50%", background: brand ? "#f2efe9" : "linear-gradient(135deg,#C0532F,#e0703f)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
            {brand ? <Logo name={brand} size={54} /> : <span style={{ fontFamily: SF.display, fontWeight: 700, fontSize: 44, color: "#fff" }}>{name.slice(0, 1)}</span>}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontFamily: SF.display, fontWeight: 700, fontSize: 40, color: "#0f1419" }}>{name}</span>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="#1d9bf0"><path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.416-.164-.865-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.084.964.238 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.622 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484zm-6.616-3.334l-4.334 6.5c-.145.217-.382.334-.625.334-.143 0-.288-.04-.416-.126l-.115-.094-2.415-2.415c-.293-.293-.293-.768 0-1.06s.768-.294 1.06 0l1.77 1.767 3.825-5.74c.23-.345.696-.436 1.04-.207.346.23.44.696.21 1.04z" /></svg>
            </div>
            <span style={{ fontFamily: SF.body, fontSize: 32, color: "#536471" }}>@{handle}</span>
          </div>
          <svg width="42" height="42" viewBox="0 0 24 24" fill="#0f1419"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
        </div>
        <div style={{ fontFamily: SF.body, fontWeight: 500, fontSize: 46, lineHeight: 1.35, color: "#0f1419" }}>{text}</div>
      </div>
    </SceneBg>
  );
};

// ── screenshot inside a phone frame ──────────────────────────────────────────
export const PhoneMock: React.FC<{ src?: string; label?: string; bg?: Bg }> = ({ src, label, bg = "warm" }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const e = spr(f, fps, 0, { damping: 200 });
  return (
    <SceneBg bg={bg}>
      <div style={{ transform: `translateY(${interpolate(e, [0, 1], [50, 0])}px) scale(${interpolate(e, [0, 1], [0.9, 1])})` }}>
        <div style={{ width: 520, height: 1060, borderRadius: 70, background: "#0b0b0c", padding: 16, boxShadow: "0 60px 150px rgba(0,0,0,0.6)", border: "2px solid #2a2a2e" }}>
          <div style={{ width: "100%", height: "100%", borderRadius: 56, overflow: "hidden", background: "#fff", position: "relative" }}>
            <div style={{ position: "absolute", top: 18, left: "50%", transform: "translateX(-50%)", width: 150, height: 34, background: "#0b0b0c", borderRadius: 20, zIndex: 2 }} />
            {src ? <Img src={asset(src)} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} /> : <div style={{ width: "100%", height: "100%", background: "linear-gradient(160deg,#f2efe9,#e6e1d6)" }} />}
          </div>
        </div>
        {label ? <div style={{ fontFamily: SF.body, fontWeight: 600, fontSize: 34, color: "#fff", textAlign: "center", marginTop: 30, opacity: 0.9 }}>{label}</div> : null}
      </div>
    </SceneBg>
  );
};

// ── 2x2 feature cards (each an icon/logo + label) ────────────────────────────
export const FeatureGrid: React.FC<{ title?: string; items: { label: string; brand?: string }[]; bg?: Bg }> = ({ title, items, bg = "cream" }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const dark = onDarkBg(bg);
  return (
    <SceneBg bg={bg}>
      <div style={{ width: "100%", maxWidth: 900 }}>
        {title ? <div style={{ fontFamily: SF.serif, fontStyle: "italic", fontWeight: 700, fontSize: 68, color: dark ? S.white : S.ink, marginBottom: 44, textAlign: "center" }}>{title}</div> : null}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28 }}>
          {items.slice(0, 4).map((it, i) => {
            const e = spr(f, fps, 6 + i * 8, { damping: 18 });
            return (
              <div key={i} style={{ padding: "40px 36px", borderRadius: 30, background: dark ? "rgba(255,255,255,0.06)" : "#fff", border: `1px solid ${dark ? "rgba(255,255,255,0.10)" : S.border}`, boxShadow: dark ? "none" : "0 18px 44px -28px rgba(26,25,23,0.5)", opacity: e, transform: `translateY(${interpolate(e, [0, 1], [30, 0])}px) scale(${interpolate(e, [0, 1], [0.9, 1])})` }}>
                <div style={{ width: 74, height: 74, borderRadius: 20, background: S.rustSoft, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 22 }}>
                  {it.brand ? <Logo name={it.brand} size={44} /> : <div style={{ width: 24, height: 24, borderRadius: 8, background: S.rust }} />}
                </div>
                <div style={{ fontFamily: SF.display, fontWeight: 600, fontSize: 42, color: dark ? S.white : S.ink, lineHeight: 1.12 }}>{it.label}</div>
              </div>
            );
          })}
        </div>
      </div>
    </SceneBg>
  );
};
