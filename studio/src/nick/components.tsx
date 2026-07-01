import { AbsoluteFill } from "remotion";
import { C, F } from "./tokens";

// ── Command chip: white pill + orange icon square + mono label (the /find-skills look)
export const Chip: React.FC<{ label: string; glyph?: string; scale?: number }> = ({
  label,
  glyph = "/",
  scale = 1,
}) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 20 * scale,
      background: C.creamCard,
      borderRadius: 24 * scale,
      padding: `${16 * scale}px ${28 * scale}px ${16 * scale}px ${16 * scale}px`,
      boxShadow: "0 18px 44px -18px rgba(32,29,26,0.35)",
      border: `1px solid ${C.cardBorder}`,
    }}
  >
    <div
      style={{
        width: 56 * scale,
        height: 56 * scale,
        borderRadius: 14 * scale,
        background: C.rust,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: C.white,
        fontFamily: F.mono,
        fontWeight: 700,
        fontSize: 34 * scale,
      }}
    >
      {glyph}
    </div>
    <span
      style={{
        fontFamily: F.mono,
        fontWeight: 700,
        fontSize: 40 * scale,
        color: C.ink,
        letterSpacing: "-0.01em",
      }}
    >
      {label}
    </span>
  </div>
);

// ── Orange letter badge (A, M, F …)
export const LetterBadge: React.FC<{ letter: string; size?: number }> = ({
  letter,
  size = 60,
}) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: size * 0.26,
      background: C.rust,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: C.white,
      fontFamily: F.display,
      fontWeight: 700,
      fontSize: size * 0.5,
      flexShrink: 0,
    }}
  >
    {letter}
  </div>
);

// ── Green circular check
export const GreenCheck: React.FC<{ size?: number }> = ({ size = 44 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
    <circle cx={12} cy={12} r={12} fill={C.green} />
    <path
      d="M6.5 12.5l3.2 3.2 7.8-7.8"
      stroke={C.white}
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
);

// ── Window chrome (terminal / browser). variant controls the title-bar controls.
export const Window: React.FC<{
  children: React.ReactNode;
  title?: string;
  variant?: "mac" | "win";
  bg?: string;
  width?: number;
  height?: number;
}> = ({ children, title, variant = "win", bg = C.darkPanel, width = 820, height = 1000 }) => (
  <div
    style={{
      width,
      height,
      borderRadius: 20,
      overflow: "hidden",
      background: bg,
      border: `1px solid ${C.darkBorder}`,
      boxShadow: "0 50px 120px -30px rgba(0,0,0,0.55)",
      display: "flex",
      flexDirection: "column",
    }}
  >
    <div
      style={{
        height: 56,
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "0 20px",
        borderBottom: `1px solid ${C.darkBorder}`,
        background: "rgba(255,255,255,0.03)",
      }}
    >
      {variant === "mac" ? (
        <div style={{ display: "flex", gap: 10 }}>
          {["#FF5F57", "#FEBC2E", "#28C840"].map((c) => (
            <div key={c} style={{ width: 16, height: 16, borderRadius: "50%", background: c }} />
          ))}
        </div>
      ) : null}
      {title ? (
        <span style={{ fontFamily: F.mono, fontSize: 22, color: C.whiteDim }}>{title}</span>
      ) : null}
      {variant === "win" ? (
        <div style={{ marginLeft: "auto", display: "flex", gap: 22, color: C.whiteDim, fontSize: 22 }}>
          <span>—</span>
          <span>▢</span>
          <span>✕</span>
        </div>
      ) : null}
    </div>
    <div style={{ flex: 1, overflow: "hidden" }}>{children}</div>
  </div>
);

// ── Talking-head placeholder (warm, to match the kitchen footage)
export const FacePlaceholder: React.FC<{ radius?: number }> = ({ radius = 0 }) => (
  <AbsoluteFill
    style={{
      background: "linear-gradient(165deg, #6b5b4d 0%, #4b4038 55%, #332c27 100%)",
      borderRadius: radius,
      justifyContent: "center",
      alignItems: "center",
      overflow: "hidden",
    }}
  >
    <div
      style={{
        fontFamily: F.body,
        fontWeight: 700,
        fontSize: 34,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        color: "rgba(255,255,255,0.45)",
      }}
    >
      your clip
    </div>
  </AbsoluteFill>
);
