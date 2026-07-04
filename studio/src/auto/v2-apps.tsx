import { interpolate, random, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { F2, T, useAccent } from "./theme";
import { Kicker, Panel, Scene } from "./fx";
import { Logo, hasLogo } from "./logos";

// ── app-UI scenes — shadcn/Raycast/Linear-grade product surfaces ──────────────
// Same rules as the rest of the kit: frame-deterministic, T tokens + one accent,
// content within ~950px, everything above the caption band (Scene handles that).

const spr = (frame: number, fps: number, delay = 0, cfg = {}) =>
  spring({ frame: frame - delay, fps, config: { damping: 22, stiffness: 130, mass: 0.9, ...cfg } });

// semantic colors (diff/deltas only — everything else stays on the accent)
const GOOD = "#4ADE80";
const BAD = "#F43F5E";

const Check: React.FC<{ size?: number; color: string }> = ({ size = 24, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

const BrandBox: React.FC<{ brand?: string; letter?: string; size?: number }> = ({ brand, letter, size = 64 }) => (
  <div style={{ width: size, height: size, borderRadius: size * 0.28, background: T.surface2, border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
    {brand && hasLogo(brand) ? (
      <Logo name={brand} size={size * 0.58} color="#fff" />
    ) : (
      <span style={{ fontFamily: F2.sans, fontWeight: 700, fontSize: size * 0.44, color: T.text }}>{(letter ?? brand ?? "?").slice(0, 1).toUpperCase()}</span>
    )}
  </div>
);

// caret that blinks deterministically
const Caret: React.FC<{ f: number }> = ({ f }) => {
  const a = useAccent();
  return <span style={{ color: a.hex, opacity: Math.floor(f / 8) % 2 ? 1 : 0 }}>▍</span>;
};

// ── CommandK — ⌘K command palette, query types, results filter in ────────────
export const CommandK: React.FC<{ query: string; results: { title: string; sub?: string; brand?: string }[]; hint?: string }> = ({ query, results, hint }) => {
  const a = useAccent();
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const CPS = 18;
  const typed = query.slice(0, Math.max(0, Math.floor(((f - 8) / fps) * CPS)));
  const doneF = 8 + (query.length / CPS) * fps;
  const e = spr(f, fps, 2, { damping: 18 });
  return (
    <Scene bg="grid">
      <div style={{ width: "100%", maxWidth: 880, opacity: e, transform: `translateY(${interpolate(e, [0, 1], [40, 0])}px) scale(${interpolate(e, [0, 1], [0.96, 1])})` }}>
        <Panel glow style={{ overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 24, padding: "34px 40px", borderBottom: `1px solid ${T.border}` }}>
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke={T.faint} strokeWidth="2.4" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.35-4.35" /></svg>
            <span style={{ fontFamily: F2.sans, fontSize: 40, color: typed ? T.text : T.faint, letterSpacing: "-0.01em", flex: 1, whiteSpace: "nowrap", overflow: "hidden" }}>
              {typed || "Type a command…"}
              {typed.length < query.length ? <Caret f={f} /> : null}
            </span>
            <span style={{ fontFamily: F2.mono, fontSize: 24, color: T.faint, border: `1px solid ${T.border}`, borderRadius: 10, padding: "6px 14px" }}>⌘K</span>
          </div>
          {results.slice(0, 4).map((r, i) => {
            const re = spr(f, fps, doneF + 3 + i * 6, { damping: 19 });
            const hero = i === 0;
            return (
              <div
                key={i}
                style={{
                  display: "flex", alignItems: "center", gap: 24, padding: "26px 40px",
                  background: hero ? a.soft : "transparent",
                  borderLeft: `4px solid ${hero ? a.hex : "transparent"}`,
                  opacity: re, transform: `translateX(${interpolate(re, [0, 1], [24, 0])}px)`,
                }}
              >
                <BrandBox brand={r.brand} letter={r.title} size={56} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: F2.sans, fontWeight: 600, fontSize: 34, color: T.text }}>{r.title}</div>
                  {r.sub ? <div style={{ fontFamily: F2.sans, fontSize: 26, color: T.dim, marginTop: 2 }}>{r.sub}</div> : null}
                </div>
                {hero ? <span style={{ fontFamily: F2.mono, fontSize: 22, color: a.hex }}>↵</span> : null}
              </div>
            );
          })}
        </Panel>
        {hint ? <div style={{ fontFamily: F2.sans, fontWeight: 500, fontSize: 32, color: T.dim, textAlign: "center", marginTop: 30 }}>{hint}</div> : null}
      </div>
    </Scene>
  );
};

// ── DiffBlock — code diff, adds/removes sweep in ─────────────────────────────
export const DiffBlock: React.FC<{ title?: string; lines: { text: string; type?: "add" | "del" | "ctx" }[] }> = ({ title = "changes.diff", lines }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ls = lines.slice(0, 9);
  return (
    <Scene bg="plain">
      <div style={{ width: "100%", maxWidth: 920 }}>
        <Panel style={{ overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "24px 34px", borderBottom: `1px solid ${T.border}` }}>
            {["#FF5F57", "#FEBC2E", "#28C840"].map((c) => (
              <div key={c} style={{ width: 18, height: 18, borderRadius: 9, background: c, opacity: 0.9 }} />
            ))}
            <span style={{ fontFamily: F2.mono, fontSize: 26, color: T.dim, marginLeft: 14 }}>{title}</span>
          </div>
          <div style={{ padding: "24px 0 30px" }}>
            {ls.map((l, i) => {
              const e = spr(f, fps, 8 + i * 5, { damping: 24 });
              const t = l.type ?? "ctx";
              const tint = t === "add" ? "rgba(74,222,128,0.10)" : t === "del" ? "rgba(244,63,94,0.10)" : "transparent";
              const mark = t === "add" ? "+" : t === "del" ? "−" : " ";
              const markColor = t === "add" ? GOOD : t === "del" ? BAD : T.faint;
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", background: tint, padding: "8px 34px", opacity: e, transform: `translateX(${interpolate(e, [0, 1], [20, 0])}px)` }}>
                  <span style={{ fontFamily: F2.mono, fontSize: 30, color: markColor, width: 44, flexShrink: 0 }}>{mark}</span>
                  <span style={{ fontFamily: F2.mono, fontSize: 30, color: t === "ctx" ? T.dim : T.text, textDecoration: t === "del" ? "line-through" : "none", opacity: t === "del" ? 0.75 : 1, whiteSpace: "pre" }}>{l.text}</span>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>
    </Scene>
  );
};

// ── Pricing — tier cards, hero tier glows ────────────────────────────────────
export const Pricing: React.FC<{ title?: string; tiers: { name: string; price: string; per?: string; features?: string[]; hero?: boolean }[] }> = ({ title, tiers }) => {
  const a = useAccent();
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ts = tiers.slice(0, 3);
  return (
    <Scene bg="plain">
      <div style={{ width: "100%", maxWidth: 950 }}>
        {title ? <Kicker text={title} /> : null}
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${ts.length}, 1fr)`, gap: 24, alignItems: "stretch" }}>
          {ts.map((t, i) => {
            const e = spr(f, fps, 6 + i * 8, { damping: 18 });
            return (
              <Panel
                key={i}
                glow={t.hero}
                style={{
                  padding: "40px 34px",
                  border: `1px solid ${t.hero ? a.dim : T.border}`,
                  position: "relative",
                  opacity: e,
                  transform: `translateY(${interpolate(e, [0, 1], [44, 0])}px) scale(${t.hero ? interpolate(e, [0, 1], [0.94, 1.03]) : 1})`,
                }}
              >
                {t.hero ? (
                  <div style={{ position: "absolute", top: -18, left: "50%", transform: "translateX(-50%)", background: a.hex, color: T.bg, fontFamily: F2.mono, fontSize: 20, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", borderRadius: 999, padding: "8px 20px", boxShadow: `0 0 30px ${a.glow}`, whiteSpace: "nowrap" }}>
                    popular
                  </div>
                ) : null}
                <div style={{ fontFamily: F2.sans, fontWeight: 600, fontSize: 32, color: T.dim }}>{t.name}</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, margin: "16px 0 6px" }}>
                  <span style={{ fontFamily: F2.sans, fontWeight: 700, fontSize: 66, letterSpacing: "-0.03em", color: t.hero ? a.hex : T.text, textShadow: t.hero ? `0 0 34px ${a.glow}` : "none" }}>{t.price}</span>
                </div>
                {t.per ? <div style={{ fontFamily: F2.mono, fontSize: 23, color: T.faint, marginBottom: 24 }}>{t.per}</div> : <div style={{ height: 24 }} />}
                {(t.features ?? []).slice(0, 4).map((ft, k) => (
                  <div key={k} style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 16 }}>
                    <Check size={22} color={t.hero ? a.hex : T.faint} />
                    <span style={{ fontFamily: F2.sans, fontSize: 26, color: T.dim, lineHeight: 1.2 }}>{ft}</span>
                  </div>
                ))}
              </Panel>
            );
          })}
        </div>
      </div>
    </Scene>
  );
};

// ── Leaderboard — ranked rows, hero row glows ────────────────────────────────
export const Leaderboard: React.FC<{ title?: string; rows: { label: string; value: string; brand?: string; hero?: boolean }[] }> = ({ title, rows }) => {
  const a = useAccent();
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <Scene bg="plain">
      <div style={{ width: "100%", maxWidth: 880 }}>
        {title ? <Kicker text={title} /> : null}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {rows.slice(0, 5).map((r, i) => {
            const e = spr(f, fps, 6 + i * 8, { damping: 18 });
            return (
              <div
                key={i}
                style={{
                  display: "flex", alignItems: "center", gap: 26, padding: "26px 34px",
                  background: r.hero ? a.soft : T.surface,
                  border: `1px solid ${r.hero ? a.dim : T.border}`,
                  borderRadius: 24,
                  boxShadow: r.hero ? `0 0 60px -14px ${a.glow}` : "none",
                  opacity: e,
                  transform: `translateX(${interpolate(e, [0, 1], [-40, 0])}px) scale(${r.hero ? interpolate(e, [0, 1], [0.97, 1.02]) : 1})`,
                }}
              >
                <span style={{ fontFamily: F2.mono, fontWeight: 700, fontSize: 34, color: r.hero ? a.hex : T.faint, width: 66, flexShrink: 0 }}>#{i + 1}</span>
                <BrandBox brand={r.brand} letter={r.label} size={58} />
                <span style={{ fontFamily: F2.sans, fontWeight: 600, fontSize: 38, letterSpacing: "-0.015em", color: T.text, flex: 1, minWidth: 0 }}>{r.label}</span>
                <span style={{ fontFamily: F2.mono, fontWeight: 700, fontSize: 36, color: r.hero ? a.hex : T.dim, textShadow: r.hero ? `0 0 24px ${a.glow}` : "none" }}>{r.value}</span>
              </div>
            );
          })}
        </div>
      </div>
    </Scene>
  );
};

// ── ProgressCard — one big animated progress bar with a counting % ───────────
export const ProgressCard: React.FC<{ label: string; percent: number; sub?: string }> = ({ label, percent, sub }) => {
  const a = useAccent();
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = Math.min(100, Math.max(0, percent));
  const t = interpolate(f, [10, 10 + 1.4 * fps], [0, p], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const e = spr(f, fps, 3, { damping: 18 });
  return (
    <Scene bg="grid">
      <div style={{ width: "100%", maxWidth: 860, opacity: e, transform: `translateY(${interpolate(e, [0, 1], [36, 0])}px)` }}>
        <Panel glow style={{ padding: "52px 54px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 34 }}>
            <span style={{ fontFamily: F2.sans, fontWeight: 600, fontSize: 42, letterSpacing: "-0.02em", color: T.text }}>{label}</span>
            <span style={{ fontFamily: F2.mono, fontWeight: 700, fontSize: 60, color: a.hex, textShadow: `0 0 30px ${a.glow}` }}>{Math.round(t)}%</span>
          </div>
          <div style={{ height: 26, borderRadius: 13, background: T.surface2, border: `1px solid ${T.border}`, overflow: "hidden" }}>
            <div style={{ width: `${t}%`, height: "100%", borderRadius: 13, background: `linear-gradient(90deg, ${a.dim}, ${a.hex})`, boxShadow: `0 0 30px ${a.glow}` }} />
          </div>
          {sub ? <div style={{ fontFamily: F2.sans, fontSize: 30, color: T.dim, marginTop: 30 }}>{sub}</div> : null}
        </Panel>
      </div>
    </Scene>
  );
};

// ── Toggles — settings panel, switches flip ON one by one ───────────────────
export const Toggles: React.FC<{ title?: string; items: { label: string; on?: boolean }[] }> = ({ title, items }) => {
  const a = useAccent();
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <Scene bg="plain">
      <div style={{ width: "100%", maxWidth: 820 }}>
        {title ? <Kicker text={title} /> : null}
        <Panel style={{ padding: "16px 0" }}>
          {items.slice(0, 5).map((it, i) => {
            const on = it.on !== false;
            const e = spr(f, fps, 6 + i * 7, { damping: 20 });
            const flip = on ? spr(f, fps, 18 + i * 9, { damping: 15, stiffness: 200 }) : 0;
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "28px 42px", borderBottom: i < Math.min(items.length, 5) - 1 ? `1px solid ${T.border}` : "none", opacity: e }}>
                <span style={{ fontFamily: F2.sans, fontWeight: 500, fontSize: 38, letterSpacing: "-0.015em", color: T.text }}>{it.label}</span>
                <div style={{ width: 96, height: 54, borderRadius: 27, flexShrink: 0, background: flip > 0.5 ? a.hex : T.surface2, border: `1px solid ${flip > 0.5 ? a.hex : T.borderBright}`, boxShadow: flip > 0.5 ? `0 0 26px ${a.glow}` : "none", position: "relative" }}>
                  <div style={{ position: "absolute", top: 5, left: 6 + interpolate(flip, [0, 1], [0, 42]), width: 42, height: 42, borderRadius: 21, background: "#fff", boxShadow: "0 4px 10px rgba(0,0,0,0.4)" }} />
                </div>
              </div>
            );
          })}
        </Panel>
      </div>
    </Scene>
  );
};

// ── Dashboard — 2×2 KPI cards with sparklines ────────────────────────────────
export const Dashboard: React.FC<{ title?: string; cards: { label: string; value: string; delta?: string; spark?: number[] }[] }> = ({ title, cards }) => {
  const a = useAccent();
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <Scene bg="plain">
      <div style={{ width: "100%", maxWidth: 940 }}>
        {title ? <Kicker text={title} /> : null}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          {cards.slice(0, 4).map((c, i) => {
            const e = spr(f, fps, 5 + i * 7, { damping: 18 });
            const up = !c.delta || !c.delta.trim().startsWith("-");
            const vals = c.spark && c.spark.length >= 2 ? c.spark : null;
            const W = 380, H = 88;
            const pts = vals
              ? vals.map((v, k) => {
                  const min = Math.min(...vals), max = Math.max(...vals);
                  const x = (k / (vals.length - 1)) * W;
                  const y = H - ((v - min) / Math.max(1e-6, max - min)) * H;
                  return `${x},${y}`;
                }).join(" ")
              : null;
            const draw = interpolate(f, [12 + i * 6, 12 + i * 6 + 1.0 * fps], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            return (
              <Panel key={i} style={{ padding: "34px 36px", opacity: e, transform: `translateY(${interpolate(e, [0, 1], [36, 0])}px)` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontFamily: F2.mono, fontSize: 23, letterSpacing: "0.14em", textTransform: "uppercase", color: T.faint }}>{c.label}</span>
                  {c.delta ? (
                    <span style={{ fontFamily: F2.mono, fontWeight: 700, fontSize: 24, color: up ? GOOD : BAD, background: up ? "rgba(74,222,128,0.12)" : "rgba(244,63,94,0.12)", borderRadius: 999, padding: "5px 14px" }}>
                      {up ? "↑" : "↓"} {c.delta.replace(/^[+-]/, "")}
                    </span>
                  ) : null}
                </div>
                <div style={{ fontFamily: F2.sans, fontWeight: 700, fontSize: 62, letterSpacing: "-0.03em", color: T.text, margin: "14px 0 6px" }}>{c.value}</div>
                {pts ? (
                  <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: "block", marginTop: 8, overflow: "visible" }}>
                    <polyline points={pts} fill="none" stroke={a.hex} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} style={{ filter: `drop-shadow(0 0 10px ${a.glow})` }} />
                  </svg>
                ) : null}
              </Panel>
            );
          })}
        </div>
      </div>
    </Scene>
  );
};

// ── SearchCard — search bar types, suggestions drop in ───────────────────────
export const SearchCard: React.FC<{ query: string; suggestions?: string[]; label?: string }> = ({ query, suggestions = [], label }) => {
  const a = useAccent();
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const CPS = 16;
  const typed = query.slice(0, Math.max(0, Math.floor(((f - 8) / fps) * CPS)));
  const doneF = 8 + (query.length / CPS) * fps;
  const e = spr(f, fps, 2, { damping: 18 });
  return (
    <Scene bg="shader">
      <div style={{ width: "100%", maxWidth: 860, opacity: e, transform: `translateY(${interpolate(e, [0, 1], [36, 0])}px)` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 26, background: "rgba(18,18,22,0.9)", border: `1px solid ${T.borderBright}`, borderRadius: 999, padding: "30px 44px", boxShadow: `0 26px 70px -18px rgba(0,0,0,0.8), 0 0 60px -22px ${a.glow}` }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={a.hex} strokeWidth="2.6" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.35-4.35" /></svg>
          <span style={{ fontFamily: F2.sans, fontSize: 42, letterSpacing: "-0.01em", color: typed ? T.text : T.faint, whiteSpace: "nowrap", overflow: "hidden" }}>
            {typed || "Search"}
            {typed.length < query.length ? <Caret f={f} /> : null}
          </span>
        </div>
        {suggestions.length ? (
          <Panel style={{ marginTop: 20, overflow: "hidden" }}>
            {suggestions.slice(0, 4).map((s, i) => {
              const se = spr(f, fps, doneF + 4 + i * 6, { damping: 19 });
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 22, padding: "24px 40px", borderBottom: i < Math.min(suggestions.length, 4) - 1 ? `1px solid ${T.border}` : "none", opacity: se, transform: `translateY(${interpolate(se, [0, 1], [14, 0])}px)` }}>
                  <span style={{ fontFamily: F2.mono, fontSize: 24, color: T.faint }}>↗</span>
                  <span style={{ fontFamily: F2.sans, fontSize: 32, color: i === 0 ? T.text : T.dim }}>{s}</span>
                </div>
              );
            })}
          </Panel>
        ) : null}
        {label ? <div style={{ fontFamily: F2.sans, fontWeight: 500, fontSize: 32, color: T.dim, textAlign: "center", marginTop: 28 }}>{label}</div> : null}
      </div>
    </Scene>
  );
};

// ── Receipt — deadpan itemized bill, total slams in ──────────────────────────
export const Receipt: React.FC<{ title?: string; items: { label: string; value: string }[]; total?: { label?: string; value: string } }> = ({ title = "RECEIPT", items, total }) => {
  const a = useAccent();
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const its = items.slice(0, 6);
  const totalDelay = 12 + its.length * 7 + 6;
  const te = spr(f, fps, totalDelay, { damping: 13, stiffness: 210 });
  const e = spr(f, fps, 2, { damping: 18 });
  return (
    <Scene bg="plain">
      <div style={{ width: "100%", maxWidth: 720, opacity: e, transform: `translateY(${interpolate(e, [0, 1], [36, 0])}px)` }}>
        <Panel style={{ padding: "48px 52px" }}>
          <div style={{ fontFamily: F2.mono, fontSize: 27, letterSpacing: "0.3em", textTransform: "uppercase", color: T.faint, textAlign: "center", marginBottom: 20 }}>{title}</div>
          <div style={{ borderTop: `2px dotted ${T.borderBright}`, marginBottom: 34 }} />
          {its.map((it, i) => {
            const ie = spr(f, fps, 12 + i * 7, { damping: 22 });
            return (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 20, marginBottom: 22, opacity: ie, transform: `translateX(${interpolate(ie, [0, 1], [16, 0])}px)` }}>
                <span style={{ fontFamily: F2.mono, fontSize: 31, color: T.dim, minWidth: 0 }}>{it.label}</span>
                <span style={{ fontFamily: F2.mono, fontSize: 31, color: T.text, flexShrink: 0 }}>{it.value}</span>
              </div>
            );
          })}
          {total ? (
            <>
              <div style={{ borderTop: `2px dashed ${T.borderBright}`, margin: "30px 0" }} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", opacity: te, transform: `scale(${interpolate(te, [0, 1], [1.35, 1])})`, transformOrigin: "right center" }}>
                <span style={{ fontFamily: F2.mono, fontWeight: 700, fontSize: 34, letterSpacing: "0.08em", textTransform: "uppercase", color: T.text }}>{total.label ?? "total"}</span>
                <span style={{ fontFamily: F2.mono, fontWeight: 700, fontSize: 56, color: a.hex, textShadow: `0 0 32px ${a.glow}` }}>{total.value}</span>
              </div>
            </>
          ) : null}
        </Panel>
      </div>
    </Scene>
  );
};

// ── Waveform — voice bars breathing around a center line ─────────────────────
export const Waveform: React.FC<{ label?: string; sub?: string }> = ({ label, sub }) => {
  const a = useAccent();
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const N = 44;
  const e = spr(f, fps, 3, { damping: 18 });
  return (
    <Scene bg="plain">
      <div style={{ width: "100%", maxWidth: 880, textAlign: "center", opacity: e }}>
        {label ? <Kicker text={label} /> : null}
        <Panel glow style={{ padding: "70px 50px", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
          {Array.from({ length: N }, (_, i) => {
            const seed = random(`wf${i}`);
            const env = Math.sin((i / (N - 1)) * Math.PI); // taller in the middle
            const wob = Math.sin(f / (5 + seed * 6) + i * 0.9) * 0.5 + 0.5;
            const h = 14 + env * (30 + wob * 150) * (0.5 + seed * 0.5);
            const hot = wob > 0.72;
            return (
              <div key={i} style={{ width: 10, height: h, borderRadius: 5, background: hot ? a.hex : a.dim, boxShadow: hot ? `0 0 16px ${a.glow}` : "none", flexShrink: 0 }} />
            );
          })}
        </Panel>
        {sub ? <div style={{ fontFamily: F2.sans, fontWeight: 500, fontSize: 34, color: T.dim, marginTop: 30 }}>{sub}</div> : null}
      </div>
    </Scene>
  );
};

// ── Inbox — email rows stack in, unread glow ─────────────────────────────────
export const Inbox: React.FC<{ items: { from: string; subject: string; preview?: string; time?: string; unread?: boolean; brand?: string }[] }> = ({ items }) => {
  const a = useAccent();
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <Scene bg="plain">
      <div style={{ width: "100%", maxWidth: 900 }}>
        <Panel style={{ overflow: "hidden" }}>
          {items.slice(0, 4).map((m, i) => {
            const e = spr(f, fps, 6 + i * 9, { damping: 18 });
            return (
              <div key={i} style={{ display: "flex", gap: 24, alignItems: "center", padding: "30px 38px", borderBottom: i < Math.min(items.length, 4) - 1 ? `1px solid ${T.border}` : "none", background: m.unread ? "rgba(255,255,255,0.02)" : "transparent", opacity: e, transform: `translateY(${interpolate(e, [0, 1], [26, 0])}px)` }}>
                <div style={{ width: 14, height: 14, borderRadius: 7, background: m.unread ? a.hex : "transparent", boxShadow: m.unread ? `0 0 14px ${a.glow}` : "none", flexShrink: 0 }} />
                <BrandBox brand={m.brand} letter={m.from} size={62} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "baseline" }}>
                    <span style={{ fontFamily: F2.sans, fontWeight: m.unread ? 700 : 600, fontSize: 32, color: T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.from}</span>
                    <span style={{ fontFamily: F2.mono, fontSize: 22, color: T.faint, flexShrink: 0 }}>{m.time ?? "now"}</span>
                  </div>
                  <div style={{ fontFamily: F2.sans, fontWeight: m.unread ? 600 : 500, fontSize: 30, color: m.unread ? T.text : T.dim, marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.subject}</div>
                  {m.preview ? <div style={{ fontFamily: F2.sans, fontSize: 26, color: T.faint, marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.preview}</div> : null}
                </div>
              </div>
            );
          })}
        </Panel>
      </div>
    </Scene>
  );
};

// ── Poll — options fill to their percentages, winner glows ───────────────────
export const Poll: React.FC<{ question?: string; options: { label: string; percent: number; hero?: boolean }[] }> = ({ question, options }) => {
  const a = useAccent();
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <Scene bg="plain">
      <div style={{ width: "100%", maxWidth: 840 }}>
        {question ? (
          <div style={{ fontFamily: F2.sans, fontWeight: 700, fontSize: 54, letterSpacing: "-0.025em", color: T.text, marginBottom: 40, lineHeight: 1.15 }}>{question}</div>
        ) : null}
        {options.slice(0, 4).map((o, i) => {
          const e = spr(f, fps, 6 + i * 8, { damping: 18 });
          const p = Math.min(100, Math.max(0, o.percent));
          const fill = interpolate(f, [14 + i * 8, 14 + i * 8 + 1.1 * fps], [0, p], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return (
            <div key={i} style={{ position: "relative", marginBottom: 22, borderRadius: 20, border: `1px solid ${o.hero ? a.dim : T.border}`, background: T.surface, overflow: "hidden", opacity: e, transform: `translateY(${interpolate(e, [0, 1], [22, 0])}px)`, boxShadow: o.hero ? `0 0 50px -16px ${a.glow}` : "none" }}>
              <div style={{ position: "absolute", inset: 0, width: `${fill}%`, background: o.hero ? a.soft : "rgba(255,255,255,0.05)", borderRight: `2px solid ${o.hero ? a.hex : T.borderBright}` }} />
              <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "26px 32px" }}>
                <span style={{ fontFamily: F2.sans, fontWeight: 600, fontSize: 36, color: T.text, display: "flex", alignItems: "center", gap: 16 }}>
                  {o.label}
                  {o.hero ? <Check size={26} color={a.hex} /> : null}
                </span>
                <span style={{ fontFamily: F2.mono, fontWeight: 700, fontSize: 36, color: o.hero ? a.hex : T.dim }}>{Math.round(fill)}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </Scene>
  );
};

// ── Ticker — market-style rows with up/down deltas ───────────────────────────
export const Ticker: React.FC<{ title?: string; rows: { symbol: string; label?: string; value: string; delta?: string }[] }> = ({ title, rows }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <Scene bg="grid">
      <div style={{ width: "100%", maxWidth: 860 }}>
        {title ? <Kicker text={title} /> : null}
        <Panel style={{ overflow: "hidden" }}>
          {rows.slice(0, 5).map((r, i) => {
            const e = spr(f, fps, 6 + i * 7, { damping: 20 });
            const up = !r.delta || !r.delta.trim().startsWith("-");
            const flash = interpolate(f, [16 + i * 7, 26 + i * 7, 40 + i * 7], [0, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 26, padding: "28px 40px", borderBottom: i < Math.min(rows.length, 5) - 1 ? `1px solid ${T.border}` : "none", background: `rgba(${up ? "74,222,128" : "244,63,94"},${0.06 * flash})`, opacity: e, transform: `translateX(${interpolate(e, [0, 1], [30, 0])}px)` }}>
                <span style={{ fontFamily: F2.mono, fontWeight: 700, fontSize: 34, color: T.text, width: 190, flexShrink: 0 }}>{r.symbol}</span>
                <span style={{ fontFamily: F2.sans, fontSize: 28, color: T.faint, flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.label ?? ""}</span>
                <span style={{ fontFamily: F2.mono, fontWeight: 600, fontSize: 34, color: T.text }}>{r.value}</span>
                {r.delta ? (
                  <span style={{ fontFamily: F2.mono, fontWeight: 700, fontSize: 27, color: up ? GOOD : BAD, width: 150, textAlign: "right", flexShrink: 0 }}>
                    {up ? "▲" : "▼"} {r.delta.replace(/^[+-]/, "")}
                  </span>
                ) : null}
              </div>
            );
          })}
        </Panel>
      </div>
    </Scene>
  );
};

// ── Kanban — board columns; the last card lands late with the accent ─────────
export const Kanban: React.FC<{ title?: string; columns: { title: string; cards: string[] }[] }> = ({ title, columns }) => {
  const a = useAccent();
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cols = columns.slice(0, 3);
  const lastCol = cols.length - 1;
  return (
    <Scene bg="plain">
      <div style={{ width: "100%", maxWidth: 950 }}>
        {title ? <Kicker text={title} /> : null}
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols.length}, 1fr)`, gap: 20, alignItems: "start" }}>
          {cols.map((col, ci) => (
            <div key={ci} style={{ background: "rgba(255,255,255,0.025)", border: `1px solid ${T.border}`, borderRadius: 22, padding: "22px 18px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, paddingLeft: 6 }}>
                <div style={{ width: 12, height: 12, borderRadius: 6, background: ci === lastCol ? a.hex : T.faint, boxShadow: ci === lastCol ? `0 0 12px ${a.glow}` : "none" }} />
                <span style={{ fontFamily: F2.mono, fontSize: 22, letterSpacing: "0.12em", textTransform: "uppercase", color: T.dim }}>{col.title}</span>
                <span style={{ fontFamily: F2.mono, fontSize: 20, color: T.faint, marginLeft: "auto" }}>{col.cards.length}</span>
              </div>
              {col.cards.slice(0, 4).map((card, i) => {
                const isHero = ci === lastCol && i === Math.min(col.cards.length, 4) - 1;
                const delay = isHero ? 34 : 6 + ci * 8 + i * 6;
                const e = spr(f, fps, delay, { damping: isHero ? 14 : 19, stiffness: isHero ? 190 : 130 });
                return (
                  <div key={i} style={{ background: T.surface, border: `1px solid ${isHero ? a.dim : T.border}`, borderRadius: 16, padding: "20px 20px", marginBottom: 14, boxShadow: isHero ? `0 0 40px -10px ${a.glow}` : "none", opacity: e, transform: `translateY(${interpolate(e, [0, 1], [isHero ? -44 : 20, 0])}px) scale(${isHero ? interpolate(e, [0, 1], [1.06, 1]) : 1})` }}>
                    <span style={{ fontFamily: F2.sans, fontWeight: 500, fontSize: 26, color: isHero ? T.text : T.dim, lineHeight: 1.25 }}>{card}</span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </Scene>
  );
};

// ── PromptCard — "the prompt that did this": big input, text types, send pulses ─
export const PromptCard: React.FC<{ text: string; app?: string; sub?: string }> = ({ text, app, sub }) => {
  const a = useAccent();
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const CPS = 26;
  const typed = text.slice(0, Math.max(0, Math.floor(((f - 10) / fps) * CPS)));
  const done = typed.length >= text.length;
  const sendPulse = done ? 0.9 + 0.1 * Math.sin(f / 5) : 1;
  const e = spr(f, fps, 3, { damping: 18 });
  return (
    <Scene bg="grid">
      <div style={{ width: "100%", maxWidth: 880, opacity: e, transform: `translateY(${interpolate(e, [0, 1], [36, 0])}px)` }}>
        <Panel glow style={{ padding: "42px 46px" }}>
          <div style={{ fontFamily: F2.mono, fontSize: 33, lineHeight: 1.5, color: T.text, minHeight: 150, wordBreak: "break-word" }}>
            {typed}
            {!done ? <Caret f={f} /> : null}
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 34, paddingTop: 28, borderTop: `1px solid ${T.border}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              {app && hasLogo(app) ? <Logo name={app} size={30} color="#fff" /> : <div style={{ width: 12, height: 12, borderRadius: 6, background: a.hex }} />}
              <span style={{ fontFamily: F2.mono, fontSize: 24, color: T.faint, textTransform: "capitalize" }}>{app ?? "prompt"}</span>
            </div>
            <div style={{ width: 78, height: 78, borderRadius: 22, background: done ? a.hex : T.surface2, border: `1px solid ${done ? a.hex : T.borderBright}`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: done ? `0 0 ${34 * sendPulse}px ${a.glow}` : "none", transform: `scale(${done ? sendPulse : 1})` }}>
              <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke={done ? T.bg : T.dim} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M13 6l6 6-6 6" /></svg>
            </div>
          </div>
        </Panel>
        {sub ? <div style={{ fontFamily: F2.sans, fontWeight: 500, fontSize: 32, color: T.dim, textAlign: "center", marginTop: 30 }}>{sub}</div> : null}
      </div>
    </Scene>
  );
};

// ── Rating — app-store style card, stars fill one by one ─────────────────────
export const Rating: React.FC<{ name: string; rating: number; count?: string; brand?: string; tagline?: string }> = ({ name, rating, count, brand, tagline }) => {
  const a = useAccent();
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const r = Math.min(5, Math.max(0, rating));
  const e = spr(f, fps, 3, { damping: 18 });
  const STAR = "M12 2l2.9 6.26 6.6.57-5 4.36 1.5 6.45L12 16.9 5.99 19.64l1.5-6.45-5-4.36 6.6-.57L12 2z";
  return (
    <Scene bg="shader">
      <div style={{ width: "100%", maxWidth: 780, opacity: e, transform: `translateY(${interpolate(e, [0, 1], [40, 0])}px) scale(${interpolate(e, [0, 1], [0.95, 1])})` }}>
        <Panel glow style={{ padding: "56px 54px", textAlign: "center" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 28, marginBottom: 40 }}>
            <BrandBox brand={brand} letter={name} size={110} />
            <div style={{ textAlign: "left" }}>
              <div style={{ fontFamily: F2.sans, fontWeight: 700, fontSize: 52, letterSpacing: "-0.025em", color: T.text }}>{name}</div>
              {tagline ? <div style={{ fontFamily: F2.sans, fontSize: 29, color: T.dim, marginTop: 4 }}>{tagline}</div> : null}
            </div>
          </div>
          <div style={{ fontFamily: F2.sans, fontWeight: 700, fontSize: 120, letterSpacing: "-0.04em", color: T.text, lineHeight: 1 }}>{r.toFixed(1)}</div>
          <div style={{ display: "flex", justifyContent: "center", gap: 12, margin: "26px 0 14px" }}>
            {Array.from({ length: 5 }, (_, i) => {
              const se = spr(f, fps, 16 + i * 6, { damping: 14, stiffness: 200 });
              const fillFrac = Math.min(1, Math.max(0, r - i));
              return (
                <div key={i} style={{ position: "relative", width: 56, height: 56, opacity: se, transform: `scale(${interpolate(se, [0, 1], [0.3, 1])})` }}>
                  <svg width="56" height="56" viewBox="0 0 24 24"><path d={STAR} fill={T.surface2} stroke={T.borderBright} strokeWidth="1" /></svg>
                  <div style={{ position: "absolute", inset: 0, width: `${fillFrac * 100}%`, overflow: "hidden" }}>
                    <svg width="56" height="56" viewBox="0 0 24 24" style={{ filter: `drop-shadow(0 0 10px ${a.glow})` }}><path d={STAR} fill={a.hex} /></svg>
                  </div>
                </div>
              );
            })}
          </div>
          {count ? <div style={{ fontFamily: F2.mono, fontSize: 26, color: T.faint }}>{count}</div> : null}
        </Panel>
      </div>
    </Scene>
  );
};
