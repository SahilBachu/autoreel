import { AbsoluteFill } from "remotion";
import type { Word } from "../../types";
import { captions as C, colors, fonts } from "../../style/tokens";

// Rolling 2–3 word window, ALL CAPS, pinned bottom. Active word in accent + slight
// scale. Legible via thin stroke + soft shadow (not a cartoon 4px outline).
export const CleanCaps: React.FC<{ words: Word[]; timeMs: number }> = ({
  words,
  timeMs,
}) => {
  if (words.length === 0) return null;

  let current = -1;
  for (let i = 0; i < words.length; i++) {
    if (words[i].startMs <= timeMs) current = i;
    else break;
  }
  if (current < 0) return null;

  const activeIdx = words.findIndex((w) => w.startMs <= timeMs && timeMs < w.endMs);

  const half = Math.floor(C.windowSize / 2);
  let start = Math.max(0, current - half);
  start = Math.min(start, Math.max(0, words.length - C.windowSize));
  const windowWords = words.slice(start, start + C.windowSize);

  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        alignItems: "center",
        paddingBottom: C.bottom,
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: C.gap,
          maxWidth: C.maxWidth,
          fontFamily: fonts.body,
          fontWeight: C.fontWeight,
          fontSize: C.fontSize,
          lineHeight: C.lineHeight,
          letterSpacing: C.letterSpacing,
          textAlign: "center",
          textTransform: C.uppercase ? "uppercase" : "none",
        }}
      >
        {windowWords.map((w, i) => {
          const globalIdx = start + i;
          const isActive = globalIdx === activeIdx;
          return (
            <span
              key={globalIdx}
              style={{
                color: isActive ? C.activeColor : C.idleColor,
                scale: isActive ? String(C.activeScale) : "1",
                display: "inline-block",
                transformOrigin: "center bottom",
                WebkitTextStrokeWidth: C.strokeWidth,
                WebkitTextStrokeColor: C.strokeColor,
                textShadow: isActive
                  ? `0 0 34px ${colors.accentGlow}, ${C.shadow}`
                  : C.shadow,
              }}
            >
              {w.text}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
