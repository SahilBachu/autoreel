import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Easing,
} from "remotion";
import { S, SF } from "./skin";

export const useEnter = (
  delay = 0,
  config: { damping?: number; stiffness?: number; mass?: number } = {},
) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({
    frame: frame - delay,
    fps,
    config: { damping: 20, stiffness: 130, mass: 0.9, ...config },
  });
};

// ── Dot-grid paper background ────────────────────────────────────────────────
export const DotGrid: React.FC<{ color?: string }> = ({ color = S.paper }) => (
  <AbsoluteFill style={{ background: color }}>
    <AbsoluteFill
      style={{
        backgroundImage: "radial-gradient(rgba(26,25,23,0.09) 2.2px, transparent 2.2px)",
        backgroundSize: "46px 46px",
        opacity: 0.9,
      }}
    />
  </AbsoluteFill>
);

// ── Cursor logo lockup ───────────────────────────────────────────────────────
export const CursorLogo: React.FC<{ onDark?: boolean; scale?: number }> = ({
  onDark = true,
  scale = 1,
}) => {
  const fg = onDark ? S.white : S.ink;
  const box = onDark ? S.white : S.ink;
  const arrow = onDark ? S.black : S.white;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 28 * scale }}>
      <div
        style={{
          width: 108 * scale,
          height: 108 * scale,
          borderRadius: 26 * scale,
          background: box,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: onDark ? "none" : "0 20px 50px -20px rgba(0,0,0,0.4)",
        }}
      >
        <svg width={54 * scale} height={54 * scale} viewBox="0 0 24 24" fill={arrow}>
          <path d="M4 2l0 18 4.2-4.2 2.8 6 2.6-1.1-2.8-6L18 15z" />
        </svg>
      </div>
      <span style={{ fontFamily: SF.display, fontWeight: 700, fontSize: 116 * scale, color: fg, letterSpacing: "-0.03em" }}>
        Cursor
      </span>
    </div>
  );
};

// ── Serif italic title (optionally with one word in a rust box) ──────────────
export const TitleSerif: React.FC<{
  lines: { text: string; boxed?: boolean }[];
  size?: number;
  color?: string;
}> = ({ lines, size = 150, color = S.ink }) => {
  const e = useEnter(0);
  return (
    <div style={{ textAlign: "center", opacity: e, transform: `translateY(${interpolate(e, [0, 1], [30, 0])}px)` }}>
      {lines.map((l, i) => (
        <div
          key={i}
          style={{
            fontFamily: SF.serif,
            fontStyle: "italic",
            fontWeight: 700,
            fontSize: size,
            lineHeight: 1.02,
            letterSpacing: "-0.01em",
            color,
          }}
        >
          {l.boxed ? (
            <span
              style={{
                background: S.rust,
                color: S.white,
                borderRadius: 14,
                padding: "0 18px",
                display: "inline-block",
              }}
            >
              {l.text}
            </span>
          ) : (
            l.text
          )}
        </div>
      ))}
    </div>
  );
};

// ── Parallel-agents grid (the signature motion graphic) ──────────────────────
const AGENTS = [
  { name: "refactor-auth", done: true },
  { name: "write-tests", done: true },
  { name: "fix-types", done: false },
  { name: "migrate-db", done: false },
  { name: "build-ui", done: false },
  { name: "update-docs", done: false },
  { name: "lint-fix", done: true },
  { name: "deploy", done: false },
];
export const AgentGrid: React.FC = () => {
  return (
    <div style={{ width: "100%", maxWidth: 940, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22 }}>
      {AGENTS.map((a, i) => (
        <AgentTile key={a.name} name={a.name} done={a.done} idx={i} />
      ))}
    </div>
  );
};
const AgentTile: React.FC<{ name: string; done: boolean; idx: number }> = ({ name, done, idx }) => {
  const frame = useCurrentFrame();
  const e = useEnter(6 + idx * 5, { damping: 18, stiffness: 150, mass: 0.8 });
  const pulse = 0.55 + 0.45 * Math.sin((frame - idx * 6) / 5);
  const prog = interpolate((frame - idx * 7) % 90, [0, 90], [12, 96], { extrapolateLeft: "clamp" });
  return (
    <div
      style={{
        background: S.paperCard,
        border: `1px solid ${S.border}`,
        borderRadius: 20,
        padding: "22px 24px",
        boxShadow: "0 16px 40px -24px rgba(26,25,23,0.4)",
        opacity: e,
        transform: `translateY(${interpolate(e, [0, 1], [24, 0])}px) scale(${interpolate(e, [0, 1], [0.9, 1])})`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        {done ? (
          <div style={{ width: 20, height: 20, borderRadius: "50%", background: S.green }} />
        ) : (
          <div style={{ width: 20, height: 20, borderRadius: "50%", background: S.rust, opacity: pulse }} />
        )}
        <span style={{ fontFamily: SF.mono, fontWeight: 700, fontSize: 30, color: S.ink }}>{name}</span>
      </div>
      <div style={{ height: 10, borderRadius: 6, background: "rgba(26,25,23,0.08)", overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: done ? "100%" : `${prog}%`,
            background: done ? S.green : S.rust,
            borderRadius: 6,
          }}
        />
      </div>
      <div style={{ marginTop: 12, fontFamily: SF.body, fontSize: 24, color: S.inkSoft }}>
        {done ? "done" : "running…"}
      </div>
    </div>
  );
};

// ── Speed comparison bars ────────────────────────────────────────────────────
export const SpeedBars: React.FC = () => {
  const rows = [
    { label: "Composer", mult: 4, color: S.rust, big: true },
    { label: "GPT-5-codex", mult: 1.4, color: "#555" },
    { label: "Sonnet 4.6", mult: 1.0, color: "#777" },
  ];
  return (
    <div style={{ width: "100%", maxWidth: 900, display: "flex", flexDirection: "column", gap: 34 }}>
      {rows.map((r, i) => (
        <Bar key={r.label} {...r} delay={i * 8} />
      ))}
    </div>
  );
};
const Bar: React.FC<{ label: string; mult: number; color: string; big?: boolean; delay: number }> = ({
  label,
  mult,
  color,
  big,
  delay,
}) => {
  const e = useEnter(delay, { damping: 200 });
  const w = interpolate(e, [0, 1], [0, (mult / 4) * 100]);
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
        <span style={{ fontFamily: SF.body, fontWeight: 700, fontSize: 34, color: big ? S.ink : S.inkSoft }}>{label}</span>
        <span style={{ fontFamily: SF.display, fontWeight: 700, fontSize: 38, color: big ? S.rust : S.inkSoft }}>
          {mult}×
        </span>
      </div>
      <div style={{ height: 34, borderRadius: 10, background: "rgba(26,25,23,0.07)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${w}%`, background: color, borderRadius: 10 }} />
      </div>
    </div>
  );
};

// ── Big serif statement (dry aside) ──────────────────────────────────────────
export const Statement: React.FC<{ pre: string; boxed: string; post?: string }> = ({ pre, boxed, post }) => {
  const e = useEnter(0);
  return (
    <div style={{ textAlign: "center", maxWidth: 940, opacity: e, transform: `translateY(${interpolate(e, [0, 1], [26, 0])}px)` }}>
      <span style={{ fontFamily: SF.serif, fontStyle: "italic", fontWeight: 700, fontSize: 120, lineHeight: 1.06, color: S.ink }}>
        {pre}{" "}
        <span style={{ background: S.rust, color: S.white, borderRadius: 14, padding: "0 16px" }}>{boxed}</span>
        {post ? ` ${post}` : ""}
      </span>
    </div>
  );
};

// small easing re-export used above
export { Easing };
