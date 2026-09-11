import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { F2, T, useAccent } from "./theme";
import { Kicker, Panel, Scene } from "./fx";
import { Logo, hasLogo } from "./logos";

// ── tool-review scenes — the arc of "a tool people can actually use" ──────────
//   toolcard  → what it is          install → how you get it
//   runlog    → watching it work    beforeafter → what it replaces
//   catch     → the fine print      getit → where to find it
// Same contract as the rest of the kit: frame-deterministic (useCurrentFrame + springs,
// remotion random only), T tokens + ONE accent from context, content ≤ ~950px wide,
// everything inside <Scene> so it stays clear of the caption band.

const spr = (frame: number, fps: number, delay = 0, cfg = {}) =>
  spring({ frame: frame - delay, fps, config: { damping: 22, stiffness: 130, mass: 0.9, ...cfg } });

const Check: React.FC<{ size?: number; color: string; width?: number }> = ({ size = 24, color, width = 3.2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

const BrandBox: React.FC<{ brand?: string; letter?: string; size?: number; glow?: string }> = ({ brand, letter, size = 64, glow }) => (
  <div style={{ width: size, height: size, borderRadius: size * 0.28, background: T.surface2, border: `1px solid ${T.borderBright}`, boxShadow: glow ? `0 0 ${size * 0.6}px -${size * 0.12}px ${glow}, inset 0 1px 0 ${T.borderBright}` : `inset 0 1px 0 ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
    {brand && hasLogo(brand) ? (
      <Logo name={brand} size={size * 0.56} color="#fff" />
    ) : (
      <span style={{ fontFamily: F2.sans, fontWeight: 700, fontSize: size * 0.44, color: T.text }}>{(letter ?? brand ?? "?").slice(0, 1).toUpperCase()}</span>
    )}
  </div>
);

const Caret: React.FC<{ f: number }> = ({ f }) => {
  const a = useAccent();
  return <span style={{ color: a.hex, opacity: Math.floor(f / 8) % 2 ? 1 : 0 }}>▍</span>;
};

// deterministic spinner arc (rotation driven by the frame)
const Spinner: React.FC<{ f: number; size?: number; color: string }> = ({ f, size = 30, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ transform: `rotate(${(f * 22) % 360}deg)` }}>
    <circle cx="12" cy="12" r="9" stroke={T.border} strokeWidth="3" />
    <path d="M21 12a9 9 0 0 0-9-9" stroke={color} strokeWidth="3" strokeLinecap="round" />
  </svg>
);

// ── ToolCard — "what it is": the spec sheet at a glance ──────────────────────
// Logo pops, name + one-liner land, meta chips (platform / license / price) stagger in.
// Chips carry facts only (no invented numbers — a star count goes here only if real).
export const ToolCard: React.FC<{ name: string; tagline?: string; brand?: string; by?: string; chips?: string[] }> = ({ name, tagline, brand, by, chips = [] }) => {
  const a = useAccent();
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const e = spr(f, fps, 2, { damping: 18 });
  const le = spr(f, fps, 5, { damping: 13, stiffness: 190 });
  const ne = spr(f, fps, 9, { damping: 18 });
  const te = spr(f, fps, 13, { damping: 18 });
  const nameSize = Math.max(56, Math.min(92, Math.round(1250 / Math.max(name.length, 8))));
  return (
    <Scene bg="shader">
      <div style={{ width: "100%", maxWidth: 860, opacity: e, transform: `translateY(${interpolate(e, [0, 1], [40, 0])}px) scale(${interpolate(e, [0, 1], [0.95, 1])})` }}>
        <Panel glow style={{ padding: "56px 52px 50px", textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 34, opacity: le, transform: `scale(${interpolate(le, [0, 1], [0.5, 1])})` }}>
            <BrandBox brand={brand ?? name} letter={name} size={150} glow={a.glow} />
          </div>
          <div style={{ fontFamily: F2.sans, fontWeight: 700, fontSize: nameSize, letterSpacing: "-0.04em", lineHeight: 1.05, color: T.text, opacity: ne, transform: `translateY(${interpolate(ne, [0, 1], [18, 0])}px)` }}>{name}</div>
          {tagline ? (
            <div style={{ fontFamily: F2.sans, fontWeight: 500, fontSize: 34, lineHeight: 1.3, color: T.dim, marginTop: 16, opacity: te, transform: `translateY(${interpolate(te, [0, 1], [14, 0])}px)` }}>{tagline}</div>
          ) : null}
          {by ? (
            <div style={{ fontFamily: F2.mono, fontSize: 23, letterSpacing: "0.14em", textTransform: "uppercase", color: T.faint, marginTop: 20, opacity: te }}>by {by}</div>
          ) : null}
          {chips.length ? (
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 14, marginTop: 38 }}>
              {chips.slice(0, 5).map((c, i) => {
                const ce = spr(f, fps, 18 + i * 5, { damping: 16, stiffness: 170 });
                const hero = i === 0;
                return (
                  <span
                    key={i}
                    style={{
                      fontFamily: F2.mono, fontWeight: 600, fontSize: 24, letterSpacing: "0.06em",
                      padding: "12px 22px", borderRadius: 999,
                      background: hero ? a.soft : T.surface, border: `1px solid ${hero ? a.dim : T.borderBright}`,
                      color: hero ? a.hex : T.dim, boxShadow: hero ? `0 0 30px -8px ${a.glow}` : "none",
                      opacity: ce, transform: `translateY(${interpolate(ce, [0, 1], [16, 0])}px) scale(${interpolate(ce, [0, 1], [0.85, 1])})`,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {c}
                  </span>
                );
              })}
            </div>
          ) : null}
        </Panel>
      </div>
    </Scene>
  );
};

// ── Install — "how you get it": numbered steps, commands type themselves, ticks land ─
// Steps run strictly in sequence: a step's command types out, its ring turns into an accent
// check, then the next step wakes up. Steps without a command just tick after a beat.
export const Install: React.FC<{ title?: string; steps: { title: string; cmd?: string; sub?: string }[] }> = ({ title, steps }) => {
  const a = useAccent();
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ss = steps.slice(0, 4);
  const CPS = 40;
  // sequential schedule: [start, typingDone, ticked]
  const sched: { start: number; done: number; tick: number }[] = [];
  let cursor = 10;
  for (const s of ss) {
    const typeF = s.cmd ? Math.ceil((s.cmd.length / CPS) * fps) : 0;
    const start = cursor;
    const done = start + typeF;
    const tick = done + (s.cmd ? 8 : 12);
    sched.push({ start, done, tick });
    cursor = tick + 4;
  }
  const e = spr(f, fps, 2, { damping: 18 });
  return (
    <Scene bg="grid">
      <div style={{ width: "100%", maxWidth: 900, opacity: e, transform: `translateY(${interpolate(e, [0, 1], [36, 0])}px)` }}>
        {title ? <Kicker text={title} /> : null}
        <Panel style={{ padding: "14px 0" }}>
          {ss.map((s, i) => {
            const { start, tick } = sched[i];
            const re = spr(f, fps, 4 + i * 5, { damping: 20 });
            const active = f >= start && f < tick;
            const ticked = f >= tick;
            const te = spr(f, fps, tick, { damping: 12, stiffness: 220 });
            const typed = s.cmd ? s.cmd.slice(0, Math.max(0, Math.floor(((f - start) / fps) * CPS))) : "";
            const typing = s.cmd ? typed.length < s.cmd.length && f >= start : false;
            const dimmed = !active && !ticked;
            return (
              <div key={i} style={{ display: "flex", gap: 26, alignItems: "flex-start", padding: "26px 40px", borderBottom: i < ss.length - 1 ? `1px solid ${T.border}` : "none", opacity: re * (dimmed ? 0.45 : 1), transform: `translateX(${interpolate(re, [0, 1], [-24, 0])}px)` }}>
                <div style={{ position: "relative", width: 58, height: 58, flexShrink: 0, marginTop: 2 }}>
                  <div style={{ position: "absolute", inset: 0, borderRadius: 29, border: `2px solid ${ticked ? a.hex : active ? a.dim : T.borderBright}`, background: ticked ? a.hex : active ? a.soft : "transparent", boxShadow: ticked || active ? `0 0 ${ticked ? 28 : 16}px ${a.glow}` : "none", display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${ticked ? interpolate(te, [0, 1], [1.25, 1]) : 1})` }}>
                    {ticked ? <Check size={28} color={T.bg} width={3.6} /> : <span style={{ fontFamily: F2.mono, fontWeight: 700, fontSize: 26, color: active ? a.hex : T.faint }}>{i + 1}</span>}
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: F2.sans, fontWeight: 600, fontSize: 36, letterSpacing: "-0.015em", color: ticked || active ? T.text : T.dim, lineHeight: 1.2 }}>{s.title}</div>
                  {s.sub ? <div style={{ fontFamily: F2.sans, fontSize: 26, color: T.faint, marginTop: 4 }}>{s.sub}</div> : null}
                  {s.cmd ? (
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 14, marginTop: 14, padding: "12px 20px", borderRadius: 14, background: "#0C0C10", border: `1px solid ${active ? a.dim : T.border}`, maxWidth: "100%" }}>
                      <span style={{ fontFamily: F2.mono, fontSize: 27, color: a.hex }}>$</span>
                      <span style={{ fontFamily: F2.mono, fontSize: 27, color: ticked ? T.dim : T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {typed}
                        {typing ? <Caret f={f} /> : null}
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </Panel>
      </div>
    </Scene>
  );
};

// ── RunLog — "watching it actually work": a task log streams, spinners become ticks,
// the result line lands late in the accent. Details (right column) are REAL facts only.
export const RunLog: React.FC<{ title?: string; steps: { text: string; detail?: string }[]; result?: { text: string; sub?: string } }> = ({ title, steps, result }) => {
  const a = useAccent();
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ss = steps.slice(0, 5);
  const STEP = 12, SPIN = 11;
  const resultAt = 10 + ss.length * STEP + 6;
  const e = spr(f, fps, 2, { damping: 18 });
  const re = spr(f, fps, resultAt, { damping: 13, stiffness: 200 });
  return (
    <Scene bg="plain">
      <div style={{ width: "100%", maxWidth: 920, opacity: e, transform: `translateY(${interpolate(e, [0, 1], [36, 0])}px)` }}>
        <div style={{ borderRadius: 26, overflow: "hidden", background: "#0C0C10", border: `1px solid ${T.borderBright}`, boxShadow: `0 50px 120px -30px rgba(0,0,0,0.9), 0 0 90px -40px ${a.glow}` }}>
          <div style={{ height: 60, background: "rgba(255,255,255,0.04)", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 11, padding: "0 26px" }}>
            {["#ff5f57", "#febc2e", "#28c840"].map((c) => <div key={c} style={{ width: 15, height: 15, borderRadius: 8, background: c }} />)}
            {title ? <span style={{ marginLeft: 16, fontFamily: F2.mono, fontSize: 24, color: T.dim, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}><span style={{ color: a.hex }}>❯ </span>{title}</span> : null}
          </div>
          <div style={{ padding: "22px 34px 26px" }}>
            {ss.map((s, i) => {
              const at = 10 + i * STEP;
              const se = spr(f, fps, at, { damping: 22 });
              const doneAt = at + SPIN;
              const done = f >= doneAt;
              const de = spr(f, fps, doneAt, { damping: 14, stiffness: 200 });
              if (f < at - 2) return null;
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 20, padding: "13px 0", opacity: se, transform: `translateY(${interpolate(se, [0, 1], [10, 0])}px)` }}>
                  <div style={{ width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {done ? (
                      <div style={{ transform: `scale(${interpolate(de, [0, 1], [0.4, 1])})`, display: "flex" }}><Check size={30} color={a.hex} width={3.4} /></div>
                    ) : (
                      <Spinner f={f} size={30} color={a.hex} />
                    )}
                  </div>
                  <span style={{ fontFamily: F2.mono, fontSize: 29, color: done ? T.dim : T.text, flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.text}</span>
                  {s.detail ? (
                    <span style={{ fontFamily: F2.mono, fontSize: 25, color: T.faint, flexShrink: 0, opacity: done ? de : 0 }}>{s.detail}</span>
                  ) : null}
                </div>
              );
            })}
            {result && f >= resultAt - 2 ? (
              <div style={{ marginTop: 18, paddingTop: 22, borderTop: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 20, opacity: re, transform: `scale(${interpolate(re, [0, 1], [1.06, 1])})`, transformOrigin: "left center" }}>
                <div style={{ width: 34, height: 34, borderRadius: 17, background: a.hex, boxShadow: `0 0 26px ${a.glow}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Check size={22} color={T.bg} width={3.8} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: F2.sans, fontWeight: 700, fontSize: 38, letterSpacing: "-0.02em", color: a.hex, textShadow: `0 0 28px ${a.glow}`, lineHeight: 1.15 }}>{result.text}</div>
                  {result.sub ? <div style={{ fontFamily: F2.mono, fontSize: 24, color: T.dim, marginTop: 6 }}>{result.sub}</div> : null}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </Scene>
  );
};

// ── BeforeAfter — "what it replaces": each row's old way gets struck through, the new
// way springs in on the accent side. Rows are pairs of short phrases.
export const BeforeAfter: React.FC<{ title?: string; beforeLabel?: string; afterLabel?: string; rows: { before: string; after: string }[] }> = ({ title, beforeLabel = "before", afterLabel = "after", rows }) => {
  const a = useAccent();
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rs = rows.slice(0, 4);
  const e = spr(f, fps, 2, { damping: 18 });
  return (
    <Scene bg="plain">
      <div style={{ width: "100%", maxWidth: 950, opacity: e, transform: `translateY(${interpolate(e, [0, 1], [36, 0])}px)` }}>
        {title ? <Kicker text={title} /> : null}
        <Panel style={{ overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 72px 1fr", padding: "20px 36px 16px", borderBottom: `1px solid ${T.border}` }}>
            <span style={{ fontFamily: F2.mono, fontSize: 22, letterSpacing: "0.22em", textTransform: "uppercase", color: T.faint }}>{beforeLabel}</span>
            <span />
            <span style={{ fontFamily: F2.mono, fontSize: 22, letterSpacing: "0.22em", textTransform: "uppercase", color: a.hex, textShadow: `0 0 18px ${a.glow}` }}>{afterLabel}</span>
          </div>
          {rs.map((r, i) => {
            const at = 6 + i * 10;
            const re = spr(f, fps, at, { damping: 20 });
            const strike = interpolate(f, [at + 8, at + 18], [0, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            const ae = spr(f, fps, at + 14, { damping: 14, stiffness: 190 });
            const arrow = spr(f, fps, at + 10, { damping: 12, stiffness: 220 });
            return (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 72px 1fr", alignItems: "center", padding: "26px 36px", borderBottom: i < rs.length - 1 ? `1px solid ${T.border}` : "none", background: i % 2 ? "rgba(255,255,255,0.015)" : "transparent", opacity: re, transform: `translateX(${interpolate(re, [0, 1], [-20, 0])}px)` }}>
                {/* strike sweeps left→right: a line-through copy revealed by a clip (works across wrapped lines) */}
                <span style={{ position: "relative", display: "inline-block", fontFamily: F2.sans, fontWeight: 500, fontSize: 32, lineHeight: 1.25, color: T.dim, opacity: interpolate(strike, [0, 100], [1, 0.6]), alignSelf: "center", justifySelf: "start" }}>
                  {r.before}
                  <span aria-hidden style={{ position: "absolute", inset: 0, color: T.dim, textDecoration: "line-through", textDecorationThickness: 3, textDecorationColor: T.faint, clipPath: `inset(0 ${100 - strike}% 0 0)` }}>{r.before}</span>
                </span>
                <div style={{ display: "flex", justifyContent: "center", opacity: arrow, transform: `translateX(${interpolate(arrow, [0, 1], [-12, 0])}px)` }}>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={a.hex} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" style={{ filter: `drop-shadow(0 0 8px ${a.glow})` }}><path d="M5 12h14" /><path d="M13 6l6 6-6 6" /></svg>
                </div>
                <span style={{ fontFamily: F2.sans, fontWeight: 600, fontSize: 32, lineHeight: 1.25, letterSpacing: "-0.015em", color: T.text, opacity: ae, transform: `translateX(${interpolate(ae, [0, 1], [22, 0])}px)`, justifySelf: "start" }}>
                  <span style={{ background: a.soft, border: `1px solid ${a.dim}`, borderRadius: 12, padding: "6px 16px", display: "inline-block", boxShadow: `0 0 30px -10px ${a.glow}` }}>{r.after}</span>
                </span>
              </div>
            );
          })}
        </Panel>
      </div>
    </Scene>
  );
};

// ── Catch — "the fine print": 1–3 caveats land with a thud, optional verdict line.
// Stays on the accent (no red) — it's a caveat, not an error.
export const Catch: React.FC<{ kicker?: string; items: { text: string; sub?: string }[]; verdict?: string }> = ({ kicker = "the catch", items, verdict }) => {
  const a = useAccent();
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const its = items.slice(0, 3);
  const e = spr(f, fps, 2, { damping: 18 });
  const verdictAt = 12 + its.length * 12 + 6;
  const ve = spr(f, fps, verdictAt, { damping: 14, stiffness: 180 });
  return (
    <Scene bg="grid">
      <div style={{ width: "100%", maxWidth: 860, opacity: e, transform: `translateY(${interpolate(e, [0, 1], [36, 0])}px)` }}>
        <Panel glow style={{ padding: "44px 48px 40px", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 4, background: `repeating-linear-gradient(90deg, ${a.hex} 0 26px, transparent 26px 44px)`, opacity: 0.8 }} />
          <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 30 }}>
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke={a.hex} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ filter: `drop-shadow(0 0 10px ${a.glow})` }}>
              <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /><path d="M12 9v4" /><path d="M12 17h.01" />
            </svg>
            <span style={{ fontFamily: F2.mono, fontSize: 26, letterSpacing: "0.26em", textTransform: "uppercase", color: a.hex, textShadow: `0 0 24px ${a.glow}` }}>{kicker}</span>
          </div>
          {its.map((it, i) => {
            const at = 12 + i * 12;
            const ie = spr(f, fps, at, { damping: 12, stiffness: 210 });
            return (
              <div key={i} style={{ display: "flex", gap: 22, alignItems: "flex-start", padding: "20px 0", borderTop: `1px solid ${T.border}`, opacity: ie, transform: `scale(${interpolate(ie, [0, 1], [1.08, 1])}) translateY(${interpolate(ie, [0, 1], [-10, 0])}px)`, transformOrigin: "left center" }}>
                <span style={{ fontFamily: F2.mono, fontWeight: 700, fontSize: 30, color: a.hex, width: 40, flexShrink: 0, marginTop: 4 }}>!</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: F2.sans, fontWeight: 600, fontSize: 40, letterSpacing: "-0.02em", lineHeight: 1.18, color: T.text }}>{it.text}</div>
                  {it.sub ? <div style={{ fontFamily: F2.sans, fontSize: 28, color: T.dim, marginTop: 8, lineHeight: 1.3 }}>{it.sub}</div> : null}
                </div>
              </div>
            );
          })}
          {verdict ? (
            <div style={{ marginTop: 22, paddingTop: 26, borderTop: `1px solid ${T.borderBright}`, display: "flex", alignItems: "center", gap: 16, opacity: ve, transform: `translateY(${interpolate(ve, [0, 1], [14, 0])}px)` }}>
              <span style={{ fontFamily: F2.mono, fontSize: 22, letterSpacing: "0.2em", textTransform: "uppercase", color: T.faint }}>verdict</span>
              <span style={{ fontFamily: F2.sans, fontWeight: 700, fontSize: 34, letterSpacing: "-0.015em", color: a.hex, background: a.soft, border: `1px solid ${a.dim}`, borderRadius: 14, padding: "8px 20px", boxShadow: `0 0 40px -10px ${a.glow}` }}>{verdict}</span>
            </div>
          ) : null}
        </Panel>
      </div>
    </Scene>
  );
};

// ── GetIt — "where to find it": the closing card. The URL types in mono and glows,
// distribution badges (real marks — GitHub / npm / Homebrew / App Store...) stagger in,
// optional price chip (REAL price or "free") and a short note.
export const GetIt: React.FC<{ url: string; name?: string; brand?: string; badges?: string[]; price?: string; note?: string }> = ({ url, name, brand, badges = [], price, note }) => {
  const a = useAccent();
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const CPS = url.length > 36 ? 46 : 34; // long URLs type faster so the badges still land inside a 2-3s scene
  const typed = url.slice(0, Math.max(0, Math.floor(((f - 10) / fps) * CPS)));
  const done = typed.length >= url.length;
  const doneF = 10 + (url.length / CPS) * fps;
  const e = spr(f, fps, 2, { damping: 18 });
  // never truncate a URL: fit it on one line down to 30px, else wrap it (mono ≈ 0.62em/char)
  const AVAIL = 680;
  const oneLine = Math.min(44, Math.floor(AVAIL / (Math.max(url.length, 12) * 0.62)));
  const wrap = oneLine < 30;
  const urlSize = wrap ? 34 : oneLine;
  const pulse = done ? 0.85 + 0.15 * Math.sin((f - doneF) / 6) : 0;
  const bs = badges.slice(0, 4);
  return (
    <Scene bg="shader">
      <div style={{ width: "100%", maxWidth: 900, opacity: e, transform: `translateY(${interpolate(e, [0, 1], [40, 0])}px) scale(${interpolate(e, [0, 1], [0.95, 1])})` }}>
        <Panel glow style={{ padding: "50px 44px 46px", textAlign: "center" }}>
          {name ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 22, marginBottom: 34 }}>
              {(brand ?? name) && hasLogo(brand ?? name) ? <BrandBox brand={brand ?? name} size={76} /> : null}
              <span style={{ fontFamily: F2.sans, fontWeight: 700, fontSize: 52, letterSpacing: "-0.03em", color: T.text }}>{name}</span>
            </div>
          ) : null}
          <div style={{ fontFamily: F2.mono, fontSize: 24, letterSpacing: "0.24em", textTransform: "uppercase", color: T.faint, marginBottom: 18 }}>get it at</div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 18, padding: "20px 34px", borderRadius: 18, background: "#0C0C10", border: `1px solid ${done ? a.dim : T.borderBright}`, boxShadow: done ? `0 0 ${40 * pulse}px -8px ${a.glow}` : "none", maxWidth: "100%" }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={done ? a.hex : T.faint} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.5 1.5" /><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.5-1.5" /></svg>
            <span style={{ fontFamily: F2.mono, fontWeight: 600, fontSize: urlSize, lineHeight: 1.3, letterSpacing: "-0.01em", color: done ? a.hex : T.text, textShadow: done ? `0 0 26px ${a.glow}` : "none", whiteSpace: wrap ? "normal" : "nowrap", wordBreak: wrap ? "break-all" : "normal", textAlign: "left", minWidth: 0 }}>
              {typed}
              {!done ? <Caret f={f} /> : null}
            </span>
          </div>
          {bs.length || price ? (
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 14, marginTop: 34 }}>
              {bs.map((b, i) => {
                const be = spr(f, fps, doneF + 4 + i * 6, { damping: 16, stiffness: 170 });
                return (
                  <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 12, padding: "10px 20px 10px 14px", borderRadius: 999, background: T.surface, border: `1px solid ${T.borderBright}`, opacity: be, transform: `translateY(${interpolate(be, [0, 1], [16, 0])}px) scale(${interpolate(be, [0, 1], [0.85, 1])})` }}>
                    {hasLogo(b) ? <Logo name={b} size={28} color="#fff" /> : <span style={{ width: 10, height: 10, borderRadius: 5, background: a.hex, display: "inline-block" }} />}
                    <span style={{ fontFamily: F2.sans, fontWeight: 600, fontSize: 26, color: T.dim }}>{b}</span>
                  </span>
                );
              })}
              {price ? (() => {
                const pe = spr(f, fps, doneF + 4 + bs.length * 6, { damping: 13, stiffness: 200 });
                return (
                  <span style={{ display: "inline-flex", alignItems: "center", padding: "10px 22px", borderRadius: 999, background: a.hex, color: T.bg, fontFamily: F2.mono, fontWeight: 700, fontSize: 25, letterSpacing: "0.06em", boxShadow: `0 0 30px ${a.glow}`, opacity: pe, transform: `scale(${interpolate(pe, [0, 1], [0.7, 1])})` }}>{price}</span>
                );
              })() : null}
            </div>
          ) : null}
        </Panel>
        {note ? <div style={{ fontFamily: F2.sans, fontWeight: 500, fontSize: 32, color: T.dim, textAlign: "center", marginTop: 30, opacity: spr(f, fps, doneF + 10, { damping: 20 }) }}>{note}</div> : null}
      </div>
    </Scene>
  );
};
