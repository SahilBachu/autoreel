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
import { AccentProvider, resolveAccent, T } from "./theme";
import { AsciiImage, Caption2, Scene as SceneWrap } from "./fx";
import { Callout, Decrypt, Headline, Quote } from "./v2-text";
import { BarChart, Donut, LineChart, Stat, StatRow, Table } from "./v2-data";
import { Bento, CalendarCard, Chat, Checklist, Kbd, Notifications, Timeline } from "./v2-ui";
import { Browser, CodeBlock, LogoDrop, LogoWall, Phone, Terminal, TweetCard, Versus } from "./v2-media";

// ─────────────────────────────────────────────────────────────────────────────
// AutoReel v2 — dark + one bright accent per video. The director emits `scenes`
// (kinds below, catalog in ../../COMPONENTS.md); `accent` is picked at render
// time in bot/src/jobs/render.ts and threads through every component.
// ─────────────────────────────────────────────────────────────────────────────

export type Scene = { kind: string; startMs: number; endMs: number } & Record<string, any>;

export type AutoReelData = {
  videoSrc: string;
  captions: Word[];
  scenes: Scene[];
  accent?: string; // blue | cyan | green | orange | red | pink | violet
  music?: string;
  sfx?: { file: string; atMs: number; trimBeforeMs?: number; volume?: number }[];
  voiceBoost?: number;
};

const asset = (s: string) => (s.startsWith("http") ? s : staticFile(s));

const SceneBody: React.FC<{ s: Scene }> = ({ s }) => {
  switch (s.kind) {
    case "headline":
      return <Headline text={s.text} emphasis={s.emphasis} kicker={s.kicker} />;
    case "decrypt":
      return <Decrypt text={s.text} sub={s.sub} kicker={s.kicker} />;
    case "callout":
      return <Callout text={s.text} emphasis={s.emphasis} />;
    case "quote":
      return <Quote pre={s.pre} boxed={s.boxed} post={s.post} />;
    case "stat":
      return <Stat value={s.value} label={s.label ?? s.sub} kicker={s.kicker} />;
    case "statrow":
      return <StatRow items={s.items} kicker={s.kicker} />;
    case "linechart":
      return <LineChart title={s.title} values={s.values} caption={s.caption} />;
    case "barchart":
      return <BarChart title={s.title} unit={s.unit} rows={s.rows} />;
    case "donut":
      return <Donut percent={s.percent} label={s.label} kicker={s.kicker} />;
    case "table":
      return <Table title={s.title} columns={s.columns} rows={s.rows} />;
    case "bento":
      return <Bento title={s.title} cells={s.cells} />;
    case "calendar":
      return <CalendarCard month={s.month} highlights={s.highlights} label={s.label} />;
    case "timeline":
      return <Timeline title={s.title} steps={s.steps} />;
    case "chat":
      return <Chat app={s.app} messages={s.messages} />;
    case "notifications":
      return <Notifications items={s.items} />;
    case "checklist":
      return <Checklist title={s.title} items={s.items} />;
    case "kbd":
      return <Kbd keys={s.keys} label={s.label} />;
    case "tweet":
      return <TweetCard name={s.name} handle={s.handle} text={s.text} brand={s.brand} />;
    case "terminal":
      return <Terminal title={s.title} lines={s.lines} />;
    case "code":
      return <CodeBlock title={s.title} lines={s.lines} highlight={s.highlight} />;
    case "browser":
    case "screenshot": // legacy alias
      return s.src ? <Browser src={s.src} label={s.label} /> : null;
    case "phone":
      return <Phone src={s.src} label={s.label} />;
    case "logo":
      return <LogoDrop name={s.name} tagline={s.tagline} src={s.src} />;
    case "logowall":
      return <LogoWall title={s.title} brands={s.brands} />;
    case "versus":
      return <Versus a={s.a} b={s.b} aNote={s.aNote} bNote={s.bNote} />;
    case "ascii":
      return (
        <SceneWrap bg="plain">
          <AsciiImage src={s.src} brand={s.brand} label={s.label} />
        </SceneWrap>
      );
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

export const AutoReel: React.FC<AutoReelData> = ({ videoSrc, captions, scenes, accent, music, sfx, voiceBoost }) => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const f = (ms: number) => Math.round((ms / 1000) * fps);

  return (
    <AccentProvider value={resolveAccent(accent)}>
      <AbsoluteFill style={{ background: T.bg }}>
        {/* talking head base (shows between scenes) */}
        {videoSrc ? (
          <OffthreadVideo src={asset(videoSrc)} volume={voiceBoost ?? 1} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <AbsoluteFill style={{ background: `linear-gradient(170deg, ${T.bg2}, ${T.bg})` }} />
        )}

        {/* full-screen motion-graphic scenes, timed to the words */}
        {(scenes ?? []).map((s, i) => {
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

        {/* lofi bed leads; SFX stay subtle */}
        {music ? <Audio src={asset(music)} volume={0.32} loop /> : null}
        {(sfx ?? []).map((s, i) => (
          <Sequence key={`sfx${i}`} from={f(s.atMs)} durationInFrames={Math.round(1.6 * fps)} layout="none">
            <Audio src={asset(s.file)} volume={s.volume ?? 0.16} trimBefore={f(s.trimBeforeMs ?? 0)} />
          </Sequence>
        ))}

        <Caption2 words={captions} timeMs={(frame / fps) * 1000} />
      </AbsoluteFill>
    </AccentProvider>
  );
};
