import { Easing, interpolate } from "remotion";
import { F2, T, useAccent } from "./theme";
import { Scene } from "./fx";
import {
  Beam, Caret, Check, Chip, Float, Label, LiveDot, LogoChip, LogoDraw, LogoTile, Ripple, RevealText, Sheen, Spinner, Surface, Window,
  breathe, clamp01, focusIn, pop, ramp, rise, schedule, slide, typed, useT, Kicker } from "./kit";
import { hasLogo } from "./logos";

// ── tool-review scenes — the arc of "a tool people can actually use" ──────────
//   toolcard  → what it is          install → how you get it
//   runlog    → watching it work    beforeafter → what it replaces
//   catch     → the fine print      getit → where to find it
// Built from kit.tsx. Every scene: one choreographed entrance paced to the beat
// (useBeat), then HOLD-LIFE (beam / sheen / float / flowing detail) so a 6s hold
// never freezes. T tokens + ONE accent, content ≤ ~950px wide, inside <Scene>.

// ── ToolCard — "what it is": the spec sheet at a glance ──────────────────────
// Logo tile pops (mark draws itself, a ring ripples out, an orbit ring turns), the name
// rises out of a mask, the one-liner focuses in, meta chips stagger, optional spec rows
// (model releases: context / price / benchmark — REAL values) slide in. Beam circles the card.
export const ToolCard: React.FC<{ name: string; tagline?: string; brand?: string; by?: string; chips?: string[]; badge?: string; specs?: { label: string; value: string }[] }> = ({
  name,
  tagline,
  brand,
  by,
  chips = [],
  badge,
  specs = [],
}) => {
  const a = useAccent();
  const { f, sp } = useT();
  const e = sp(0);
  const le = sp(4, "bouncy");
  const te = sp(16, "snappy");
  const nameSize = Math.max(58, Math.min(124, Math.round(1300 / Math.max(name.length, 6))));
  const mark = brand ?? name;
  const glowK = breathe(f, 96);
  const ss = specs.slice(0, 4);
  return (
    <Scene bg="shader">
      <Float style={{ width: "100%", maxWidth: 880 }} seed={0.4}>
        <div style={rise(e, 44, 0.94)}>
          <Surface glow beam radius={34} style={{ padding: "58px 52px 50px", textAlign: "center" }}>
            {badge ? (
              <div style={{ position: "absolute", top: 26, left: 28, ...pop(sp(20, "bouncy"), 0.6) }}>
                <Chip hero style={{ fontSize: 20, padding: "8px 16px" }}>
                  <LiveDot size={9} />
                  {badge}
                </Chip>
              </div>
            ) : null}
            {/* logo block: orbit ring + one-shot ripple + tile with the mark drawing itself */}
            <div style={{ position: "relative", width: 168, height: 168, margin: "0 auto 36px" }}>
              <div style={{ position: "absolute", inset: -34, borderRadius: "50%", border: `1.5px dashed ${a.dim}`, opacity: 0.35 * clamp01(le), transform: `rotate(${f * 0.35}deg)` }} />
              <Ripple x={84} y={84} at={10} size={250} />
              <div style={{ position: "absolute", inset: 0, ...pop(le, 0.4) }}>
                <div
                  style={{
                    width: 168,
                    height: 168,
                    borderRadius: 46,
                    background: "linear-gradient(180deg, rgba(255,255,255,0.13), rgba(255,255,255,0.04))",
                    border: `1px solid ${T.borderBright}`,
                    boxShadow: `0 0 ${70 + glowK * 40}px -16px ${a.glow}, inset 0 1px 0 rgba(255,255,255,0.18)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {hasLogo(mark) ? <LogoDraw brand={mark} size={92} start={6} /> : <span style={{ fontFamily: F2.sans, fontWeight: 700, fontSize: 80, color: T.text }}>{name.slice(0, 1).toUpperCase()}</span>}
                </div>
              </div>
            </div>
            <div style={{ fontFamily: F2.sans, fontWeight: 700, fontSize: nameSize, letterSpacing: "-0.045em", lineHeight: 1.02, color: T.text }}>
              <RevealText text={name} start={9} step={3} center />
            </div>
            {tagline ? <div style={{ fontFamily: F2.sans, fontWeight: 500, fontSize: 34, lineHeight: 1.3, color: T.dim, marginTop: 18, ...focusIn(te) }}>{tagline}</div> : null}
            {by ? <Label style={{ marginTop: 20, opacity: clamp01(te) }}>by {by}</Label> : null}
            {chips.length ? (
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 14, marginTop: 36 }}>
                {chips.slice(0, 5).map((c, i) => (
                  <span key={i} style={{ ...pop(sp(22 + i * 5, "bouncy"), 0.7), display: "inline-block" }}>
                    <Chip hero={i === 0}>{c}</Chip>
                  </span>
                ))}
              </div>
            ) : null}
            {ss.length ? (
              <div style={{ marginTop: 34, borderTop: `1px solid ${T.border}`, textAlign: "left" }}>
                {ss.map((s, i) => {
                  const re = sp(30 + chips.length * 5 + i * 6, "snappy");
                  return (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 20, padding: "18px 6px", borderBottom: i < ss.length - 1 ? `1px solid ${T.border}` : "none", ...slide(re, -22) }}>
                      <span style={{ fontFamily: F2.mono, fontSize: 23, letterSpacing: "0.12em", textTransform: "uppercase", color: T.faint }}>{s.label}</span>
                      <span style={{ fontFamily: F2.sans, fontWeight: 700, fontSize: 36, letterSpacing: "-0.02em", color: i === 0 ? a.hex : T.text, textShadow: i === 0 ? `0 0 26px ${a.glow}` : "none" }}>{s.value}</span>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </Surface>
        </div>
      </Float>
    </Scene>
  );
};

// ── Install — "how you get it": numbered steps, commands type themselves, ticks land ─
// Steps run strictly in sequence, spread across the beat: a step wakes (ring spins), its
// command types, ↵ flashes, the ring becomes an accent check and the rail fills down to the
// next step. After the last tick a light keeps travelling down the finished rail.
export const Install: React.FC<{ title?: string; steps: { title: string; cmd?: string; sub?: string }[] }> = ({ title, steps }) => {
  const a = useAccent();
  const { f, fps, beat, sp } = useT();
  const ss = steps.slice(0, 4);
  // schedule: typing time per step; spread idle gaps over the beat (or speed typing up when tight)
  const base = ss.map((s) => (s.cmd ? (s.cmd.length / 32) * fps : 0) + (s.cmd ? 14 : 16));
  const need = base.reduce((x, y) => x + y, 0);
  const avail = beat * 0.62 - 10;
  const speed = need > avail ? Math.min(2.2, need / Math.max(avail, 1)) : 1;
  const gap = need < avail ? Math.min(28, (avail - need) / ss.length) : 3;
  const cps = 32 * speed;
  const sched: { start: number; done: number; tick: number }[] = [];
  let cur = 10;
  for (const s of ss) {
    const typeF = s.cmd ? Math.ceil((s.cmd.length / cps) * fps) : 0;
    const start = cur;
    const done = start + typeF;
    const tick = done + (s.cmd ? 9 : 14);
    sched.push({ start, done, tick });
    cur = tick + gap;
  }
  const allDone = sched.length ? sched[sched.length - 1].tick : 0;
  const e = sp(0);
  const RING = 58;
  return (
    <Scene bg="grid">
      <Float style={{ width: "100%", maxWidth: 900 }} seed={1.1} amp={4}>
        <div style={rise(e, 36)}>
          {title ? <Kicker text={title} /> : null}
          <Surface sheen style={{ padding: "16px 0" }}>
            {ss.map((s, i) => {
              const { start, done, tick } = sched[i];
              const re = sp(3 + i * 5, "snappy");
              const active = f >= start && f < tick;
              const ticked = f >= tick;
              const tp = sp(tick, "bouncy");
              const t = s.cmd ? typed(s.cmd, f, start, cps, fps) : null;
              const dimmed = !active && !ticked;
              const enter = f >= done && f < done + 9;
              // rail below this ring fills from this tick to the next step's start
              const nextStart = i < ss.length - 1 ? sched[i + 1].start : tick;
              const fill = ramp(f, tick, Math.max(tick + 8, nextStart), 0, 1, Easing.out(Easing.cubic));
              // hold-life: after everything, a light travels down the rail
              const loop = f > allDone + 10 ? ((f - allDone - 10) % 80) / 80 : -1;
              return (
                <div key={i} style={{ position: "relative", display: "flex", gap: 26, alignItems: "flex-start", padding: "24px 40px", borderBottom: i < ss.length - 1 ? `1px solid ${T.border}` : "none", opacity: clamp01(re * 1.3) * (dimmed ? 0.42 : 1), transform: `translateX(${(1 - re) * -24}px)` }}>
                  {i < ss.length - 1 ? (
                    <div style={{ position: "absolute", left: 40 + RING / 2 - 1.5, top: 24 + RING + 6, bottom: -24 + 6, width: 3, borderRadius: 2, background: T.border, overflow: "hidden" }}>
                      <div style={{ width: "100%", height: `${fill * 100}%`, background: `linear-gradient(180deg, ${a.hex}, ${a.dim})`, boxShadow: `0 0 12px ${a.glow}` }} />
                      {loop >= 0 ? <div style={{ position: "absolute", left: -2, width: 7, height: 34, borderRadius: 4, top: `${loop * 130 - 20}%`, background: `linear-gradient(180deg, transparent, #fff, transparent)`, opacity: 0.8 }} /> : null}
                    </div>
                  ) : null}
                  <div style={{ position: "relative", width: RING, height: RING, flexShrink: 0, marginTop: 2 }}>
                    {active ? (
                      <svg width={RING} height={RING} viewBox="0 0 58 58" style={{ position: "absolute", inset: 0, transform: `rotate(${f * 9}deg)` }}>
                        <circle cx="29" cy="29" r="27" fill="none" stroke={a.hex} strokeWidth="2.5" strokeDasharray="40 130" strokeLinecap="round" />
                      </svg>
                    ) : null}
                    <div style={{ position: "absolute", inset: 0, borderRadius: RING, border: `2px solid ${ticked ? a.hex : active ? a.dim : T.borderBright}`, background: ticked ? a.hex : active ? a.soft : "transparent", boxShadow: ticked ? `0 0 ${22 + 10 * breathe(f, 80, i)}px ${a.glow}` : "none", display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${ticked ? interpolate(tp, [0, 1], [1.3, 1]) : 1})` }}>
                      {ticked ? <Check size={28} color={T.bg} width={3.6} progress={ramp(f, tick, tick + 8)} /> : <span style={{ fontFamily: F2.mono, fontWeight: 700, fontSize: 25, color: active ? a.hex : T.faint }}>{i + 1}</span>}
                    </div>
                    <Ripple x={RING / 2} y={RING / 2} at={tick} size={110} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: F2.sans, fontWeight: 600, fontSize: 36, letterSpacing: "-0.02em", color: ticked || active ? T.text : T.dim, lineHeight: 1.2 }}>{s.title}</div>
                    {s.sub ? <div style={{ fontFamily: F2.sans, fontSize: 26, color: T.faint, marginTop: 4 }}>{s.sub}</div> : null}
                    {s.cmd && t ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 14, padding: "12px 14px 12px 20px", borderRadius: 14, background: "#0A0A0E", border: `1px solid ${active ? a.dim : T.border}`, boxShadow: active ? `0 0 30px -12px ${a.glow}` : "none", maxWidth: "100%" }}>
                        <span style={{ fontFamily: F2.mono, fontSize: 26, color: a.hex }}>$</span>
                        <span style={{ fontFamily: F2.mono, fontSize: 26, color: ticked ? T.dim : T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: 1, minWidth: 0 }}>
                          {t.shown}
                          {active && !t.done ? <Caret solid /> : null}
                        </span>
                        {/* ↵ flashes on enter; a copy glyph turns into a check once the step is done */}
                        <span style={{ flexShrink: 0, width: 40, height: 34, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${enter ? a.hex : T.border}`, background: enter ? a.soft : "transparent", fontFamily: F2.mono, fontSize: 20, color: enter ? a.hex : T.faint }}>
                          {ticked ? <Check size={18} width={3} /> : enter ? "↵" : (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.faint} strokeWidth="2.2"><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></svg>
                          )}
                        </span>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </Surface>
        </div>
      </Float>
    </Scene>
  );
};

// shimmering text — the "agent is working on this" sweep (Claude Code style)
const Shimmer: React.FC<{ text: string; f: number; style?: React.CSSProperties }> = ({ text, f, style }) => (
  <span
    style={{
      backgroundImage: `linear-gradient(90deg, ${T.dim} 0%, ${T.dim} 35%, #FFFFFF 50%, ${T.dim} 65%, ${T.dim} 100%)`,
      backgroundSize: "250% 100%",
      backgroundPosition: `${100 - ((f * 2.2) % 150)}% 0`,
      WebkitBackgroundClip: "text",
      backgroundClip: "text",
      color: "transparent",
      ...style,
    }}
  >
    {text}
  </span>
);

// ── RunLog — "watching it actually work": a task log streams, spinners become ticks,
// a thin progress line fills, the result lands late in the accent. Status pill in the
// title bar flips running → done. Details (right column) are REAL facts only.
export const RunLog: React.FC<{ title?: string; steps: { text: string; detail?: string }[]; result?: { text: string; sub?: string } }> = ({ title, steps, result }) => {
  const a = useAccent();
  const { f, beat, sp } = useT();
  const ss = steps.slice(0, 5);
  const at = schedule(ss.length, beat, { start: 12, fill: 0.5, min: 12, max: 38 });
  const step = ss.length > 1 ? at[1] - at[0] : 20;
  const SPIN = Math.max(9, Math.min(24, Math.round(step * 0.72)));
  const doneAt = at.map((x) => x + SPIN);
  const lastDone = doneAt[doneAt.length - 1] ?? 20;
  const resultAt = lastDone + 8;
  const finished = f >= (result ? resultAt : lastDone);
  const prog = ss.length ? interpolate(f, [at[0], ...doneAt], [0, ...doneAt.map((_, i) => (i + 1) / ss.length)], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0;
  const e = sp(0);
  const re = sp(resultAt, "bouncy");
  const pill = (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "7px 16px", borderRadius: 999, flexShrink: 0, background: finished ? a.soft : "rgba(255,255,255,0.05)", border: `1px solid ${finished ? a.dim : T.border}`, fontFamily: F2.mono, fontSize: 20, letterSpacing: "0.08em", color: finished ? a.hex : T.dim }}>
      {finished ? <Check size={18} width={3.4} /> : <Spinner size={18} />}
      {finished ? "done" : "running"}
    </span>
  );
  return (
    <Scene bg="plain">
      <Float style={{ width: "100%", maxWidth: 920 }} seed={2.3} amp={4}>
        <div style={rise(e, 36, 0.95)}>
          <Window
            glow
            title={title ? <><span style={{ color: a.hex }}>❯ </span>{title}</> : undefined}
            right={pill}
            bodyStyle={{ padding: "0 34px 28px" }}
          >
            <div style={{ height: 3, margin: "0 -34px 14px", background: "rgba(255,255,255,0.04)", position: "relative", overflow: "hidden" }}>
              <div style={{ width: `${prog * 100}%`, height: "100%", background: `linear-gradient(90deg, ${a.dim}, ${a.hex})`, boxShadow: `0 0 12px ${a.glow}` }} />
            </div>
            {ss.map((s, i) => {
              const se = sp(at[i], "snappy");
              const done = f >= doneAt[i];
              const active = f >= at[i] && !done;
              const de = sp(doneAt[i], "bouncy");
              const queued = f < at[i];
              return (
                <div key={i} style={{ position: "relative", display: "flex", alignItems: "center", gap: 20, padding: "14px 14px", margin: "0 -14px", borderRadius: 14, background: active ? "rgba(255,255,255,0.04)" : "transparent", opacity: queued ? 0.38 * clamp01(e) : 1, transform: `translateY(${queued ? 0 : (1 - clamp01(se)) * 6}px)` }}>
                  <div style={{ width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {done ? <div style={{ transform: `scale(${interpolate(de, [0, 1], [0.3, 1])})`, display: "flex" }}><Check size={32} width={3.4} progress={ramp(f, doneAt[i], doneAt[i] + 7)} /></div> : queued ? <div style={{ width: 24, height: 24, borderRadius: 12, border: `2px solid ${T.borderBright}` }} /> : <Spinner size={30} />}
                  </div>
                  <span style={{ fontFamily: F2.mono, fontSize: 31, flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: done ? T.dim : T.text }}>
                    {active ? <Shimmer text={s.text} f={f} /> : s.text}
                  </span>
                  {s.detail ? <span style={{ fontFamily: F2.mono, fontSize: 24, color: T.faint, flexShrink: 0, maxWidth: "46%", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", opacity: done ? clamp01(de) : 0, transform: `translateX(${done ? (1 - clamp01(de)) * 12 : 12}px)` }}>{s.detail}</span> : null}
                </div>
              );
            })}
            {result ? (
              <div style={{ marginTop: 16, paddingTop: 22, borderTop: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 22, opacity: f >= resultAt - 1 ? 1 : 0 }}>
                <div style={{ position: "relative", width: 46, height: 46, flexShrink: 0 }}>
                  <div style={{ position: "absolute", inset: 0, borderRadius: 23, background: a.hex, boxShadow: `0 0 ${24 + 14 * breathe(f, 70)}px ${a.glow}`, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${interpolate(re, [0, 1], [0.2, 1])})` }}>
                    <Check size={26} color={T.bg} width={3.8} progress={ramp(f, resultAt + 2, resultAt + 10)} />
                  </div>
                  <Ripple x={23} y={23} at={resultAt} size={130} />
                </div>
                <div style={{ minWidth: 0, ...slide(re, -16) }}>
                  <div style={{ fontFamily: F2.sans, fontWeight: 700, fontSize: 40, letterSpacing: "-0.025em", color: a.hex, textShadow: `0 0 28px ${a.glow}`, lineHeight: 1.12 }}>{result.text}</div>
                  {result.sub ? <div style={{ fontFamily: F2.mono, fontSize: 23, color: T.dim, marginTop: 6 }}>{result.sub}</div> : null}
                </div>
              </div>
            ) : null}
          </Window>
        </div>
      </Float>
    </Scene>
  );
};

// ── BeforeAfter — "what it replaces": each row's old way gets struck through, an arrow
// draws, the new way springs in on the accent. Rows paced over the beat; afterwards a slow
// glow wave runs through the new-way chips.
export const BeforeAfter: React.FC<{ title?: string; beforeLabel?: string; afterLabel?: string; rows: { before: string; after: string }[] }> = ({ title, beforeLabel = "before", afterLabel = "after", rows }) => {
  const a = useAccent();
  const { f, beat, sp } = useT();
  const rs = rows.slice(0, 4);
  const at = schedule(rs.length, beat, { start: 8, fill: 0.45, min: 10, max: 30 });
  const settled = (at[at.length - 1] ?? 0) + 30;
  const e = sp(0);
  return (
    <Scene bg="plain">
      <Float style={{ width: "100%", maxWidth: 950 }} seed={3.1} amp={4}>
        <div style={rise(e, 36)}>
          {title ? <Kicker text={title} /> : null}
          <Surface sheen>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 72px 1fr", padding: "22px 36px 18px", borderBottom: `1px solid ${T.border}` }}>
              <span style={{ display: "flex", alignItems: "center", gap: 12, fontFamily: F2.mono, fontSize: 22, letterSpacing: "0.22em", textTransform: "uppercase", color: T.faint }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.faint} strokeWidth="3" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
                {beforeLabel}
              </span>
              <span />
              <span style={{ display: "flex", alignItems: "center", gap: 12, fontFamily: F2.mono, fontSize: 22, letterSpacing: "0.22em", textTransform: "uppercase", color: a.hex, textShadow: `0 0 18px ${a.glow}` }}>
                <Check size={20} width={3.4} />
                {afterLabel}
              </span>
            </div>
            {rs.map((r, i) => {
              const t0 = at[i];
              const re = sp(t0, "snappy");
              const strike = ramp(f, t0 + 7, t0 + 17, 0, 100, Easing.out(Easing.cubic));
              const arrow = ramp(f, t0 + 10, t0 + 20, 0, 1, Easing.out(Easing.cubic));
              const ae = sp(t0 + 15, "bouncy");
              const wave = f > settled ? breathe(f, 90, -i * 1.1) : 0;
              return (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 72px 1fr", alignItems: "center", padding: "28px 36px", borderBottom: i < rs.length - 1 ? `1px solid ${T.border}` : "none", ...slide(Math.max(re, sp(4 + i * 4, "snappy")), -20) }}>
                  <span style={{ position: "relative", display: "inline-block", fontFamily: F2.sans, fontWeight: 500, fontSize: 34, lineHeight: 1.25, color: strike > 0 ? T.dim : T.text, opacity: interpolate(strike, [0, 100], [1, 0.62]), justifySelf: "start" }}>
                    {r.before}
                    <span aria-hidden style={{ position: "absolute", inset: 0, color: "transparent", textDecoration: "line-through", textDecorationThickness: 3, textDecorationColor: T.dim, clipPath: `inset(0 ${100 - strike}% 0 0)` }}>{r.before}</span>
                  </span>
                  <div style={{ display: "flex", justifyContent: "center" }}>
                    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke={a.hex} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" style={{ filter: `drop-shadow(0 0 8px ${a.glow})` }}>
                      <path d="M4 12h15" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - arrow} />
                      <path d="M13 6l6 6-6 6" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - ramp(f, t0 + 16, t0 + 22)} />
                    </svg>
                  </div>
                  <span style={{ justifySelf: "start", ...pop(ae, 0.75), transformOrigin: "left center" }}>
                    <span style={{ fontFamily: F2.sans, fontWeight: 600, fontSize: 34, lineHeight: 1.25, letterSpacing: "-0.015em", color: T.text, background: a.soft, border: `1px solid ${a.dim}`, borderRadius: 12, padding: "6px 16px", display: "inline-block", boxShadow: `0 0 ${26 + wave * 24}px -10px ${a.glow}` }}>{r.after}</span>
                  </span>
                </div>
              );
            })}
          </Surface>
        </div>
      </Float>
    </Scene>
  );
};

// ── Catch — "the fine print": a live hazard stripe scrolls along the top, the warning
// mark draws itself, 1–3 caveats thud in (paced), and the verdict STAMPS down.
// Stays on the accent (no red) — it's a caveat, not an error.
export const Catch: React.FC<{ kicker?: string; items: { text: string; sub?: string }[]; verdict?: string }> = ({ kicker = "the catch", items, verdict }) => {
  const a = useAccent();
  const { f, beat, sp } = useT();
  const its = items.slice(0, 3);
  const at = schedule(its.length, beat, { start: 12, fill: 0.36, min: 12, max: 30 });
  const verdictAt = (at[at.length - 1] ?? 14) + 20;
  const e = sp(0);
  const ve = sp(verdictAt, "bouncy");
  const icon = ramp(f, 4, 22, 0, 1, Easing.out(Easing.cubic));
  return (
    <Scene bg="grid">
      <Float style={{ width: "100%", maxWidth: 870 }} seed={4.2} amp={4}>
        <div style={rise(e, 36)}>
          <Surface glow style={{ padding: "48px 48px 40px" }}>
            <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 6, backgroundImage: `repeating-linear-gradient(-45deg, ${a.hex} 0 14px, transparent 14px 28px)`, backgroundSize: "40px 6px", backgroundPosition: `${f * 0.9}px 0`, opacity: 0.85 }} />
            <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 28 }}>
              <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke={a.hex} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ filter: `drop-shadow(0 0 ${8 + 8 * breathe(f, 60)}px ${a.glow})` }}>
                <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - icon} />
                <path d="M12 9v4" opacity={ramp(f, 18, 24)} />
                <path d="M12 17h.01" opacity={ramp(f, 20, 26)} />
              </svg>
              <span style={{ fontFamily: F2.mono, fontSize: 26, letterSpacing: "0.26em", textTransform: "uppercase", color: a.hex, textShadow: `0 0 24px ${a.glow}` }}>{kicker}</span>
            </div>
            {its.map((it, i) => {
              const ie = sp(at[i], "bouncy");
              const land = f - at[i];
              const shake = land > 4 && land < 16 ? Math.sin(land * 2.4) * (16 - land) * 0.35 : 0;
              return (
                <div key={i} style={{ display: "flex", gap: 22, alignItems: "flex-start", padding: "22px 0", borderTop: `1px solid ${T.border}`, opacity: clamp01(ie * 1.5), transform: `scale(${interpolate(ie, [0, 1], [1.12, 1])}) translate(${shake}px, ${(1 - ie) * -12}px)`, transformOrigin: "left center" }}>
                  <span style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0, marginTop: 2, display: "flex", alignItems: "center", justifyContent: "center", background: a.soft, border: `1px solid ${a.dim}`, fontFamily: F2.mono, fontWeight: 700, fontSize: 24, color: a.hex }}>!</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: F2.sans, fontWeight: 600, fontSize: 40, letterSpacing: "-0.02em", lineHeight: 1.18, color: T.text }}>{it.text}</div>
                    {it.sub ? <div style={{ fontFamily: F2.sans, fontSize: 28, color: T.dim, marginTop: 8, lineHeight: 1.3 }}>{it.sub}</div> : null}
                  </div>
                </div>
              );
            })}
            {verdict ? (
              <div style={{ marginTop: 20, paddingTop: 26, borderTop: `1px solid ${T.borderBright}`, display: "flex", alignItems: "center", gap: 18, opacity: f >= verdictAt ? 1 : 0 }}>
                <Label>verdict</Label>
                <span
                  style={{
                    fontFamily: F2.sans,
                    fontWeight: 700,
                    fontSize: 36,
                    letterSpacing: "-0.015em",
                    color: a.hex,
                    background: a.soft,
                    border: `2px solid ${a.hex}`,
                    borderRadius: 14,
                    padding: "8px 22px",
                    boxShadow: `0 0 ${34 + 20 * breathe(f, 90)}px -10px ${a.glow}`,
                    opacity: clamp01(ve * 2),
                    transform: `scale(${interpolate(ve, [0, 1], [1.6, 1])}) rotate(${interpolate(ve, [0, 1], [-8, -2])}deg)`,
                    display: "inline-block",
                  }}
                >
                  {verdict}
                </span>
              </div>
            ) : null}
          </Surface>
        </div>
      </Float>
    </Scene>
  );
};

// ── GetIt — "where to find it": the closing card. Name + logo, then an address bar where
// the URL types and ↵ lands; the bar lights up with a travelling beam, real distribution
// badges stagger in, price chip pops, and the note (the CTA) sits under a live dot.
export const GetIt: React.FC<{ url: string; name?: string; brand?: string; badges?: string[]; price?: string; note?: string }> = ({ url, name, brand, badges = [], price, note }) => {
  const a = useAccent();
  const { f, fps, sp } = useT();
  const CPS = url.length > 36 ? 46 : 34;
  const t = typed(url, f, 12, CPS, fps);
  const done = t.done;
  const doneF = t.doneAt;
  const e = sp(0);
  // never truncate a URL: fit it on one line down to 30px, else wrap it (mono ≈ 0.62em/char)
  const AVAIL = 620;
  const oneLine = Math.min(44, Math.floor(AVAIL / (Math.max(url.length, 12) * 0.62)));
  const wrap = oneLine < 30;
  const urlSize = wrap ? 32 : oneLine;
  const bs = badges.slice(0, 4);
  const go = sp(doneF, "bouncy");
  const mark = brand ?? name;
  return (
    <Scene bg="shader">
      <Float style={{ width: "100%", maxWidth: 900 }} seed={5.3}>
        <div style={rise(e, 44, 0.94)}>
          <Surface glow radius={34} style={{ padding: "50px 44px 46px", textAlign: "center" }}>
            {name ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 22, marginBottom: 34 }}>
                {mark && hasLogo(mark) ? <span style={pop(sp(4, "bouncy"), 0.5)}><LogoTile brand={mark} size={78} glow /></span> : null}
                <span style={{ fontFamily: F2.sans, fontWeight: 700, fontSize: 54, letterSpacing: "-0.035em", color: T.text }}>
                  <RevealText text={name} start={6} />
                </span>
              </div>
            ) : null}
            <Label style={{ marginBottom: 18 }}>get it at</Label>
            <div style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: 16, padding: "18px 18px 18px 26px", borderRadius: 20, background: "#0A0A0E", border: `1px solid ${done ? a.dim : T.borderBright}`, boxShadow: done ? `0 0 ${36 + 16 * breathe(f, 80)}px -10px ${a.glow}` : "none", maxWidth: "100%" }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={done ? a.hex : T.faint} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <rect x="4" y="11" width="16" height="10" rx="2.5" />
                <path d="M8 11V8a4 4 0 0 1 8 0v3" />
              </svg>
              <span style={{ fontFamily: F2.mono, fontWeight: 600, fontSize: urlSize, lineHeight: 1.3, letterSpacing: "-0.01em", color: done ? T.text : T.text, whiteSpace: wrap ? "normal" : "nowrap", wordBreak: wrap ? "break-all" : "normal", textAlign: "left", minWidth: 0 }}>
                <span style={{ position: "relative", display: "inline-block" }}>
                  <span style={{ visibility: "hidden" }}>{url}</span>
                  <span style={{ position: "absolute", left: 0, top: 0, right: wrap ? 0 : undefined, whiteSpace: wrap ? "normal" : "nowrap" }}>
                    {t.shown}
                    {!done ? <Caret solid /> : null}
                  </span>
                </span>
              </span>
              <span style={{ flexShrink: 0, width: 52, height: 52, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", background: done ? a.hex : "rgba(255,255,255,0.06)", boxShadow: done ? `0 0 26px ${a.glow}` : "none", transform: `scale(${done ? interpolate(go, [0, 1], [0.7, 1]) : 1})` }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={done ? T.bg : T.faint} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" style={{ transform: `translateX(${done ? Math.max(0, Math.sin(((f - doneF) / 40) * Math.PI * 2)) * 3 : 0}px)` }}>
                  <path d="M5 12h14" />
                  <path d="M13 6l6 6-6 6" />
                </svg>
              </span>
              {done ? <Beam radius={20} delay={doneF + 4} period={120} /> : null}
            </div>
            {bs.length || price ? (
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 14, marginTop: 32 }}>
                {bs.map((b, i) => (
                  <span key={i} style={{ ...rise(sp(doneF + 4 + i * 5, "bouncy"), 16, 0.85), display: "inline-block" }}>
                    <LogoChip brand={b} label={b} />
                  </span>
                ))}
                {price ? (
                  <span style={{ display: "inline-flex", alignItems: "center", padding: "10px 22px", borderRadius: 999, background: a.hex, color: T.bg, fontFamily: F2.mono, fontWeight: 700, fontSize: 25, letterSpacing: "0.06em", boxShadow: `0 0 30px ${a.glow}`, ...pop(sp(doneF + 6 + bs.length * 5, "bouncy"), 0.6) }}>{price}</span>
                ) : null}
              </div>
            ) : null}
            <Sheen delay={doneF + 10} every={130} />
          </Surface>
          {note ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginTop: 30, ...focusIn(sp(doneF + 12, "snappy")) }}>
              <LiveDot size={13} />
              <span style={{ fontFamily: F2.sans, fontWeight: 600, fontSize: 34, letterSpacing: "-0.015em", color: T.text }}>{note}</span>
            </div>
          ) : null}
        </div>
      </Float>
    </Scene>
  );
};
