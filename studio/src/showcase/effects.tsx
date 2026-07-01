import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Easing,
} from "remotion";
import { colors, fonts } from "../style/tokens";

// ── Animated gradient background: drifting accent blobs + vignette ────────────
export const MovingGradient: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / 30;
  const x1 = 30 + Math.sin(t * 0.5) * 16;
  const y1 = 22 + Math.cos(t * 0.4) * 12;
  const x2 = 70 + Math.cos(t * 0.6) * 16;
  const y2 = 74 + Math.sin(t * 0.5) * 10;
  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(42% 42% at ${x1}% ${y1}%, rgba(79,125,255,0.28), transparent 70%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(46% 46% at ${x2}% ${y2}%, rgba(120,90,255,0.20), transparent 70%)`,
        }}
      />
      <AbsoluteFill
        style={{ boxShadow: "inset 0 0 340px 90px rgba(0,0,0,0.72)" }}
      />
    </AbsoluteFill>
  );
};

// ── Faux-3D spinning chip (CSS 3D, no WebGL cost) ────────────────────────────
export const Chip: React.FC<{ size?: number; label?: string }> = ({
  size = 170,
  label = "S5",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const intro = spring({ frame, fps, config: { damping: 13, stiffness: 160 } });
  const ry = interpolate(frame, [0, 120], [0, 360]);
  const rx = Math.sin(frame / 30) * 8;
  const scale = interpolate(intro, [0, 1], [0.2, 1]);
  return (
    <div style={{ perspective: 900 }}>
      <div
        style={{
          width: size,
          height: size,
          borderRadius: size * 0.24,
          transform: `rotateX(${rx}deg) rotateY(${ry}deg) scale(${scale})`,
          background: `linear-gradient(145deg, #6f97ff 0%, ${colors.accent} 45%, #2b52c9 100%)`,
          border: "2px solid rgba(255,255,255,0.35)",
          boxShadow: `0 0 90px ${colors.accentGlow}, inset 0 2px 14px rgba(255,255,255,0.4)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: fonts.display,
          fontWeight: 700,
          fontSize: size * 0.34,
          color: "white",
          textShadow: "0 2px 10px rgba(0,0,0,0.35)",
        }}
      >
        {label}
      </div>
    </div>
  );
};

// ── Kinetic typography: staggered word reveal with blur ──────────────────────
export const KineticHook: React.FC<{ text: string; size?: number }> = ({
  text,
  size = 128,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = text.split(" ");
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 20,
        justifyContent: "center",
        maxWidth: 940,
      }}
    >
      {words.map((w, i) => {
        const s = spring({
          frame: frame - i * 4,
          fps,
          config: { damping: 15, stiffness: 180 },
        });
        const y = interpolate(s, [0, 1], [70, 0]);
        const blur = interpolate(s, [0, 1], [14, 0]);
        return (
          <span
            key={i}
            style={{
              fontFamily: fonts.display,
              fontWeight: 700,
              fontSize: size,
              lineHeight: 1.0,
              letterSpacing: "-0.03em",
              textTransform: "uppercase",
              color: i % 3 === 1 ? colors.accent : colors.text,
              opacity: s,
              transform: `translateY(${y}px)`,
              filter: `blur(${blur}px)`,
              textShadow: "0 8px 40px rgba(0,0,0,0.5)",
            }}
          >
            {w}
          </span>
        );
      })}
    </div>
  );
};

// ── Animated count-up stat ───────────────────────────────────────────────────
export const NumberStat: React.FC<{
  value: number;
  decimals?: number;
  suffix?: string;
  label: string;
}> = ({ value, decimals = 0, suffix = "", label }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 200 } });
  const n = interpolate(s, [0, 1], [0, value]);
  const rise = interpolate(frame, [0, 16], [40, 0], {
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div style={{ textAlign: "center", transform: `translateY(${rise}px)` }}>
        <div
          style={{
            fontFamily: fonts.display,
            fontWeight: 700,
            fontSize: 300,
            lineHeight: 1,
            letterSpacing: "-0.04em",
            color: colors.accent,
            textShadow: `0 0 80px ${colors.accentGlow}`,
          }}
        >
          {n.toFixed(decimals)}
          {suffix}
        </div>
        <div
          style={{
            marginTop: 20,
            fontFamily: fonts.body,
            fontWeight: 700,
            fontSize: 52,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: colors.text,
          }}
        >
          {label}
        </div>
      </div>
    </AbsoluteFill>
  );
};
