import {
  AbsoluteFill,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { Word } from "../../types";
import { captions as C, colors, fonts, FPS } from "../../style/tokens";

// One big word at a time, springy pop. Higher energy alt to CleanCaps.
export const PunchCaps: React.FC<{ words: Word[]; timeMs: number }> = ({
  words,
  timeMs,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (words.length === 0) return null;

  let idx = -1;
  for (let i = 0; i < words.length; i++) {
    if (words[i].startMs <= timeMs) idx = i;
    else break;
  }
  if (idx < 0) return null;

  const wordStartFrame = Math.round((words[idx].startMs / 1000) * FPS);
  const pop = spring({
    frame: frame - wordStartFrame,
    fps,
    config: { damping: 12, stiffness: 220, mass: 0.7 },
  });

  return (
    <AbsoluteFill
      style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: C.bottom }}
    >
      <div
        style={{
          fontFamily: fonts.body,
          fontWeight: 900,
          fontSize: C.fontSize * 1.18,
          letterSpacing: C.letterSpacing,
          textTransform: "uppercase",
          color: colors.accent,
          scale: String(0.86 + pop * 0.14),
          WebkitTextStrokeWidth: C.strokeWidth,
          WebkitTextStrokeColor: C.strokeColor,
          textShadow: `0 0 40px ${colors.accentGlow}, ${C.shadow}`,
        }}
      >
        {words[idx].text}
      </div>
    </AbsoluteFill>
  );
};
