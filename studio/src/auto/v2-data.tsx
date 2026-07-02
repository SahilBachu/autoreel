import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { F2, T, useAccent } from "./theme";
import { Kicker, Panel, Scene, useEnter } from "./fx";

// ── data scenes — numbers with glow, charts on hairline grids ─────────────────

const spr = (frame: number, fps: number, delay = 0, cfg = {}) =>
  spring({ frame: frame - delay, fps, config: { damping: 22, stiffness: 130, mass: 0.9, ...cfg } });

// one giant counting number
export const Stat: React.FC<{ value: string; label?: string; kicker?: string }> = ({ value, label, kicker }) => {
  const a = useAccent();
  const f = useCurrentFrame();
  const e = useEnter(0, { damping: 16 });
  const m = value.match(/^([^\d]*)([\d.,]+)(.*)$/);
  const t = interpolate(f, [4, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  let shown = value;
  if (m) {
    const num = parseFloat(m[2].replace(/,/g, ""));
    const dec = (m[2].split(".")[1] || "").length;
    shown = m[1] + (num * t).toFixed(dec) + m[3];
  }
  return (
    <Scene bg="shader">
      <div style={{ textAlign: "center", transform: `scale(${interpolate(e, [0, 1], [0.82, 1])})` }}>
        {kicker ? <Kicker text={kicker} /> : null}
        <div
          style={{
            fontFamily: F2.sans,
            fontWeight: 700,
            fontSize: 300,
            lineHeight: 0.92,
            letterSpacing: "-0.05em",
            color: T.text,
            textShadow: `0 0 90px ${a.glow}`,
          }}
        >
          {shown}
        </div>
        {label ? <div style={{ fontFamily: F2.sans, fontSize: 52, fontWeight: 500, color: T.dim, marginTop: 30 }}>{label}</div> : null}
      </div>
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
      <div style={{ width: "100%", maxWidth: 950 }}>
        {kicker ? <Kicker text={kicker} /> : null}
        <div style={{ display: "flex", gap: 26, justifyContent: "center" }}>
          {items.slice(0, 3).map((it, i) => {
            const e = spr(f, fps, 4 + i * 8, { damping: 18 });
            return (
              <Panel key={i} glow={i === 0} style={{ flex: 1, padding: "48px 26px", textAlign: "center", opacity: e, transform: `translateY(${interpolate(e, [0, 1], [36, 0])}px)` }}>
                <div style={{ fontFamily: F2.sans, fontWeight: 700, fontSize: 96, letterSpacing: "-0.04em", color: a.hex, textShadow: `0 0 40px ${a.glow}`, lineHeight: 1 }}>
                  {it.value}
                </div>
                <div style={{ fontFamily: F2.sans, fontSize: 30, fontWeight: 500, color: T.dim, marginTop: 18, lineHeight: 1.25 }}>{it.label}</div>
              </Panel>
            );
          })}
        </div>
      </div>
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
      <div style={{ width: "100%", maxWidth: 900 }}>
        {title ? <Kicker text={title} /> : null}
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
          {draw > 0.98 ? <circle cx={last[0]} cy={last[1]} r="13" fill={a.hex} stroke={T.bg} strokeWidth="5" style={{ filter: `drop-shadow(0 0 14px ${a.glow})` }} /> : null}
        </svg>
        {caption ? <div style={{ fontFamily: F2.sans, fontWeight: 600, fontSize: 44, color: T.text, textAlign: "center", marginTop: 28 }}>{caption}</div> : null}
      </div>
    </Scene>
  );
};

// vertical bars, hero bar in accent
export const BarChart: React.FC<{ title?: string; unit?: string; rows: { label: string; value: number; hero?: boolean }[] }> = ({ title, unit, rows }) => {
  const a = useAccent();
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const max = Math.max(...rows.map((r) => r.value), 1);
  // decimals follow the TARGET value, so "$15" never flashes as "$15.0" mid-count
  const fmt = (v: number, target: number) => {
    const s = v.toFixed(Number.isInteger(target) ? 0 : 1);
    return unit === "$" ? `$${s}` : `${s}${unit || ""}`;
  };
  return (
    <Scene bg="plain">
      <div style={{ width: "100%", maxWidth: 880 }}>
        {title ? <Kicker text={title} /> : null}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 44, height: 540 }}>
          {rows.slice(0, 4).map((r, i) => {
            const e = spr(f, fps, 6 + i * 8, { damping: 200 });
            const h = interpolate(e, [0, 1], [0, (r.value / max) * 430]);
            const shown = r.value * interpolate(e, [0, 1], [0, 1]);
            return (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, maxWidth: 190 }}>
                <div style={{ fontFamily: F2.sans, fontWeight: 700, fontSize: 44, letterSpacing: "-0.02em", color: r.hero ? a.hex : T.text, textShadow: r.hero ? `0 0 26px ${a.glow}` : "none", marginBottom: 14 }}>
                  {fmt(shown, r.value)}
                </div>
                <div
                  style={{
                    width: "100%",
                    height: h,
                    borderRadius: "18px 18px 6px 6px",
                    background: r.hero ? `linear-gradient(180deg, ${a.hex}, ${a.dim})` : T.surface2,
                    border: r.hero ? "none" : `1px solid ${T.border}`,
                    boxShadow: r.hero ? `0 0 60px -10px ${a.glow}` : "none",
                  }}
                />
                <div style={{ fontFamily: F2.sans, fontWeight: 500, fontSize: 30, color: T.dim, marginTop: 20, textAlign: "center" }}>{r.label}</div>
              </div>
            );
          })}
        </div>
      </div>
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
      <div style={{ textAlign: "center" }}>
        {kicker ? <Kicker text={kicker} /> : null}
        <div style={{ position: "relative", width: 450, height: 450, margin: "0 auto" }}>
          <svg width="450" height="450" style={{ transform: "rotate(-90deg)", overflow: "visible" }}>
            <circle cx="225" cy="225" r={R} fill="none" stroke={T.surface2} strokeWidth="30" />
            <circle
              cx="225" cy="225" r={R} fill="none" stroke={a.hex} strokeWidth="30" strokeLinecap="round"
              strokeDasharray={C} strokeDashoffset={C * (1 - p / 100)}
              style={{ filter: `drop-shadow(0 0 20px ${a.glow})` }}
            />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontFamily: F2.sans, fontWeight: 700, fontSize: 130, letterSpacing: "-0.04em", color: T.text }}>{Math.round(p)}%</span>
          </div>
        </div>
        {label ? <div style={{ fontFamily: F2.sans, fontSize: 46, fontWeight: 500, color: T.dim, marginTop: 32 }}>{label}</div> : null}
      </div>
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
      <div style={{ width: "100%", maxWidth: 920 }}>
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
                  boxShadow: r.hero ? `inset 3px 0 0 ${a.hex}` : "none",
                  opacity: e,
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
      </div>
    </Scene>
  );
};
