import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { F2, T, useAccent } from "./theme";
import { Kicker, Panel, Scene } from "./fx";
import { Logo, hasLogo } from "./logos";

// ── ui scenes — product-grade cards and layouts (Linear/Notion energy) ────────

const spr = (frame: number, fps: number, delay = 0, cfg = {}) =>
  spring({ frame: frame - delay, fps, config: { damping: 22, stiffness: 130, mass: 0.9, ...cfg } });

// bento grid — first cell spans wide, the rest tile
export const Bento: React.FC<{ title?: string; cells: { title: string; sub?: string; brand?: string }[] }> = ({ title, cells }) => {
  const a = useAccent();
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cs = cells.slice(0, 5);
  return (
    <Scene bg="plain">
      <div style={{ width: "100%", maxWidth: 940 }}>
        {title ? <Kicker text={title} /> : null}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          {cs.map((c, i) => {
            const e = spr(f, fps, 5 + i * 7, { damping: 18 });
            const big = i === 0;
            return (
              <Panel
                key={i}
                glow={big}
                style={{
                  gridColumn: big ? "span 2" : "span 1",
                  padding: big ? "52px 48px" : "38px 36px",
                  opacity: e,
                  transform: `translateY(${interpolate(e, [0, 1], [34, 0])}px) scale(${interpolate(e, [0, 1], [0.94, 1])})`,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
                  {c.brand && hasLogo(c.brand) ? (
                    <div style={{ width: 68, height: 68, borderRadius: 18, background: T.surface2, border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Logo name={c.brand} size={40} color="#fff" />
                    </div>
                  ) : (
                    <div style={{ width: 14, height: 14, borderRadius: 7, background: a.hex, boxShadow: `0 0 18px ${a.glow}`, flexShrink: 0 }} />
                  )}
                  <div>
                    <div style={{ fontFamily: F2.sans, fontWeight: 600, fontSize: big ? 54 : 40, letterSpacing: "-0.02em", color: T.text, lineHeight: 1.15 }}>{c.title}</div>
                    {c.sub ? <div style={{ fontFamily: F2.sans, fontSize: big ? 32 : 27, color: T.dim, marginTop: 8 }}>{c.sub}</div> : null}
                  </div>
                </div>
              </Panel>
            );
          })}
        </div>
      </div>
    </Scene>
  );
};

// month grid with accent-highlighted days ("shipped every day this week" beats)
export const CalendarCard: React.FC<{ month?: string; highlights?: number[]; label?: string }> = ({ month = "This month", highlights = [], label }) => {
  const a = useAccent();
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const hi = new Set(highlights);
  return (
    <Scene bg="grid">
      <div style={{ width: "100%", maxWidth: 780 }}>
        <Panel style={{ padding: "44px 46px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 34 }}>
            <span style={{ fontFamily: F2.sans, fontWeight: 600, fontSize: 44, letterSpacing: "-0.02em", color: T.text }}>{month}</span>
            <span style={{ fontFamily: F2.mono, fontSize: 24, color: T.faint, letterSpacing: "0.1em" }}>{highlights.length ? `${highlights.length} days` : ""}</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 12, marginBottom: 14 }}>
            {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
              <div key={i} style={{ textAlign: "center", fontFamily: F2.mono, fontSize: 22, color: T.faint }}>{d}</div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 12 }}>
            {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => {
              const on = hi.has(d);
              const e = spr(f, fps, 6 + d * 1.2, { damping: 20 });
              const pulse = on ? 0.85 + 0.15 * Math.sin(f / 7 + d) : 1;
              return (
                <div
                  key={d}
                  style={{
                    aspectRatio: "1",
                    borderRadius: 14,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: F2.sans,
                    fontWeight: 600,
                    fontSize: 27,
                    color: on ? T.bg : T.dim,
                    background: on ? a.hex : T.surface,
                    border: `1px solid ${on ? a.hex : T.border}`,
                    boxShadow: on ? `0 0 ${22 * pulse}px ${a.glow}` : "none",
                    opacity: e,
                    transform: `scale(${interpolate(e, [0, 1], [0.6, 1])})`,
                  }}
                >
                  {d}
                </div>
              );
            })}
          </div>
        </Panel>
        {label ? <div style={{ fontFamily: F2.sans, fontWeight: 500, fontSize: 34, color: T.dim, textAlign: "center", marginTop: 28 }}>{label}</div> : null}
      </div>
    </Scene>
  );
};

// vertical steps with an accent spine
export const Timeline: React.FC<{ title?: string; steps: { title: string; sub?: string }[] }> = ({ title, steps }) => {
  const a = useAccent();
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <Scene bg="plain">
      <div style={{ width: "100%", maxWidth: 820 }}>
        {title ? <Kicker text={title} /> : null}
        <div style={{ position: "relative", paddingLeft: 54 }}>
          <div style={{ position: "absolute", left: 17, top: 10, bottom: 10, width: 3, borderRadius: 2, background: `linear-gradient(180deg, ${a.hex}, transparent)` }} />
          {steps.slice(0, 4).map((s, i) => {
            const e = spr(f, fps, 6 + i * 10, { damping: 18 });
            return (
              <div key={i} style={{ position: "relative", marginBottom: 42, opacity: e, transform: `translateX(${interpolate(e, [0, 1], [-30, 0])}px)` }}>
                <div style={{ position: "absolute", left: -49, top: 12, width: 30, height: 30, borderRadius: 15, background: T.bg, border: `3px solid ${a.hex}`, boxShadow: `0 0 18px ${a.glow}` }} />
                <div style={{ fontFamily: F2.sans, fontWeight: 600, fontSize: 46, letterSpacing: "-0.02em", color: T.text }}>{s.title}</div>
                {s.sub ? <div style={{ fontFamily: F2.sans, fontSize: 30, color: T.dim, marginTop: 6 }}>{s.sub}</div> : null}
              </div>
            );
          })}
        </div>
      </div>
    </Scene>
  );
};

// AI chat exchange (claude / chatgpt style), assistant reply types itself
export const Chat: React.FC<{ app?: string; messages: { role: "user" | "ai"; text: string }[] }> = ({ app = "claude", messages }) => {
  const a = useAccent();
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ms = messages.slice(0, 4);
  const CPS = 30;
  // how many chars of message k are visible (messages appear sequentially)
  const startF = (k: number) => 8 + ms.slice(0, k).reduce((acc, m) => acc + (m.role === "ai" ? (m.text.length / CPS) * fps : 12) + 10, 0);
  return (
    <Scene bg="plain">
      <div style={{ width: "100%", maxWidth: 860 }}>
        <Panel style={{ padding: "36px 40px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, paddingBottom: 26, borderBottom: `1px solid ${T.border}`, marginBottom: 30 }}>
            {hasLogo(app) ? <Logo name={app} size={40} color="#fff" /> : <div style={{ width: 14, height: 14, borderRadius: 7, background: a.hex }} />}
            <span style={{ fontFamily: F2.sans, fontWeight: 600, fontSize: 30, color: T.dim, textTransform: "capitalize" }}>{app}</span>
          </div>
          {ms.map((m, k) => {
            const s = startF(k);
            const vis = spr(f, fps, s, { damping: 20 });
            if (f < s - 4) return null;
            const shown = m.role === "ai" ? m.text.slice(0, Math.max(0, Math.floor(((f - s) / fps) * CPS))) : m.text;
            const done = m.role !== "ai" || shown.length >= m.text.length;
            return (
              <div key={k} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", marginBottom: 22, opacity: vis }}>
                <div
                  style={{
                    maxWidth: "82%",
                    padding: "20px 28px",
                    borderRadius: m.role === "user" ? "22px 22px 6px 22px" : "22px 22px 22px 6px",
                    background: m.role === "user" ? a.soft : T.surface2,
                    border: `1px solid ${m.role === "user" ? a.dim : T.border}`,
                    fontFamily: F2.sans,
                    fontSize: 33,
                    lineHeight: 1.4,
                    color: T.text,
                  }}
                >
                  {shown}
                  {!done ? <span style={{ color: a.hex, opacity: Math.floor(f / 8) % 2 ? 1 : 0 }}>▍</span> : null}
                </div>
              </div>
            );
          })}
        </Panel>
      </div>
    </Scene>
  );
};

// iOS-style notification stack dropping in
export const Notifications: React.FC<{ items: { app: string; title: string; body?: string; brand?: string }[] }> = ({ items }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <Scene bg="shader">
      <div style={{ width: "100%", maxWidth: 800, display: "flex", flexDirection: "column", gap: 22 }}>
        {items.slice(0, 4).map((n, i) => {
          const e = spr(f, fps, 6 + i * 12, { damping: 17, stiffness: 150 });
          return (
            <div
              key={i}
              style={{
                background: "rgba(22,22,26,0.92)",
                border: `1px solid ${T.borderBright}`,
                borderRadius: 26,
                padding: "26px 30px",
                display: "flex",
                gap: 22,
                alignItems: "center",
                boxShadow: "0 30px 70px -20px rgba(0,0,0,0.8)",
                opacity: e,
                transform: `translateY(${interpolate(e, [0, 1], [-70, 0])}px) scale(${interpolate(e, [0, 1], [0.92, 1])})`,
              }}
            >
              <div style={{ width: 74, height: 74, borderRadius: 20, background: T.surface2, border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {n.brand && hasLogo(n.brand) ? <Logo name={n.brand} size={42} color="#fff" /> : <span style={{ fontFamily: F2.sans, fontWeight: 700, fontSize: 34, color: T.text }}>{n.app.slice(0, 1).toUpperCase()}</span>}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", gap: 14, alignItems: "baseline" }}>
                  <span style={{ fontFamily: F2.sans, fontWeight: 700, fontSize: 32, color: T.text }}>{n.app}</span>
                  <span style={{ fontFamily: F2.sans, fontSize: 24, color: T.faint }}>now</span>
                </div>
                <div style={{ fontFamily: F2.sans, fontWeight: 600, fontSize: 32, color: T.text, marginTop: 4 }}>{n.title}</div>
                {n.body ? <div style={{ fontFamily: F2.sans, fontSize: 28, color: T.dim, marginTop: 3 }}>{n.body}</div> : null}
              </div>
            </div>
          );
        })}
      </div>
    </Scene>
  );
};

// accent check list
export const Checklist: React.FC<{ title?: string; items: string[] }> = ({ title, items }) => {
  const a = useAccent();
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <Scene bg="plain">
      <div style={{ width: "100%", maxWidth: 840 }}>
        {title ? (
          <div style={{ fontFamily: F2.sans, fontWeight: 700, fontSize: 66, letterSpacing: "-0.03em", color: T.text, marginBottom: 44 }}>{title}</div>
        ) : null}
        {items.slice(0, 5).map((it, i) => {
          const e = spr(f, fps, 8 + i * 9, { damping: 18 });
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 26, marginBottom: 32, opacity: e, transform: `translateX(${interpolate(e, [0, 1], [-36, 0])}px)` }}>
              <div style={{ width: 52, height: 52, borderRadius: 16, background: a.soft, border: `1px solid ${a.dim}`, boxShadow: `0 0 24px -6px ${a.glow}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={a.hex} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
              </div>
              <span style={{ fontFamily: F2.sans, fontWeight: 500, fontSize: 46, letterSpacing: "-0.015em", color: T.text, lineHeight: 1.15 }}>{it}</span>
            </div>
          );
        })}
      </div>
    </Scene>
  );
};

// keyboard shortcut hero ("just press ⌘K")
export const Kbd: React.FC<{ keys: string[]; label?: string }> = ({ keys, label }) => {
  const a = useAccent();
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <Scene bg="grid">
      <div style={{ textAlign: "center" }}>
        <div style={{ display: "flex", gap: 26, justifyContent: "center", alignItems: "center" }}>
          {keys.slice(0, 4).map((k, i) => {
            const e = spr(f, fps, 4 + i * 7, { damping: 14, stiffness: 190 });
            return (
              <div
                key={i}
                style={{
                  minWidth: 150,
                  padding: "34px 42px",
                  borderRadius: 28,
                  background: "linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0.03))",
                  border: `1px solid ${T.borderBright}`,
                  borderBottom: `4px solid ${a.dim}`,
                  boxShadow: `0 24px 60px -18px rgba(0,0,0,0.8), 0 0 50px -18px ${a.glow}`,
                  fontFamily: F2.mono,
                  fontWeight: 700,
                  fontSize: 84,
                  color: T.text,
                  opacity: e,
                  transform: `translateY(${interpolate(e, [0, 1], [40, 0])}px) scale(${interpolate(e, [0, 1], [0.8, 1])})`,
                }}
              >
                {k}
              </div>
            );
          })}
        </div>
        {label ? <div style={{ fontFamily: F2.sans, fontWeight: 500, fontSize: 40, color: T.dim, marginTop: 44 }}>{label}</div> : null}
      </div>
    </Scene>
  );
};
