import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Easing,
} from "remotion";
import {
  TransitionSeries,
  linearTiming,
} from "@remotion/transitions";
import { slide } from "@remotion/transitions/slide";
import { fade } from "@remotion/transitions/fade";
import { wipe } from "@remotion/transitions/wipe";
import type { Word } from "../types";
import { colors, fonts, layout } from "../style/tokens";
import { Frame } from "../components/Frame";
import { ProofCard, TweetCard } from "../components/Cards";
import { CleanCaps } from "../presets/captions/CleanCaps";
import { PunchCaps } from "../presets/captions/PunchCaps";
import { MovingGradient, Chip, KineticHook, NumberStat } from "./effects";

const mkWords = (s: string, per = 300, off = 200): Word[] =>
  s.split(" ").map((text, i) => ({
    text,
    startMs: off + i * per,
    endMs: off + i * per + per - 40,
  }));

// ── Scene 1: kinetic hook + spinning chip ────────────────────────────────────
const SceneHook: React.FC = () => {
  const frame = useCurrentFrame();
  const underline = interpolate(frame, [18, 42], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  return (
    <AbsoluteFill>
      <MovingGradient />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", gap: 60 }}>
        <Chip label="S5" />
        <div style={{ textAlign: "center" }}>
          <KineticHook text="Sonnet 5 just dropped" />
          <div
            style={{
              height: 10,
              width: `${underline * 60}%`,
              margin: "40px auto 0",
              borderRadius: 8,
              background: colors.accent,
              boxShadow: `0 0 34px ${colors.accentGlow}`,
            }}
          />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ── Scene 2: talking-head + proof card sliding from top ──────────────────────
const SceneClipProof: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const present = spring({ frame: frame - 10, fps, config: { damping: 20, stiffness: 130 } });
  const cardY = interpolate(present, [0, 1], [-200, 0]);
  return (
    <AbsoluteFill>
      <MovingGradient />
      <Frame videoSrc="" scale={1 - present * 0.04} dim={1 - present * 0.28} />
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "flex-start",
          paddingTop: layout.safeTop,
        }}
      >
        <div style={{ transform: `translateY(${cardY}px)`, opacity: present }}>
          <ProofCard
            data={{
              label: "SWE-bench Verified",
              rows: [
                { name: "Opus 4.8", value: "77.2%" },
                { name: "Sonnet 5", value: "76.8%", highlight: true },
                { name: "Price", value: "½ the cost", highlight: true },
              ],
            }}
          />
        </div>
      </AbsoluteFill>
      <CleanCaps words={mkWords("it's basically as good as opus")} timeMs={(frame / fps) * 1000} />
    </AbsoluteFill>
  );
};

// ── Scene 3: tweet card + punchy one-word captions ───────────────────────────
const SceneTweet: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const present = spring({ frame: frame - 8, fps, config: { damping: 20, stiffness: 130 } });
  const cardY = interpolate(present, [0, 1], [-180, 0]);
  return (
    <AbsoluteFill>
      <MovingGradient />
      <Frame videoSrc="" scale={1 - present * 0.04} dim={1 - present * 0.28} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-start", paddingTop: layout.safeTop }}>
        <div style={{ transform: `translateY(${cardY}px)`, opacity: present }}>
          <TweetCard
            data={{
              name: "some dev",
              handle: "@buildooor",
              text: "the medium model quietly becoming last year's frontier every few months is insane",
            }}
          />
        </div>
      </AbsoluteFill>
      <PunchCaps words={mkWords("nobody even blinks anymore", 380)} timeMs={(frame / fps) * 1000} />
    </AbsoluteFill>
  );
};

// ── Scene 4: big animated stat ───────────────────────────────────────────────
const SceneStat: React.FC = () => (
  <AbsoluteFill>
    <MovingGradient />
    <NumberStat value={76.8} decimals={1} suffix="%" label="Sonnet 5 · SWE-bench" />
  </AbsoluteFill>
);

// ── Scene 5: outro handle glow ───────────────────────────────────────────────
const SceneOutro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 16 } });
  return (
    <AbsoluteFill>
      <MovingGradient />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", gap: 50 }}>
        <Chip label="@" size={130} />
        <div
          style={{
            fontFamily: fonts.display,
            fontWeight: 700,
            fontSize: 110,
            letterSpacing: "-0.02em",
            color: colors.text,
            opacity: s,
            transform: `scale(${interpolate(s, [0, 1], [0.9, 1])})`,
            textShadow: `0 0 50px ${colors.accentGlow}`,
          }}
        >
          @autoreel
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const T = () => linearTiming({ durationInFrames: 22, easing: Easing.inOut(Easing.ease) });

export const Showcase: React.FC = () => {
  return (
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={90}>
        <SceneHook />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={T()} />
      <TransitionSeries.Sequence durationInFrames={150}>
        <SceneClipProof />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={T()} />
      <TransitionSeries.Sequence durationInFrames={120}>
        <SceneTweet />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={wipe({ direction: "from-bottom" })} timing={T()} />
      <TransitionSeries.Sequence durationInFrames={90}>
        <SceneStat />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={T()} />
      <TransitionSeries.Sequence durationInFrames={80}>
        <SceneOutro />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  );
};

// total = (90+150+120+90+80) - 4*22 = 442 frames
export const SHOWCASE_FRAMES = 442;
