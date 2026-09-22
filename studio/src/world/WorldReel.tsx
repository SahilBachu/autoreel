import React, { useMemo } from "react";
import { AbsoluteFill, Audio, Easing, OffthreadVideo, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { AccentProvider, resolveAccent, T } from "../auto/theme";
import { Caption2, SceneModeCtx } from "../auto/fx";
import { useGeistFonts } from "../auto/fonts2";
import { SceneBody, SceneBoundary, sceneRenderable } from "../auto/scenes";
import { planTitle, TitleOverlay } from "../auto/title";
import type { AutoReelData } from "../auto/AutoReel";
import { ANCHOR, layoutWorld, type WorldObject } from "./layout";
import { arrival, buildCamera, camAt, worldOpacity, worldWindows } from "./camera";

// ─────────────────────────────────────────────────────────────────────────────
// WorldReel — the SECOND renderer. Same props as AutoReel (the director's plan is
// identical); instead of full-screen cards hard-cutting over his face, every scene
// is an OBJECT in one connected world and a single camera travels between them.
//
// He is the floor of the world: the clip stays full-frame the whole time, objects
// hang from the top of the frame and overlap his hair/forehead on a feathered dark
// pool (no opaque backgrounds, no haze), his eyes and mouth stay clear, and the
// world fades out completely for the face beats the director planned. Opening =
// TitleOverlay (him + the title, nothing else) — shared with AutoReel.
// ─────────────────────────────────────────────────────────────────────────────

const asset = (s: string) => (s.startsWith("http") ? s : staticFile(s));

// hairline trail from the previous object to this one — draws ahead of the camera during
// the travel, so the move reads as "following the line", then stays as a faint route.
const Trail: React.FC<{ objs: WorldObject[]; i: number }> = ({ objs, i }) => {
  const f = useCurrentFrame();
  const o = objs[i];
  const p = objs[i - 1];
  const [a, b] = arrival(objs, i);
  const draw = interpolate(f, [a, b], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
  if (draw <= 0) return null;
  const G = 18;
  const horizontal = Math.abs(o.cx - p.cx) > Math.abs(o.cy - p.cy);
  let d: string;
  if (horizontal) {
    const dir = o.cx > p.cx ? 1 : -1;
    const x0 = p.cx + dir * (p.w / 2 - 40), x1 = o.cx - dir * (o.w / 2 - 40);
    const y0 = p.cy - p.h / 2 + 60, y1 = o.cy - o.h / 2 + 60;
    d = `M ${x0} ${y0} H ${(x0 + x1) / 2} V ${y1} H ${x1}`;
  } else {
    const y0 = p.cy + p.h / 2 + G, y1 = o.cy - o.h / 2 - G;
    d = `M ${p.cx} ${y0} V ${(y0 + y1) / 2} H ${o.cx} V ${y1}`;
  }
  return (
    <svg style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }} width={1} height={1}>
      <path d={d} fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth={2} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} />
    </svg>
  );
};

export const WorldReel: React.FC<AutoReelData> = ({ videoSrc, captions, scenes: planned, accent, music, sfx, voiceBoost, title, titleKicker, titleEmphasis }) => {
  const { fps, durationInFrames } = useVideoConfig();
  const frame = useCurrentFrame();
  const f = (ms: number) => Math.round((ms / 1000) * fps);
  useGeistFonts();

  const { title: tp, scenes } = planTitle(planned ?? [], { title, titleKicker, titleEmphasis });
  const objs = useMemo(() => layoutWorld(scenes.filter(sceneRenderable), fps), [scenes, fps]);
  const cam = useMemo(() => buildCamera(objs, durationInFrames), [objs, durationInFrames]);
  const windows = useMemo(() => worldWindows(objs, durationInFrames), [objs, durationInFrames]);
  const op = worldOpacity(windows, frame);
  const c = camAt(cam, frame);

  return (
    <AccentProvider value={resolveAccent(accent)}>
      <AbsoluteFill style={{ background: T.bg }}>
        {/* him — the floor of the world, never covered */}
        {videoSrc ? (
          <OffthreadVideo src={asset(videoSrc)} volume={voiceBoost ?? 1} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <AbsoluteFill style={{ background: `linear-gradient(170deg, ${T.bg2}, ${T.bg})` }} />
        )}

        {tp ? (
          <Sequence from={0} durationInFrames={f(tp.endMs)} layout="none">
            <TitleOverlay text={tp.text} kicker={tp.kicker} emphasis={tp.emphasis} durF={f(tp.endMs)} />
          </Sequence>
        ) : null}

        {/* the world, seen through the camera */}
        {op > 0 && objs.length ? (
          <AbsoluteFill style={{ opacity: op, overflow: "hidden" }}>
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: 0,
                height: 0,
                transformOrigin: "0 0",
                transform: `translate(${ANCHOR.x - c.x * c.z}px, ${ANCHOR.y - c.y * c.z}px) scale(${c.z})`,
              }}
            >
              <SceneModeCtx.Provider value="object">
                {objs.map((o, i) => (
                  <React.Fragment key={i}>
                    {i > 0 ? <Trail objs={objs} i={i} /> : null}
                    <Sequence from={o.from} layout="none">
                      <div style={{ position: "absolute", left: o.cx - o.w / 2, top: o.cy - o.h / 2, width: o.w, height: o.h }}>
                        <SceneBoundary kind={o.scene.kind}>
                          <SceneBody s={o.scene} />
                        </SceneBoundary>
                      </div>
                    </Sequence>
                  </React.Fragment>
                ))}
              </SceneModeCtx.Provider>
            </div>
          </AbsoluteFill>
        ) : null}

        {/* audio — identical to AutoReel */}
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
