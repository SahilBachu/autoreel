import {
  AbsoluteFill,
  Audio,
  OffthreadVideo,
  Sequence,
  staticFile,
  useVideoConfig,
  useCurrentFrame,
  interpolate,
} from "remotion";
import type { Word } from "../types";
import { NickCaption } from "../nick/Caption";
import { DotGrid, TitleSerif, Statement, AgentGrid, SpeedBars, CursorLogo } from "../reel_cursor/parts";
import { Window } from "../nick/components";
import { S, SF } from "../reel_cursor/skin";
import { C } from "../nick/tokens";

// Full cutaway vocabulary. The director (bot/src/lib/scenePlan.ts) emits these, timed to
// the transcript. Add more kinds here + a matching case in <CutawayBody> as the kit grows.
export type Cutaway =
  | { kind: "title"; startMs: number; endMs: number; lines: { text: string; boxed?: boolean }[] }
  | { kind: "statement"; startMs: number; endMs: number; pre: string; boxed: string; post?: string }
  | { kind: "agents"; startMs: number; endMs: number; kicker?: string }
  | { kind: "speed"; startMs: number; endMs: number; kicker?: string }
  | { kind: "terminal"; startMs: number; endMs: number; title?: string; lines: string[] }
  | { kind: "logo"; startMs: number; endMs: number };

export type AutoReelData = {
  videoSrc: string;
  captions: Word[];
  cutaways: Cutaway[];
  music?: string; // public/ path
  sfx?: { file: string; atMs: number }[];
  voiceBoost?: number; // multiply the clip's voice volume (soft audio -> louder)
};

const asset = (s: string) => (s.startsWith("http") ? s : staticFile(s));

const Kicker: React.FC<{ text: string }> = ({ text }) => (
  <div style={{ fontFamily: SF.body, fontWeight: 700, fontSize: 26, letterSpacing: "0.22em", textTransform: "uppercase", color: S.rust, marginBottom: 34 }}>
    {text}
  </div>
);

const Paper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AbsoluteFill>
    <DotGrid />
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: 80 }}>
      {children}
    </AbsoluteFill>
  </AbsoluteFill>
);

const CutawayBody: React.FC<{ c: Cutaway }> = ({ c }) => {
  switch (c.kind) {
    case "title":
      return <Paper><TitleSerif lines={c.lines} /></Paper>;
    case "statement":
      return <Paper><Statement pre={c.pre} boxed={c.boxed} post={c.post} /></Paper>;
    case "agents":
      return <Paper><div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}><Kicker text={c.kicker ?? "8 agents · in parallel"} /><AgentGrid /></div></Paper>;
    case "speed":
      return <Paper><div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}><Kicker text={c.kicker ?? "Composer — their own model"} /><SpeedBars /></div></Paper>;
    case "logo":
      return <AbsoluteFill style={{ background: C.black, justifyContent: "center", alignItems: "center" }}><CursorLogo onDark /></AbsoluteFill>;
    case "terminal":
      return (
        <AbsoluteFill style={{ background: S.orangeBg, justifyContent: "center", alignItems: "center" }}>
          <Window title={c.title ?? "Composer"} variant="win" width={860} height={880}>
            <div style={{ padding: 40, fontFamily: SF.mono, fontSize: 28, lineHeight: 1.7, color: S.whiteDim }}>
              {c.lines.map((l, i) => (
                <div key={i} style={{ color: i === 0 ? S.white : undefined }}>{l}</div>
              ))}
            </div>
          </Window>
        </AbsoluteFill>
      );
  }
};

// small fade so a cutaway doesn't flash at its edges
const Fader: React.FC<{ durF: number; children: React.ReactNode }> = ({ durF, children }) => {
  const f = useCurrentFrame();
  const op = interpolate(f, [0, 3, durF - 3, durF], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ opacity: op }}>{children}</AbsoluteFill>;
};

export const AutoReel: React.FC<AutoReelData> = ({ videoSrc, captions, cutaways, music, sfx, voiceBoost }) => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const f = (ms: number) => Math.round((ms / 1000) * fps);

  return (
    <AbsoluteFill style={{ background: C.black }}>
      {/* talking head (voice boosted) */}
      {videoSrc ? (
        <OffthreadVideo src={asset(videoSrc)} volume={voiceBoost ?? 1} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <AbsoluteFill style={{ background: "linear-gradient(165deg,#6b5b4d,#332c27)" }} />
      )}

      {/* cutaways as timed sequences (their own animations play from local frame 0) */}
      {cutaways.map((c, i) => {
        const from = f(c.startMs);
        const dur = f(c.endMs) - from;
        return (
          <Sequence key={i} from={from} durationInFrames={dur} layout="none">
            <Fader durF={dur}><CutawayBody c={c} /></Fader>
          </Sequence>
        );
      })}

      {/* music bed, ducked low */}
      {music ? <Audio src={asset(music)} volume={0.12} loop /> : null}

      {/* one-shot SFX */}
      {(sfx ?? []).map((s, i) => (
        <Sequence key={`sfx${i}`} from={f(s.atMs)} durationInFrames={fps} layout="none">
          <Audio src={asset(s.file)} volume={0.5} />
        </Sequence>
      ))}

      <NickCaption words={captions} timeMs={(frame / fps) * 1000} />
    </AbsoluteFill>
  );
};
