import { AbsoluteFill, OffthreadVideo, staticFile } from "remotion";
import { colors, layout, fonts, WIDTH, HEIGHT } from "../style/tokens";

// The talking-head clip inside a rounded frame. Overlay model: the frame holds
// its place and subtly recedes (scale + dim) when a card floats over the top.
export const Frame: React.FC<{
  videoSrc: string;
  scale: number;
  dim: number; // brightness multiplier (1 = full)
}> = ({ videoSrc, scale, dim }) => {
  const src = videoSrc
    ? videoSrc.startsWith("http")
      ? videoSrc
      : staticFile(videoSrc)
    : "";

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div
        style={{
          position: "relative",
          width: FRAME_W,
          height: FRAME_H,
          borderRadius: layout.frameRadius,
          overflow: "hidden",
          border: `1.5px solid ${colors.hairline}`,
          boxShadow: `0 50px 130px -30px rgba(0,0,0,0.8)`,
          backgroundColor: colors.bgElevated,
          scale: String(scale),
          filter: `brightness(${dim})`,
        }}
      >
        {src ? (
          <OffthreadVideo
            src={src}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <Placeholder />
        )}
      </div>
    </AbsoluteFill>
  );
};

const FRAME_W = WIDTH - 72; // ~1008
const FRAME_H = HEIGHT - 300; // ~1620, leaves room for captions/cards to breathe

const Placeholder: React.FC = () => (
  <AbsoluteFill
    style={{
      justifyContent: "center",
      alignItems: "center",
      background: `linear-gradient(160deg, #17171c 0%, #0c0c0f 100%)`,
      fontFamily: fonts.body,
    }}
  >
    <div
      style={{
        color: colors.textFaint,
        fontSize: 40,
        fontWeight: 600,
        letterSpacing: "0.16em",
        textTransform: "uppercase",
      }}
    >
      your clip
    </div>
  </AbsoluteFill>
);
