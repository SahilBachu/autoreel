import React from "react";
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
import { Caption2 } from "./fx";
import { useGeistFonts } from "./fonts2";
import { SceneBody, SceneBoundary, type Scene } from "./scenes";
import { planTitle, TitleOverlay } from "./title";

// ─────────────────────────────────────────────────────────────────────────────
// AutoReel v2 — dark + one bright accent per video. The director emits `scenes`
// (kinds in ./scenes.tsx, catalog in ../../COMPONENTS.md); `accent` is picked at
// render time in bot/src/jobs/render.ts and threads through every component.
// The same props render as a camera world via ../world/WorldReel.tsx.
// ─────────────────────────────────────────────────────────────────────────────

export type { Scene } from "./scenes";

export type AutoReelData = {
  videoSrc: string;
  captions: Word[];
  scenes: Scene[];
  accent?: string; // blue | cyan | green | orange | red | pink | violet
  music?: string;
  sfx?: { file: string; atMs: number; trimBeforeMs?: number; volume?: number }[];
  voiceBoost?: number;
  /** the opening title over his face (~first 3.2s). Falls back to the first text scene in that window. */
  title?: string;
  titleKicker?: string;
  titleEmphasis?: string;
};

const asset = (s: string) => (s.startsWith("http") ? s : staticFile(s));

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

export const AutoReel: React.FC<AutoReelData> = ({ videoSrc, captions, scenes: planned, accent, music, sfx, voiceBoost, title, titleKicker, titleEmphasis }) => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const f = (ms: number) => Math.round((ms / 1000) * fps);
  useGeistFonts();
  const { title: tp, scenes } = planTitle(planned ?? [], { title, titleKicker, titleEmphasis });

  return (
    <AccentProvider value={resolveAccent(accent)}>
      <AbsoluteFill style={{ background: T.bg }}>
        {/* talking head base (shows between scenes) */}
        {videoSrc ? (
          <OffthreadVideo src={asset(videoSrc)} volume={voiceBoost ?? 1} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <AbsoluteFill style={{ background: `linear-gradient(170deg, ${T.bg2}, ${T.bg})` }} />
        )}

        {/* the opening: him, uncovered, with the title */}
        {tp ? (
          <Sequence from={0} durationInFrames={f(tp.endMs)} layout="none">
            <TitleOverlay text={tp.text} kicker={tp.kicker} emphasis={tp.emphasis} durF={f(tp.endMs)} />
          </Sequence>
        ) : null}

        {/* scenes over the talking head. contiguity = hard cut (no face flash); a gap = a face beat */}
        {(() => {
          const starts = new Set(scenes.map((s) => f(s.startMs)));
          const ends = new Set(scenes.map((s) => f(s.endMs)));
          return scenes.map((s, i) => {
            const from = f(s.startMs);
            const to = f(s.endMs);
            const dur = Math.max(1, to - from);
            const fadeIn = !ends.has(from); // nothing ends here -> coming from a face beat
            const fadeOut = !starts.has(to); // nothing starts here -> going to a face beat
            return (
              <Sequence key={i} from={from} durationInFrames={dur} layout="none">
                <Fade durF={dur} fadeIn={fadeIn} fadeOut={fadeOut}>
                  <SceneBoundary kind={s.kind}>
                    <SceneBody s={s} />
                  </SceneBoundary>
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
