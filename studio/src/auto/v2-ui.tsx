import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { F2, T, useAccent } from "./theme";
import { Panel, Scene } from "./fx";
import { Logo, hasLogo } from "./logos";
import { Caret, Float, LiveDot, LogoTile, ObjectCard, RevealText, Surface, TickList, Underline, breathe, clamp01, rise, schedule, useT, Kicker } from "./kit";

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
      <Float style={{ width: "100%", maxWidth: 940 }} seed={0.6} amp={4}>
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
      </Float>
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
      <Float style={{ width: "100%", maxWidth: 780 }} seed={1.6} amp={4}>
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
      </Float>
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
      <Float style={{ width: "100%", maxWidth: 820 }} seed={2.8} amp={4}>
        <ObjectCard pad="44px 50px 8px">
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
        </ObjectCard>
      </Float>
    </Scene>
  );
};

// ── Chat — an AI conversation. User bubble slides in, the assistant "thinks" (3 dots),
// then its reply STREAMS word by word (newest words fade up) — paced to the beat. An input
// bar waits at the bottom with a blinking caret for the rest of the hold.
export const Chat: React.FC<{ app?: string; messages: { role: "user" | "ai"; text: string }[] }> = ({ app = "claude", messages }) => {
  const a = useAccent();
  const { f, fps, beat, sp } = useT();
  const ms = messages.slice(0, 4);
  const THINK = 18;
  const aiChars = ms.filter((m) => m.role === "ai").reduce((n, m) => n + m.text.length, 0);
  const nUser = ms.filter((m) => m.role !== "ai").length;
  const budget = Math.max(20, beat * 0.62 - 10 - nUser * 14 - (ms.length - nUser) * THINK);
  const cps = Math.max(30, Math.min(80, (aiChars / budget) * fps));
  const sched: { at: number; streamAt: number; done: number }[] = [];
  let cur = 8;
  for (const m of ms) {
    if (m.role === "ai") {
      const streamAt = cur + THINK;
      const done = streamAt + Math.ceil((m.text.length / cps) * fps);
      sched.push({ at: cur, streamAt, done });
      cur = done + 10;
    } else {
      sched.push({ at: cur, streamAt: cur, done: cur });
      cur += 16;
    }
  }
  const allDone = cur;
  const e = sp(0);
  const name = app.charAt(0).toUpperCase() + app.slice(1);
  return (
    <Scene bg="plain">
      <Float style={{ width: "100%", maxWidth: 880 }} seed={1.4} amp={4}>
        <div style={rise(e, 36, 0.96)}>
          <Surface glow style={{ padding: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "24px 32px", borderBottom: `1px solid ${T.border}` }}>
              <LogoTile brand={app} letter={app} size={52} />
              <span style={{ fontFamily: F2.sans, fontWeight: 600, fontSize: 32, color: T.text, flex: 1 }}>{name}</span>
              <LiveDot size={11} />
            </div>
            <div style={{ padding: "30px 32px 10px" }}>
              {ms.map((m, k) => {
                const s = sched[k];
                const vis = f < s.at - 2 ? 0 : sp(s.at, "snappy");
                if (m.role !== "ai") {
                  return (
                    <div key={k} style={{ display: "flex", justifyContent: "flex-end", marginBottom: 24, ...rise(vis, 18, 0.94), transformOrigin: "right bottom" }}>
                      <div style={{ maxWidth: "80%", padding: "20px 28px", borderRadius: "26px 26px 8px 26px", background: a.soft, border: `1px solid ${a.dim}`, fontFamily: F2.sans, fontSize: 34, lineHeight: 1.38, color: T.text }}>{m.text}</div>
                    </div>
                  );
                }
                const words = m.text.split(" ");
                const perWord = Math.max(1, m.text.length / Math.max(1, words.length));
                const n = f < s.streamAt ? 0 : Math.min(words.length, (((f - s.streamAt) / fps) * cps) / perWord);
                const thinking = f >= s.at && f < s.streamAt;
                return (
                  <div key={k} style={{ display: "flex", gap: 16, alignItems: "flex-start", marginBottom: 24, ...rise(vis, 14, 0.97) }}>
                    <LogoTile brand={app} letter={app} size={46} radius={23} />
                    <div style={{ position: "relative", maxWidth: "82%", padding: "18px 26px", borderRadius: "8px 26px 26px 26px", background: "rgba(255,255,255,0.06)", border: `1px solid ${T.border}`, fontFamily: F2.sans, fontSize: 34, lineHeight: 1.38, color: T.text, minHeight: 68 }}>
                      {thinking ? (
                        <span style={{ position: "absolute", left: 26, top: 18, display: "inline-flex", gap: 9, alignItems: "center", height: 46 }}>
                          {[0, 1, 2].map((d) => {
                            const b = Math.max(0, Math.sin((f - s.at) / 3.2 - d * 0.9));
                            return <span key={d} style={{ width: 12, height: 12, borderRadius: 6, background: a.hex, opacity: 0.35 + 0.65 * b, transform: `translateY(${-5 * b}px)` }} />;
                          })}
                        </span>
                      ) : null}
                      {words.map((w, i) => {
                          const o = clamp01(n - i);
                          return (
                            <span key={i} style={{ opacity: o, display: "inline-block", transform: `translateY(${(1 - o) * 6}px)`, marginRight: "0.26em" }}>
                              {w}
                            </span>
                          );
                        })}
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ margin: "0 24px 24px", padding: "18px 22px 18px 26px", borderRadius: 20, border: `1px solid ${T.border}`, background: "rgba(0,0,0,0.25)", display: "flex", alignItems: "center", gap: 14 }}>
              <span style={{ flex: 1, fontFamily: F2.sans, fontSize: 28, color: T.faint }}>
                Reply to {name}...
                {f > allDone ? <Caret /> : null}
              </span>
              <span style={{ width: 46, height: 46, borderRadius: 14, background: f > allDone ? a.hex : "rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={f > allDone ? T.bg : T.faint} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 19V5" />
                  <path d="M5 12l7-7 7 7" />
                </svg>
              </span>
            </div>
          </Surface>
        </div>
      </Float>
    </Scene>
  );
};

// ── Notifications — iOS-style banners DROP in (paced over the beat) with a haptic wiggle
// as each lands; the newest one keeps a soft accent glow through the hold.
export const Notifications: React.FC<{ items: { app: string; title: string; body?: string; brand?: string }[] }> = ({ items }) => {
  const a = useAccent();
  const { f, beat, sp } = useT();
  const its = items.slice(0, 4);
  const at = schedule(its.length, beat, { start: 6, fill: 0.42, min: 10, max: 36 });
  const newest = at.reduce((k, t, i) => (f >= t ? i : k), -1);
  return (
    <Scene bg="shader">
      <Float style={{ width: "100%", maxWidth: 820, display: "flex", flexDirection: "column", gap: 20 }} seed={2.4} amp={4}>
        {its.map((n, i) => {
          const e = sp(at[i], "bouncy");
          const land = f - at[i];
          const wig = land > 3 && land < 18 ? Math.sin(land * 1.9) * (18 - land) * 0.09 : 0;
          const hot = i === newest;
          return (
            <div key={i} style={{ opacity: clamp01(e * 1.6), transform: `translateY(${(1 - e) * -90}px) scale(${interpolate(e, [0, 1], [0.9, 1])}) rotate(${wig}deg)` }}>
              <div style={{ background: "linear-gradient(180deg, rgba(38,38,44,0.94), rgba(24,24,28,0.94))", border: `1px solid ${hot ? a.dim : T.borderBright}`, borderRadius: 30, padding: "24px 28px", display: "flex", gap: 22, alignItems: "center", boxShadow: `0 30px 70px -24px rgba(0,0,0,0.85)${hot ? `, 0 0 ${40 + 20 * breathe(f, 80)}px -18px ${a.glow}` : ""}` }}>
                <LogoTile brand={n.brand} letter={n.app} size={76} radius={20} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: "flex", gap: 14, alignItems: "baseline", justifyContent: "space-between" }}>
                    <span style={{ fontFamily: F2.sans, fontWeight: 600, fontSize: 26, color: T.dim, textTransform: "uppercase", letterSpacing: "0.05em" }}>{n.app}</span>
                    <span style={{ fontFamily: F2.sans, fontSize: 24, color: T.faint }}>now</span>
                  </div>
                  <div style={{ fontFamily: F2.sans, fontWeight: 650, fontSize: 35, letterSpacing: "-0.015em", color: T.text, marginTop: 4, lineHeight: 1.2 }}>{n.title}</div>
                  {n.body ? <div style={{ fontFamily: F2.sans, fontSize: 29, color: T.dim, marginTop: 4, lineHeight: 1.25 }}>{n.body}</div> : null}
                </div>
              </div>
            </div>
          );
        })}
      </Float>
    </Scene>
  );
};

// ── Checklist — the gist in ticks: title rises with an accent underline, boxes appear and
// their ticks DRAW (paced), text brightens; afterwards a soft light sweeps down the list.
export const Checklist: React.FC<{ title?: string; items: string[] }> = ({ title, items }) => {
  const { f, beat } = useT();
  const its = items.slice(0, 5);
  const at = schedule(its.length, beat, { start: title ? 12 : 6, fill: 0.45, min: 8, max: 26 });
  const done = (at[at.length - 1] ?? 0) + 24;
  const sweep = f > done ? ((f - done) % 110) / 110 : -1;
  return (
    <Scene bg="plain">
      <Float style={{ width: "100%", maxWidth: 860 }} seed={3.4} amp={4}>
        <ObjectCard pad="46px 52px">
        {title ? (
          <div style={{ marginBottom: 46 }}>
            <div style={{ fontFamily: F2.sans, fontWeight: 700, fontSize: 70, letterSpacing: "-0.04em", color: T.text, lineHeight: 1.05 }}>
              <RevealText text={title} start={2} />
            </div>
            <Underline start={10} dur={18} width={140} thickness={6} style={{ marginTop: 20 }} />
          </div>
        ) : null}
        <div style={{ position: "relative" }}>
          <TickList items={its} starts={at} size={46} gap={30} />
          {sweep >= 0 ? <div style={{ position: "absolute", left: -30, right: -30, height: 90, top: `${sweep * 130 - 20}%`, background: "linear-gradient(180deg, transparent, rgba(255,255,255,0.05), transparent)", pointerEvents: "none" }} /> : null}
        </div>
        </ObjectCard>
      </Float>
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
      <Float style={{ textAlign: "center" }} seed={3.9} amp={5}>
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
      </Float>
    </Scene>
  );
};
