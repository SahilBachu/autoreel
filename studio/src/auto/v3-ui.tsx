import { Easing, interpolate } from "remotion";
import { F2, T, useAccent } from "./theme";
import { Scene } from "./fx";
import { Check, Cursor, Float, Label, LiveDot, LogoTile, Ripple, Surface, breathe, clamp01, focusIn, pop, ramp, rise, schedule, slide, useT, type CursorKey, Kicker } from "./kit";

// ── v3 ui vocabulary: cursor (someone USING the product) · stack (many tools → one) ·
// split (two-column compare). Built from kit.tsx, paced to the beat, alive in the hold.

type Item = { label: string; sub?: string; brand?: string };

// ── CursorDemo (kind "cursor") — a product surface with rows (connectors, extensions,
// integrations, settings…). A real pointer glides in, CLICKS each target's button (press +
// ripple), the button flips to its done state, and a result toast slides up at the end.
export const CursorDemo: React.FC<{ app?: string; title?: string; items: Item[]; clicks?: number[]; action?: string; done?: string; result?: string }> = ({
  app,
  title,
  items,
  clicks,
  action = "Enable",
  done = "Enabled",
  result,
}) => {
  const a = useAccent();
  const { f, beat, sp } = useT();
  const its = items.slice(0, 5);
  const targets = (clicks && clicks.length ? clicks : [0]).filter((i) => i >= 0 && i < its.length).slice(0, 4);
  const W = 900;
  const HEAD = 96;
  const ROW = 118;
  const TOAST = result ? 104 : 0;
  const BTN_W = 196;
  const at = schedule(targets.length, beat, { start: 26, fill: 0.55, min: 18, max: 42 });
  const clickAt = (i: number) => {
    const k = targets.indexOf(i);
    return k >= 0 ? at[k] : 1e6;
  };
  const bx = W - 36 - BTN_W / 2;
  const by = (i: number) => HEAD + i * ROW + ROW / 2;
  const keys: CursorKey[] = [{ x: W - 60, y: HEAD + its.length * ROW + TOAST + 40, at: 10 }];
  targets.forEach((i, k) => keys.push({ x: bx + 18, y: by(i) + 8, at: at[k] - 2, hold: 8, click: true }));
  const last = at[at.length - 1] ?? 20;
  keys.push({ x: bx - 150, y: by(targets[targets.length - 1] ?? 0) + 90, at: last + 30 });
  const toastAt = last + 14;
  const te = sp(toastAt, "bouncy");
  const e = sp(0);
  return (
    <Scene bg="shader">
      <Float style={{ width: W }} seed={0.5} amp={4}>
        <div style={{ position: "relative", ...rise(e, 36, 0.96) }}>
          <Surface glow radius={30}>
            <div style={{ height: HEAD, display: "flex", alignItems: "center", gap: 18, padding: "0 32px", borderBottom: `1px solid ${T.border}` }}>
              {app ? <LogoTile brand={app} letter={app} size={50} radius={14} /> : null}
              <span style={{ fontFamily: F2.sans, fontWeight: 600, fontSize: 32, letterSpacing: "-0.02em", color: T.text, flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title ?? app ?? "Settings"}</span>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={T.faint} strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.35-4.35" /></svg>
            </div>
            {its.map((it, i) => {
              const re = sp(4 + i * 4, "snappy");
              const c = clickAt(i);
              const on = f >= c;
              const press = f >= c - 3 && f < c + 5;
              const ce = sp(c, "bouncy");
              return (
                <div key={i} style={{ height: ROW, display: "flex", alignItems: "center", gap: 22, padding: "0 36px 0 32px", borderBottom: i < its.length - 1 ? `1px solid ${T.border}` : "none", background: on ? `linear-gradient(90deg, ${a.soft}, transparent 70%)` : "transparent", ...slide(re, -18) }}>
                  <LogoTile brand={it.brand} letter={it.label} size={64} glow={on} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: F2.sans, fontWeight: 600, fontSize: 36, letterSpacing: "-0.02em", color: T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.label}</div>
                    {it.sub ? <div style={{ fontFamily: F2.sans, fontSize: 26, color: T.dim, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.sub}</div> : null}
                  </div>
                  <div
                    style={{
                      width: BTN_W,
                      height: 62,
                      borderRadius: 16,
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 10,
                      fontFamily: F2.sans,
                      fontWeight: 600,
                      fontSize: 26,
                      color: on ? T.bg : T.text,
                      background: on ? a.hex : "rgba(255,255,255,0.07)",
                      border: `1px solid ${on ? a.hex : T.borderBright}`,
                      boxShadow: on ? `0 0 ${24 + 10 * breathe(f, 80, i)}px -4px ${a.glow}` : "none",
                      transform: `scale(${press ? 0.92 : on ? interpolate(ce, [0, 1], [0.96, 1]) : 1})`,
                    }}
                  >
                    {on ? <Check size={24} color={T.bg} width={3.6} progress={ramp(f, c, c + 8)} /> : null}
                    {on ? done : action}
                  </div>
                </div>
              );
            })}
            {result ? (
              <div style={{ height: TOAST, display: "flex", alignItems: "center", padding: "0 26px" }}>
                <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 16, padding: "18px 24px", borderRadius: 18, background: "rgba(0,0,0,0.35)", border: `1px solid ${a.dim}`, boxShadow: `0 0 34px -14px ${a.glow}`, opacity: f >= toastAt ? clamp01(te * 1.5) : 0, transform: `translateY(${(1 - te) * 30}px)` }}>
                  <div style={{ width: 38, height: 38, borderRadius: 19, background: a.hex, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Check size={22} color={T.bg} width={3.8} />
                  </div>
                  <span style={{ fontFamily: F2.sans, fontWeight: 600, fontSize: 32, letterSpacing: "-0.015em", color: T.text, flex: 1 }}>{result}</span>
                  <LiveDot size={11} />
                </div>
              </div>
            ) : null}
          </Surface>
          <Cursor keys={keys} appear={8} />
        </div>
      </Float>
    </Scene>
  );
};

// ── Stack (kind "stack") — "5 tools → 1": the tools it replaces pop in as a grid of cards
// (logo + label + real price note), then they all FLY into the centre and collapse; the
// replacement slams in with a ripple, a beam around it, and the absorbed logos lined up
// underneath as "replaces".
export const Stack: React.FC<{ title?: string; items: (Item & { note?: string })[]; into: Item & { note?: string } }> = ({ title, items, into }) => {
  const a = useAccent();
  const { f, beat, sp } = useT();
  const its = items.slice(0, 6);
  const n = its.length;
  const cols = n <= 4 ? 2 : 3;
  const W = 920;
  const H = 600;
  const CW = cols === 2 ? 420 : 280;
  const CH = 132;
  const GAP = 22;
  const rowsN = Math.ceil(n / cols);
  const gridW = cols * CW + (cols - 1) * GAP;
  const gridH = rowsN * CH + (rowsN - 1) * GAP;
  const appear = schedule(n, beat, { start: 6, fill: 0.2, min: 4, max: 9 });
  const collapseAt = Math.max((appear[n - 1] ?? 6) + 26, Math.round(beat * 0.36));
  const heroAt = collapseAt + n * 3 + 14;
  const he = sp(heroAt, "bouncy");
  const cx = W / 2;
  const cy = H / 2 - 30;
  return (
    <Scene bg="shader">
      <Float style={{ width: W }} seed={1.9} amp={4}>
        {title ? <div style={focusIn(sp(0, "snappy"))}><Kicker text={title} /></div> : null}
        <div style={{ position: "relative", width: W, height: H }}>
          {its.map((it, i) => {
            const c = i % cols;
            const r = Math.floor(i / cols);
            const x0 = (W - gridW) / 2 + c * (CW + GAP);
            const y0 = (H - gridH) / 2 + r * (CH + GAP);
            const pe = sp(appear[i], "bouncy");
            const k = ramp(f, collapseAt + i * 3, collapseAt + i * 3 + 18, 0, 1, Easing.in(Easing.cubic));
            if (k >= 1) return null;
            const dx = (cx - (x0 + CW / 2)) * k;
            const dy = (cy - (y0 + CH / 2)) * k;
            return (
              <div key={i} style={{ position: "absolute", left: x0, top: y0, width: CW, height: CH, opacity: clamp01(pe * 1.4) * (1 - k * k), transform: `translate(${dx}px, ${dy}px) scale(${(0.7 + 0.3 * pe) * (1 - 0.65 * k)}) rotate(${k * (i % 2 ? 8 : -8)}deg)` }}>
                <Surface radius={22} style={{ height: "100%", display: "flex", alignItems: "center", gap: 18, padding: "0 22px" }}>
                  <LogoTile brand={it.brand} letter={it.label} size={60} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontFamily: F2.sans, fontWeight: 600, fontSize: 32, letterSpacing: "-0.02em", color: T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.label}</div>
                    {it.note ? <div style={{ fontFamily: F2.mono, fontSize: 22, color: T.dim, marginTop: 4 }}>{it.note}</div> : null}
                  </div>
                </Surface>
              </div>
            );
          })}
          {f >= heroAt - 1 ? (
            <div style={{ position: "absolute", left: 0, right: 0, top: cy - 150, display: "flex", flexDirection: "column", alignItems: "center" }}>
              <Ripple x={W / 2} y={150} at={heroAt} size={520} />
              <div style={{ ...pop(he, 0.4) }}>
                <Surface glow beam radius={34} hot style={{ width: 620, padding: "38px 40px", display: "flex", alignItems: "center", gap: 30 }}>
                  <LogoTile brand={into.brand} letter={into.label} size={120} glow radius={32} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: F2.sans, fontWeight: 700, fontSize: 60, letterSpacing: "-0.04em", color: T.text, lineHeight: 1.05 }}>{into.label}</div>
                    {into.sub ? <div style={{ fontFamily: F2.sans, fontSize: 28, color: T.dim, marginTop: 8 }}>{into.sub}</div> : null}
                    {into.note ? <div style={{ fontFamily: F2.mono, fontWeight: 700, fontSize: 26, color: a.hex, marginTop: 10, textShadow: `0 0 20px ${a.glow}` }}>{into.note}</div> : null}
                  </div>
                </Surface>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 30 }}>
                <Label style={{ opacity: ramp(f, heroAt + 8, heroAt + 16), marginRight: 6 }}>replaces</Label>
                {its.map((it, i) => (
                  <div key={i} style={{ position: "relative", ...pop(sp(heroAt + 10 + i * 4, "bouncy"), 0.3), transform: `${pop(sp(heroAt + 10 + i * 4, "bouncy"), 0.3).transform} translateY(${Math.sin((f + i * 11) / 22) * 3}px)` }}>
                    <LogoTile brand={it.brand} letter={it.label} size={52} radius={14} />
                    <div style={{ position: "absolute", left: 6, right: 6, top: "50%", height: 3, borderRadius: 2, background: a.hex, transform: `rotate(-35deg) scaleX(${ramp(f, heroAt + 16 + i * 4, heroAt + 24 + i * 4)})`, boxShadow: `0 0 8px ${a.glow}` }} />
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </Float>
    </Scene>
  );
};

// ── Split (kind "split") — side-by-side compare: two panels (logo + title), their lines
// land alternately left/right; the winner's lines get accent ticks, the loser's faint
// crosses; the winner panel glows with a beam, the other settles back. REAL facts only.
type Side = { title: string; brand?: string; items: string[] };
export const Split: React.FC<{ title?: string; left: Side; right: Side; winner?: "left" | "right" }> = ({ title, left, right, winner = "right" }) => {
  const a = useAccent();
  const { f, beat, sp } = useT();
  const L = (left?.items ?? []).slice(0, 4);
  const Rr = (right?.items ?? []).slice(0, 4);
  const rows = Math.max(L.length, Rr.length);
  const at = schedule(rows * 2, beat, { start: 14, fill: 0.45, min: 5, max: 16 });
  const settle = (at[at.length - 1] ?? 20) + 14;
  const verdict = sp(settle, "soft");
  const side = (s: Side, lines: string[], which: "left" | "right", from: number) => {
    const win = which === winner;
    const e = sp(which === "left" ? 2 : 6, "snappy");
    return (
      <div style={{ flex: 1, minWidth: 0, opacity: clamp01(e * 1.4) * (win ? 1 : interpolate(verdict, [0, 1], [1, 0.74])), transform: `translateX(${(1 - e) * from}px) translateY(${win ? -8 * verdict : 0}px)` }}>
        <Surface glow={win} beam={win} hot={win && verdict > 0.5} radius={28} style={{ height: "100%", padding: "30px 30px 26px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, paddingBottom: 22, marginBottom: 8, borderBottom: `1px solid ${T.border}` }}>
            <LogoTile brand={s.brand} letter={s.title} size={56} glow={win} />
            <span style={{ fontFamily: F2.sans, fontWeight: 700, fontSize: 38, letterSpacing: "-0.03em", color: T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.title}</span>
          </div>
          {lines.map((t, i) => {
            const t0 = at[i * 2 + (which === "left" ? 0 : 1)];
            const le = sp(t0, "snappy");
            return (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: "14px 0", ...slide(le, which === "left" ? -16 : 16) }}>
                <span style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, marginTop: 2, display: "flex", alignItems: "center", justifyContent: "center", background: win ? a.soft : "rgba(255,255,255,0.05)", border: `1px solid ${win ? a.dim : T.border}` }}>
                  {win ? (
                    <Check size={20} width={3.4} progress={ramp(f, t0 + 4, t0 + 12)} />
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.faint} strokeWidth="3.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
                  )}
                </span>
                <span style={{ fontFamily: F2.sans, fontWeight: win ? 600 : 500, fontSize: 30, lineHeight: 1.25, letterSpacing: "-0.015em", color: win ? T.text : T.dim }}>{t}</span>
              </div>
            );
          })}
        </Surface>
      </div>
    );
  };
  return (
    <Scene bg="plain">
      <Float style={{ width: "100%", maxWidth: 960 }} seed={2.7} amp={4}>
        {title ? <div style={focusIn(sp(0, "snappy"))}><Kicker text={title} /></div> : null}
        <div style={{ position: "relative", display: "flex", alignItems: "stretch", gap: 24 }}>
          {side(left, L, "left", -60)}
          {side(right, Rr, "right", 60)}
          <div style={{ position: "absolute", left: "50%", top: 44, width: 60, height: 60, marginLeft: -30, borderRadius: 30, background: "#0B0B0F", border: `1.5px solid ${T.borderBright}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F2.mono, fontWeight: 700, fontSize: 22, color: T.dim, ...pop(sp(12, "bouncy"), 0.3) }}>vs</div>
        </div>
      </Float>
    </Scene>
  );
};
