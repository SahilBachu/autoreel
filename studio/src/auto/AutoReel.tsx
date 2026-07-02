import {
  AbsoluteFill,
  Audio,
  OffthreadVideo,
  Sequence,
  staticFile,
  useVideoConfig,
  useCurrentFrame,
} from "remotion";
import type { Word } from "../types";
import { AccentProvider, resolveAccent, T } from "./theme";
import { AsciiImage, Caption2, Scene as SceneWrap } from "./fx";
import { Callout, Decrypt, Headline, Quote } from "./v2-text";
import { BarChart, Donut, LineChart, Stat, StatRow, Table } from "./v2-data";
import { Bento, CalendarCard, Chat, Checklist, Kbd, Notifications, Timeline } from "./v2-ui";
import { Browser, CodeBlock, LogoDrop, LogoWall, Phone, Terminal, TweetCard, Versus } from "./v2-media";
import { GENERATED } from "./generated/index";

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
      return <Headline text={s.text} emphasis={s.emphasis} kicker={s.kicker} overlay={s.overlay} />;
    case "decrypt":
      return <Decrypt text={s.text} sub={s.sub} kicker={s.kicker} overlay={s.overlay} />;
    case "callout":
      return <Callout text={s.text} emphasis={s.emphasis} overlay={s.overlay} />;
    case "quote":
      return <Quote pre={s.pre} boxed={s.boxed} post={s.post} overlay={s.overlay} />;
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
    case "custom": {
      // bespoke per-video component, code-generated + typechecked at render time
      const C = s.name ? GENERATED[s.name] : undefined;
      return C ? <C {...(s.props ?? {})} /> : null;
    }
    default:
      return null;
  }
};

// fade only at a scene's OUTER edges (into/out of a bare-face beat). When a scene is
// contiguous with a neighbour, that side hard-cuts — no crossfade dip that flashes the face.
const Fade: React.FC<{ durF: number; fadeIn: boolean; fadeOut: boolean; children: React.ReactNode }> = ({ durF, fadeIn, fadeOut, children }) => {
  const f = useCurrentFrame();
  const IN = 3, OUT = 3;
  let op = 1;
  if (fadeIn && f < IN) op = f / IN;
  else if (fadeOut && f > durF - OUT) op = Math.max(0, (durF - f) / OUT);
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

        {/* scenes over the talking head. contiguity = hard cut (no face flash); a gap = a face beat */}
        {(() => {
          const starts = new Set((scenes ?? []).map((s) => f(s.startMs)));
          const ends = new Set((scenes ?? []).map((s) => f(s.endMs)));
          return (scenes ?? []).map((s, i) => {
            const from = f(s.startMs);
            const to = f(s.endMs);
            const dur = Math.max(1, to - from);
            const fadeIn = !ends.has(from); // nothing ends here -> coming from a face beat
            const fadeOut = !starts.has(to); // nothing starts here -> going to a face beat
            return (
              <Sequence key={i} from={from} durationInFrames={dur} layout="none">
                <Fade durF={dur} fadeIn={fadeIn} fadeOut={fadeOut}>
                  <SceneBody s={s} />
                </Fade>
              </Sequence>
            );
          });
        })()}

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
