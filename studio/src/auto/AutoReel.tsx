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
import { C } from "../nick/tokens";
import {
  SceneBg,
  Headline,
  Stat,
  Compare,
  Terminal,
  LogoDrop,
  Points,
  Quote,
  Callout,
  Screenshot,
  type Bg,
} from "./scenes";

// Bespoke, animated, PARAMETRIC scene vocabulary. The director (bot/lib/scenePlan.ts) emits
// these filled with the reel's ACTUAL content and covers ~70% of the timeline. See scenes.tsx.
export type Scene =
  | { kind: "headline"; startMs: number; endMs: number; text: string; emphasis?: string; bg?: Bg }
  | { kind: "stat"; startMs: number; endMs: number; value: string; sub?: string; kicker?: string; bg?: Bg }
  | { kind: "compare"; startMs: number; endMs: number; title?: string; unit?: string; rows: { label: string; value: number; note?: string; highlight?: boolean }[]; bg?: Bg }
  | { kind: "terminal"; startMs: number; endMs: number; title?: string; lines: string[]; bg?: Bg }
  | { kind: "logo"; startMs: number; endMs: number; name: string; tagline?: string; src?: string; bg?: Bg }
  | { kind: "points"; startMs: number; endMs: number; title?: string; items: string[]; bg?: Bg }
  | { kind: "quote"; startMs: number; endMs: number; pre: string; boxed: string; post?: string; bg?: Bg }
  | { kind: "callout"; startMs: number; endMs: number; text: string; bg?: Bg }
  | { kind: "screenshot"; startMs: number; endMs: number; src: string; url?: string; label?: string };

export type AutoReelData = {
  videoSrc: string;
  captions: Word[];
  scenes: Scene[];
  music?: string;
  sfx?: { file: string; atMs: number; trimBeforeMs?: number; volume?: number }[];
  voiceBoost?: number;
};

const asset = (s: string) => (s.startsWith("http") ? s : staticFile(s));

const SceneBody: React.FC<{ s: Scene }> = ({ s }) => {
  switch (s.kind) {
    case "headline":
      return <Headline text={s.text} emphasis={s.emphasis} bg={s.bg} />;
    case "stat":
      return <Stat value={s.value} sub={s.sub} kicker={s.kicker} bg={s.bg} />;
    case "compare":
      return <Compare title={s.title} unit={s.unit} rows={s.rows} bg={s.bg} />;
    case "terminal":
      return <Terminal title={s.title} lines={s.lines} bg={s.bg} />;
    case "logo":
      return <LogoDrop name={s.name} tagline={s.tagline} src={s.src} bg={s.bg} />;
    case "points":
      return <Points title={s.title} items={s.items} bg={s.bg} />;
    case "quote":
      return <Quote pre={s.pre} boxed={s.boxed} post={s.post} bg={s.bg} />;
    case "callout":
      return <Callout text={s.text} bg={s.bg} />;
    case "screenshot":
      return <Screenshot src={s.src} label={s.label} />;
    default:
      return null;
  }
};

// quick fade at the edges so a full-screen scene doesn't hard-flash in/out
const Fade: React.FC<{ durF: number; children: React.ReactNode }> = ({ durF, children }) => {
  const f = useCurrentFrame();
  const op = interpolate(f, [0, 4, durF - 4, durF], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ opacity: op }}>{children}</AbsoluteFill>;
};

export const AutoReel: React.FC<AutoReelData> = ({ videoSrc, captions, scenes, music, sfx, voiceBoost }) => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const f = (ms: number) => Math.round((ms / 1000) * fps);

  return (
    <AbsoluteFill style={{ background: C.black }}>
      {/* talking head base (shows between scenes) */}
      {videoSrc ? (
        <OffthreadVideo src={asset(videoSrc)} volume={voiceBoost ?? 1} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <AbsoluteFill style={{ background: "linear-gradient(165deg,#6b5b4d,#332c27)" }} />
      )}

      {/* full-screen motion-graphic scenes, timed to the words (hard cuts, ~70% coverage) */}
      {scenes.map((s, i) => {
        const from = f(s.startMs);
        const dur = Math.max(1, f(s.endMs) - from);
        return (
          <Sequence key={i} from={from} durationInFrames={dur} layout="none">
            <Fade durF={dur}>
              <SceneBody s={s} />
            </Fade>
          </Sequence>
        );
      })}

      {/* lofi bed — the primary audio; clearly present (was too quiet before) */}
      {music ? <Audio src={asset(music)} volume={0.32} loop /> : null}

      {/* subtle transition SFX (kept quiet so the music leads) */}
      {(sfx ?? []).map((s, i) => (
        <Sequence key={`sfx${i}`} from={f(s.atMs)} durationInFrames={Math.round(1.6 * fps)} layout="none">
          <Audio src={asset(s.file)} volume={s.volume ?? 0.18} trimBefore={f(s.trimBeforeMs ?? 0)} />
        </Sequence>
      ))}

      <NickCaption words={captions} timeMs={(frame / fps) * 1000} />
    </AbsoluteFill>
  );
};
