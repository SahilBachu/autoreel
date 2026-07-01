import {
  AbsoluteFill,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { Insert, ReelData } from "./types";
import { Frame } from "./components/Frame";
import { InsertCard } from "./components/Cards";
import { captionPresets } from "./presets/captions";
import { backgroundPresets } from "./presets/backgrounds";
import { colors, fonts, layout, motion, msToFrames } from "./style/tokens";

function presenceOf(insert: Insert, frame: number, fps: number): number {
  const appear = spring({
    frame: frame - msToFrames(insert.startMs),
    fps,
    config: motion.card,
  });
  const disappear = spring({
    frame: frame - msToFrames(insert.endMs),
    fps,
    config: motion.card,
  });
  return Math.max(0, Math.min(1, appear - disappear));
}

const Watermark: React.FC<{ handle: string }> = ({ handle }) => (
  <AbsoluteFill
    style={{ alignItems: "flex-end", justifyContent: "flex-start", padding: 46 }}
  >
    <div
      style={{
        fontFamily: fonts.body,
        fontWeight: 700,
        fontSize: 30,
        letterSpacing: "0.02em",
        color: colors.text,
        opacity: 0.55,
        textShadow: "0 2px 12px rgba(0,0,0,0.6)",
      }}
    >
      {handle}
    </div>
  </AbsoluteFill>
);

export const Reel: React.FC<ReelData> = (data) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const timeMs = (frame / fps) * 1000;

  const Background = backgroundPresets[data.style.background];
  const Captions = captionPresets[data.style.caption];

  // dominant insert (inserts assumed non-overlapping)
  let dominant: Insert | null = null;
  let presence = 0;
  for (const ins of data.inserts) {
    const p = presenceOf(ins, frame, fps);
    if (p > presence) {
      presence = p;
      dominant = ins;
    }
  }

  const frameScale = 1 - presence * (1 - motion.frameScaleWithCard);
  const frameDim = 1 - presence * (1 - motion.frameDimWithCard);
  const cardY = -(1 - presence) * motion.cardOffscreenY;

  return (
    <AbsoluteFill>
      <Background />

      <Frame videoSrc={data.videoSrc} scale={frameScale} dim={frameDim} />

      {/* cards float in the UPPER area, entering from above */}
      {dominant ? (
        <AbsoluteFill
          style={{
            alignItems: "center",
            justifyContent: "flex-start",
            paddingTop: layout.safeTop + motion.cardTopInset - 120,
            paddingLeft: layout.pad,
            paddingRight: layout.pad,
          }}
        >
          <div style={{ translate: `0px ${cardY}px`, opacity: presence }}>
            <InsertCard insert={dominant} />
          </div>
        </AbsoluteFill>
      ) : null}

      {/* captions ALWAYS pinned to the bottom */}
      <Captions words={data.captions} timeMs={timeMs} />

      <Watermark handle={data.handle} />
    </AbsoluteFill>
  );
};
