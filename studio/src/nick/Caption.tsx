import { AbsoluteFill, interpolate } from "remotion";
import { C, F } from "./tokens";
import type { Word } from "../types";

// Nick-style captions: short white phrase on a dark translucent pill, centered low.
export const NickCaption: React.FC<{ words: Word[]; timeMs: number }> = ({
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

  const WINDOW = 3;
  let start = Math.max(0, current - (WINDOW - 1));
  const windowWords = words.slice(start, current + 1).slice(-WINDOW);

  // tiny lift when a new word lands
  const wStart = words[current].startMs;
  const since = (timeMs - wStart) / 1000;
  const lift = interpolate(since, [0, 0.12], [8, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const pop = interpolate(since, [0, 0.12], [0.96, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 560 }}
    >
      <div
        style={{
          transform: `translateY(${lift}px) scale(${pop})`,
          background: C.capPill,
          borderRadius: 18,
          padding: "12px 28px",
          display: "flex",
          gap: 14,
          maxWidth: 900,
          flexWrap: "wrap",
          justifyContent: "center",
          boxShadow: "0 12px 34px -10px rgba(0,0,0,0.5)",
        }}
      >
        {windowWords.map((w, i) => (
          <span
            key={start + i}
            style={{
              fontFamily: F.display,
              fontWeight: 700,
              fontSize: 58,
              color: C.white,
              letterSpacing: "-0.01em",
            }}
          >
            {w.text}
          </span>
        ))}
      </div>
    </AbsoluteFill>
  );
};
