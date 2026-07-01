import {
  AbsoluteFill,
  OffthreadVideo,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import type { Word } from "../types";
import { NickCaption } from "../nick/Caption";
import { DotGrid, TitleSerif, Statement } from "../reel_cursor/parts";
import { C } from "../nick/tokens";

// The DATA-DRIVEN reel: the Robot emits AutoReelData (clip + whisper captions + a scene
// plan), and this renders it. Captions + cutaways are timed to the transcript, so they
// match the audio. Cutaways cover the face while active; otherwise the talking head shows.
export type Cutaway =
  | { kind: "title"; startMs: number; endMs: number; lines: { text: string; boxed?: boolean }[] }
  | { kind: "statement"; startMs: number; endMs: number; pre: string; boxed: string; post?: string };

export type AutoReelData = {
  videoSrc: string; // staticFile path (public/…) or url
  captions: Word[];
  cutaways: Cutaway[];
};

const src = (s: string) => (s.startsWith("http") ? s : staticFile(s));

const Face: React.FC<{ videoSrc: string }> = ({ videoSrc }) =>
  videoSrc ? (
    <AbsoluteFill>
      <OffthreadVideo src={src(videoSrc)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    </AbsoluteFill>
  ) : (
    <AbsoluteFill style={{ background: "linear-gradient(165deg,#6b5b4d,#332c27)" }} />
  );

const CutawayView: React.FC<{ c: Cutaway; localFrame: number; fps: number }> = ({ c, localFrame, fps }) => {
  // quick fade so hard cuts don't flicker at the boundary
  const inOp = interpolate(localFrame, [0, 3], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  void spring;
  return (
    <AbsoluteFill style={{ opacity: inOp }}>
      <DotGrid />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: 80 }}>
        {c.kind === "title" ? (
          <TitleSerif lines={c.lines} />
        ) : (
          <Statement pre={c.pre} boxed={c.boxed} post={c.post} />
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const AutoReel: React.FC<AutoReelData> = ({ videoSrc, captions, cutaways }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ms = (frame / fps) * 1000;
  const active = cutaways.find((c) => ms >= c.startMs && ms < c.endMs);
  return (
    <AbsoluteFill style={{ background: C.black }}>
      <Face videoSrc={videoSrc} />
      {active ? (
        <CutawayView c={active} localFrame={frame - Math.round((active.startMs / 1000) * fps)} fps={fps} />
      ) : null}
      <NickCaption words={captions} timeMs={ms} />
    </AbsoluteFill>
  );
};
