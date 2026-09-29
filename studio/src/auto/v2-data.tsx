import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { F2, T, useAccent } from "./theme";
import { Panel, Scene } from "./fx";
import { Logo, hasLogo } from "./logos";
import { Chip, Float, LiveDot, ObjectCard, Roll, Underline, breathe, clamp01, focusIn, parseNum, pop, ramp, rise, schedule, useT, Kicker } from "./kit";

// ── data scenes — numbers with glow, charts on hairline grids ─────────────────

const spr = (frame: number, fps: number, delay = 0, cfg = {}) =>
  spring({ frame: frame - delay, fps, config: { damping: 22, stiffness: 130, mass: 0.9, ...cfg } });

// ── Stat — one hero number. Digits ROLL into place (odometer), an accent bar draws under
// it with a light that keeps travelling along it, the glow breathes through the hold.
// `prev` (optional, REAL) shows what it was: a struck chip "was 280".
export const Stat: React.FC<{ value: string; label?: string; kicker?: string; prev?: string }> = ({ value, label, kicker, prev }) => {
  const a = useAccent();
  const { f, sp } = useT();
  const e = sp(0, "bouncy");
  const le = sp(18, "snappy");
  const size = Math.max(150, Math.min(300, Math.round(1500 / Math.max(String(value).length, 5))));
  const glowK = breathe(f, 100);
  const run = f > 50 ? ((f - 50) % 90) / 90 : -1;
  return (
    <Scene bg="shader">
      <Float seed={0.3} amp={5}>
        <ObjectCard pad="44px 64px 48px" glow>
        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
          {kicker ? <div style={focusIn(sp(2, "snappy"))}><Kicker text={kicker} /></div> : null}
          <div style={{ fontFamily: F2.sans, fontWeight: 700, fontSize: size, lineHeight: 1, letterSpacing: "-0.055em", color: T.text, filter: `drop-shadow(0 0 ${26 + glowK * 22}px ${a.glow})`, transform: `scale(${interpolate(e, [0, 1], [0.84, 1])})`, opacity: clamp01(e * 2) }}>
            {parseNum(value) ? <Roll value={value} start={4} dur={34} stagger={3} /> : value}
          </div>
          <div style={{ position: "relative", width: Math.min(760, size * String(value).length * 0.5), marginTop: 18 }}>
            <Underline start={20} dur={20} thickness={7} />
            {run >= 0 ? <div style={{ position: "absolute", top: -3, left: `${run * 100}%`, width: 60, height: 13, marginLeft: -30, borderRadius: 7, background: "radial-gradient(closest-side, #fff, transparent)", opacity: Math.sin(Math.PI * run) }} /> : null}
          </div>
          {label ? <div style={{ fontFamily: F2.sans, fontSize: 52, fontWeight: 500, letterSpacing: "-0.02em", color: T.dim, marginTop: 30, ...focusIn(le) }}>{label}</div> : null}
          {prev ? (
            <div style={{ marginTop: 26, ...pop(sp(30, "bouncy"), 0.7) }}>
              <Chip>
                <span style={{ color: T.faint }}>was</span>
                <span style={{ textDecoration: "line-through", textDecorationThickness: 2 }}>{prev}</span>
              </Chip>
            </div>
          ) : null}
        </div>
        </ObjectCard>
      </Float>
    </Scene>
  );
};

// row of 2-3 metric cards
export const StatRow: React.FC<{ items: { value: string; label: string }[]; kicker?: string }> = ({ items, kicker }) => {
  const a = useAccent();
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <Scene bg="plain">
      <Float style={{ width: "100%", maxWidth: 950 }} seed={2.2} amp={4}>
        {kicker ? <Kicker text={kicker} /> : null}
        <div style={{ display: "flex", gap: 26, justifyContent: "center" }}>
          {items.slice(0, 3).map((it, i) => {
            const e = spr(f, fps, 4 + i * 8, { damping: 18 });
            return (
              <Panel key={i} glow={i === 0} style={{ flex: 1, padding: "48px 26px", textAlign: "center", opacity: Math.min(1, e * 1.3), transform: `translateY(${interpolate(e, [0, 1], [36, 0])}px)` }}>
                <div style={{ fontFamily: F2.sans, fontWeight: 700, fontSize: 96, letterSpacing: "-0.04em", color: a.hex, filter: `drop-shadow(0 0 ${14 + (i === 0 ? 12 * breathe(f, 90) : 0)}px ${a.glow})`, lineHeight: 1 }}>
                  {parseNum(it.value) ? <Roll value={it.value} start={6 + i * 8} dur={30} stagger={3} /> : it.value}
                </div>
                <div style={{ fontFamily: F2.sans, fontSize: 30, fontWeight: 500, color: T.dim, marginTop: 18, lineHeight: 1.25 }}>{it.label}</div>
              </Panel>
            );
          })}
        </div>
      </Float>
    </Scene>
  );
};

// trend line with glowing area fill
export const LineChart: React.FC<{ title?: string; values: number[]; caption?: string }> = ({ title, values, caption }) => {
  const a = useAccent();
  const f = useCurrentFrame();
  const W = 900, H = 500, pad = 24;
  const vals = values.length > 1 ? values : [1, 2, 3];
  const max = Math.max(...vals), min = Math.min(...vals, 0);
  const pts = vals.map((v, i) => [pad + (i / (vals.length - 1)) * (W - pad * 2), H - pad - ((v - min) / (max - min || 1)) * (H - pad * 2)] as const);
  const line = pts.map((p, i) => (i ? "L" : "M") + p[0] + " " + p[1]).join(" ");
  const area = `${line} L ${pts[pts.length - 1][0]} ${H - pad} L ${pts[0][0]} ${H - pad} Z`;
  const draw = interpolate(f, [4, 42], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const last = pts[pts.length - 1];
  return (
    <Scene bg="grid">
      <Float style={{ width: "100%", maxWidth: 900, position: "relative" }} seed={3.2} amp={4}>
        <ObjectCard>
        {title ? <Kicker text={title} /> : null}
        <div style={{ position: "relative" }}>
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible" }}>
          <defs>
            <linearGradient id="v2lc" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={a.hex} stopOpacity="0.35" />
              <stop offset="100%" stopColor={a.hex} stopOpacity="0" />
            </linearGradient>
            <clipPath id="v2reveal"><rect x="0" y="0" width={draw * W} height={H} /></clipPath>
          </defs>
          {[0.25, 0.5, 0.75].map((p) => (
            <line key={p} x1={pad} x2={W - pad} y1={H * p} y2={H * p} stroke={T.border} strokeWidth="1" />
          ))}
          <g clipPath="url(#v2reveal)">
            <path d={area} fill="url(#v2lc)" />
            <path d={line} fill="none" stroke={a.hex} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" style={{ filter: `drop-shadow(0 0 12px ${a.glow})` }} />
          </g>
        </svg>
        {draw > 0.98 ? (
          <div style={{ position: "absolute", left: `${(last[0] / W) * 100}%`, top: `${(last[1] / H) * 100}%`, transform: "translate(-50%, -50%)", display: "flex" }}>
            <LiveDot size={26} />
          </div>
        ) : null}
        </div>
        {caption ? <div style={{ fontFamily: F2.sans, fontWeight: 600, fontSize: 44, color: T.text, textAlign: "center", marginTop: 28, ...focusIn(clamp01((f - 30) / 14)) }}>{caption}</div> : null}
        </ObjectCard>
      </Float>
    </Scene>
  );
};

// ── BarChart — bars grow on springs from a hairline baseline, values count up with them,
// the hero bar is the accent (glow + a light that keeps climbing it during the hold) and
// can carry a `note` chip ("10x"). rows[].brand puts the real logo under the bar.
export const BarChart: React.FC<{ title?: string; unit?: string; rows: { label: string; value: number; hero?: boolean; brand?: string; note?: string }[] }> = ({ title, unit, rows }) => {
  const a = useAccent();
  const { f, beat, sp } = useT();
  const rs = rows.slice(0, 5);
  const max = Math.max(...rs.map((r) => r.value), 1);
  const at = schedule(rs.length, beat, { start: 8, fill: 0.22, min: 5, max: 12 });
  const H = rs.some((r) => r.hero && r.note) ? 360 : 420; // headroom for the hero note chip
  // decimals follow the TARGET value, so "$15" never flashes as "$15.0" mid-count
  const fmt = (v: number, target: number) => {
    const n = Number.isInteger(target) ? Math.round(v).toLocaleString("en-US") : v.toFixed(1);
    return unit === "$" ? `$${n}` : `${n}${unit || ""}`;
  };
  return (
    <Scene bg="plain">
      <Float style={{ width: "100%", maxWidth: 900 }} seed={1.2} amp={4}>
        <ObjectCard pad="40px 40px 30px">
        {title ? <Kicker text={title} /> : null}
        <div style={{ position: "relative", padding: "0 10px" }}>
          {[0.25, 0.5, 0.75, 1].map((p) => (
            <div key={p} style={{ position: "absolute", left: 0, right: 0, bottom: 74 + p * H, height: 1, background: T.border, opacity: ramp(f, 2, 14) * (p === 1 ? 0.5 : 1) }} />
          ))}
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: rs.length > 3 ? 30 : 48, height: H + 140 }}>
            {rs.map((r, i) => {
              const e = sp(at[i], "soft");
              const g = clamp01(e);
              const h = Math.max(10, g * (r.value / max) * H);
              const climb = r.hero && f > at[i] + 40 ? ((f - at[i] - 40) % 80) / 80 : -1;
              return (
                <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, maxWidth: 200 }}>
                  {r.hero && r.note ? <div style={{ marginBottom: 12, ...pop(sp(at[i] + 26, "bouncy"), 0.5) }}><Chip hero style={{ fontSize: 22, padding: "6px 14px" }}>{r.note}</Chip></div> : null}
                  <div style={{ fontFamily: F2.sans, fontWeight: 700, fontSize: 46, letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums", color: r.hero ? a.hex : T.text, textShadow: r.hero ? `0 0 26px ${a.glow}` : "none", marginBottom: 14, opacity: clamp01(e * 2) }}>
                    {fmt(r.value * g, r.value)}
                  </div>
                  <div style={{ position: "relative", width: "100%", height: h, borderRadius: "18px 18px 6px 6px", overflow: "hidden", background: r.hero ? `linear-gradient(180deg, ${a.hex}, ${a.dim})` : "linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0.05))", border: r.hero ? "none" : `1px solid ${T.border}`, boxShadow: r.hero ? `0 0 ${50 + 20 * breathe(f, 80)}px -10px ${a.glow}` : "none" }}>
                    {climb >= 0 ? <div style={{ position: "absolute", left: 0, right: 0, height: 80, bottom: `${climb * 120 - 20}%`, background: "linear-gradient(0deg, transparent, rgba(255,255,255,0.35), transparent)" }} /> : null}
                  </div>
                  <div style={{ height: 1, width: "100%", background: T.borderBright }} />
                  <div style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: F2.sans, fontWeight: 600, fontSize: 30, color: r.hero ? T.text : T.dim, marginTop: 18, textAlign: "center", ...rise(sp(at[i] + 4, "snappy"), 10) }}>
                    {r.brand && hasLogo(r.brand) ? <Logo name={r.brand} size={30} color="#fff" /> : null}
                    {r.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        </ObjectCard>
      </Float>
    </Scene>
  );
};

// percent ring
export const Donut: React.FC<{ percent: number; label?: string; kicker?: string }> = ({ percent, label, kicker }) => {
  const a = useAccent();
  const f = useCurrentFrame();
  const R = 185, C = 2 * Math.PI * R;
  const p = interpolate(f, [4, 42], [0, Math.max(0, Math.min(100, percent))], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  return (
    <Scene bg="shader">
      <Float style={{ textAlign: "center" }} seed={4.1} amp={5}>
        <ObjectCard pad="44px 70px">
        {kicker ? <Kicker text={kicker} /> : null}
        <div style={{ position: "relative", width: 450, height: 450, margin: "0 auto" }}>
          <svg width="450" height="450" style={{ transform: "rotate(-90deg)", overflow: "visible" }}>
            <circle cx="225" cy="225" r={R} fill="none" stroke={T.surface2} strokeWidth="30" />
            <circle
              cx="225" cy="225" r={R} fill="none" stroke={a.hex} strokeWidth="30" strokeLinecap="round"
              strokeDasharray={C} strokeDashoffset={C * (1 - p / 100)}
              style={{ filter: `drop-shadow(0 0 ${14 + 14 * breathe(f, 80)}px ${a.glow})` }}
            />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontFamily: F2.sans, fontWeight: 700, fontSize: 130, letterSpacing: "-0.04em", color: T.text }}>{Math.round(p)}%</span>
          </div>
        </div>
        {label ? <div style={{ fontFamily: F2.sans, fontSize: 46, fontWeight: 500, color: T.dim, marginTop: 32 }}>{label}</div> : null}
        </ObjectCard>
      </Float>
    </Scene>
  );
};

// leaderboard / comparison table, hero row glows
export const Table: React.FC<{ title?: string; columns?: string[]; rows: { label: string; values: string[]; hero?: boolean }[] }> = ({ title, columns, rows }) => {
  const a = useAccent();
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <Scene bg="plain">
      <Float style={{ width: "100%", maxWidth: 920 }} seed={5.2} amp={4}>
        {title ? <Kicker text={title} /> : null}
        <Panel style={{ overflow: "hidden", padding: 0 }}>
          {columns ? (
            <div style={{ display: "flex", padding: "22px 40px", borderBottom: `1px solid ${T.border}` }}>
              <span style={{ flex: 2, fontFamily: F2.mono, fontSize: 24, letterSpacing: "0.14em", textTransform: "uppercase", color: T.faint }}>{columns[0]}</span>
              {columns.slice(1).map((c, i) => (
                <span key={i} style={{ flex: 1, textAlign: "right", fontFamily: F2.mono, fontSize: 24, letterSpacing: "0.14em", textTransform: "uppercase", color: T.faint }}>{c}</span>
              ))}
            </div>
          ) : null}
          {rows.slice(0, 5).map((r, i) => {
            const e = spr(f, fps, 6 + i * 6, { damping: 20 });
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "26px 40px",
                  borderBottom: i < rows.length - 1 ? `1px solid ${T.border}` : "none",
                  background: r.hero ? a.soft : "transparent",
                  boxShadow: r.hero ? `inset ${3 + 2 * breathe(f, 80)}px 0 0 ${a.hex}` : "none",
                  opacity: Math.min(1, e * 1.3),
                  transform: `translateX(${interpolate(e, [0, 1], [-30, 0])}px)`,
                }}
              >
                <span style={{ flex: 2, fontFamily: F2.sans, fontWeight: 600, fontSize: 40, color: r.hero ? a.hex : T.text }}>{r.label}</span>
                {r.values.map((v, j) => (
                  <span key={j} style={{ flex: 1, textAlign: "right", fontFamily: F2.sans, fontWeight: 600, fontSize: 38, color: r.hero ? T.text : T.dim }}>{v}</span>
                ))}
              </div>
            );
          })}
        </Panel>
      </Float>
    </Scene>
  );
};
