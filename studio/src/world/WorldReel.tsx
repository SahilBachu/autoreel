import React, { useMemo } from "react";
import { AbsoluteFill, Audio, Easing, OffthreadVideo, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { AccentProvider, resolveAccent, T } from "../auto/theme";
import { Caption2, SceneModeCtx } from "../auto/fx";
import { useGeistFonts } from "../auto/fonts2";
import { SceneBody, SceneBoundary, sceneRenderable } from "../auto/scenes";
import { planTitle, TitleOverlay } from "../auto/title";
import { soundCues, type SoundCue } from "../auto/sound";
import type { AutoReelData } from "../auto/AutoReel";
import { ANCHOR, layoutWorld, type WorldObject } from "./layout";
import { at, buildTrack, LEAD, planBeats, TAIL, TRAVEL, type Beat } from "./camera";
import { buildFaceTrack, FACE } from "./face";

// ─────────────────────────────────────────────────────────────────────────────
// WorldReel — the default renderer. Same props as AutoReel (the director's plan is
// identical); instead of full-screen cards hard-cutting over his face, every scene is an
// OBJECT in one connected world and a single camera travels between them.
//
// Layers, bottom → top:
//   1. HIM — full frame, never covered by an opaque layer. Punch-ins + parallax (face.ts).
//   2. the HOOK — title.tsx, shared with AutoReel.
//   3. a 30% focus DIM while graphics hold (lifts when the world releases to him), then
//      the WORLD through the camera (camera.ts): objects park centred in the upper-middle
//      band (layout.ts ZONE), hold for as long as he talks about them, travel with a
//      speed-proportional directional motion blur, and recede as the camera leaves.
//   4. sound cues (sound.ts policy) · captions.
// ─────────────────────────────────────────────────────────────────────────────

const asset = (s: string) => (s.startsWith("http") ? s : staticFile(s));
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const MB_ID = "worldreel-motion-blur";
const DIM = "rgba(5,5,7,0.30)";

// hairline trail from the previous object to this one — draws ahead of the camera during
// the travel, so the move reads as "following the line", then stays as a faint route.
const Trail: React.FC<{ objs: WorldObject[]; i: number }> = ({ objs, i }) => {
  const f = useCurrentFrame();
  const o = objs[i];
  const p = objs[i - 1];
  const draw = interpolate(f, [o.from - LEAD, o.from + TAIL - 4], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
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
  // a bright head travels along the line while it draws; the route it leaves stays faint
  const head = 1 - clamp01((f - (o.from + TAIL - 4)) / 10);
  return (
    <svg style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }} width={1} height={1}>
      <path d={d} fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth={2} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} />
      {head > 0 ? (
        <path d={d} fill="none" stroke={`rgba(255,255,255,${(0.75 * head).toFixed(3)})`} strokeWidth={3} strokeLinecap="round" pathLength={1} strokeDasharray="0.06 1" strokeDashoffset={0.06 - draw} />
      ) : null}
    </svg>
  );
};

// the world-side shell every object sits in: it comes forward as it lands, and recedes
// (dims + shrinks back) while the camera leaves it for the next one. Kind-agnostic, so
// every component — including ones added later — inherits the depth.
const ObjectShell: React.FC<{ o: WorldObject; b: Beat; children: React.ReactNode }> = ({ o, b, children }) => {
  const lf = useCurrentFrame(); // local to the object's Sequence (mounted at o.from - LEAD)
  const { fps } = useVideoConfig();
  const g = o.from - LEAD + lf;
  const land = spring({ frame: lf, fps, config: { damping: 18, stiffness: 120, mass: 0.9 } });
  let scale = 0.955 + 0.045 * land;
  let opacity = 1;
  if (b.after === "travel" && g >= b.depart) {
    const u = clamp01((g - b.depart) / TRAVEL);
    const e = u * u * (3 - 2 * u);
    scale *= 1 - 0.06 * e;
    opacity = 1 - 0.55 * e;
  } else if (b.after === "release" && g >= b.depart) {
    scale *= 1 + 0.02 * clamp01((g - b.depart) / 10);
  }
  return (
    <div
      style={{
        position: "absolute",
        left: o.cx - o.w / 2,
        top: o.cy - o.h / 2,
        width: o.w,
        height: o.h,
        opacity,
        transform: `scale(${scale.toFixed(4)})`,
        transformOrigin: "50% 50%",
      }}
    >
      {children}
    </div>
  );
};

export const WorldReel: React.FC<AutoReelData> = ({ videoSrc, captions, scenes: planned, accent, music, sfx, voiceBoost, musicVolume, sfxGainDb, title, titleKicker, titleEmphasis }) => {
  const { fps, durationInFrames } = useVideoConfig();
  const frame = useCurrentFrame();
  const f = (ms: number) => Math.round((ms / 1000) * fps);
  useGeistFonts();
  const words = captions ?? [];

  const { title: tp, scenes } = useMemo(() => planTitle(planned ?? [], { title, titleKicker, titleEmphasis }, words), [planned, title, titleKicker, titleEmphasis, words]);
  const introEnd = tp ? f(tp.endMs) : 0;
  const objs = useMemo(() => layoutWorld(scenes.filter(sceneRenderable), fps), [scenes, fps]);
  const beats = useMemo(() => planBeats(objs, words, fps, durationInFrames), [objs, words, fps, durationInFrames]);
  const track = useMemo(() => buildTrack(objs, beats, fps, durationInFrames), [objs, beats, fps, durationInFrames]);
  const face = useMemo(
    () => buildFaceTrack({ words, fps, total: durationInFrames, worldOp: track.op, introEnd, objs, beats }),
    [words, fps, durationInFrames, track, introEnd, objs, beats],
  );

  // the scene as the component sees it: start/end = its REAL on-screen span (mount → the
  // camera leaving), so hold-life choreography paced by useBeat() matches the long holds
  const spans = useMemo(
    () => objs.map((o, i) => ({ ...o.scene, startMs: ((o.from - LEAD) / fps) * 1000, endMs: (Math.min(beats[i].depart, durationInFrames) / fps) * 1000 })),
    [objs, beats, fps, durationInFrames],
  );

  // sound: the policy (sound.ts) sees each object's on-screen span. When it returns cues they
  // replace the director's legacy `sfx` list (never both — that would double the whooshes).
  const cues = useMemo<SoundCue[]>(() => {
    try {
      const list = soundCues(
        beats.map((b, i) => ({ kind: objs[i].scene.kind, from: b.from, to: Math.min(b.end, durationInFrames), enter: b.enter, scene: objs[i].scene })),
        fps,
        { totalFrames: durationInFrames },
      );
      return (Array.isArray(list) ? list : []).filter((c) => c && typeof c.file === "string" && c.file && Number.isFinite(c.frame) && c.frame < durationInFrames);
    } catch (e) {
      console.error("soundCues failed — no policy cues this render:", (e as Error).message);
      return [];
    }
  }, [beats, objs, fps, durationInFrames]);

  const sfxGain = Math.pow(10, (sfxGainDb ?? 0) / 20);
  const op = at(track.op, frame);
  const cx = at(track.x, frame);
  const cy = at(track.y, frame);
  const cz = at(track.z, frame);

  // motion blur ∝ camera speed, along the direction of travel (SVG directional gaussian);
  // off entirely while the camera holds, so holds cost nothing extra
  const vx = Math.abs(at(track.vx, frame));
  const vy = Math.abs(at(track.vy, frame));
  const vz = Math.abs(at(track.vz, frame)) * 900;
  const sx = Math.min(11, 0.09 * vx + 0.04 * vz);
  const sy = Math.min(11, 0.09 * vy + 0.04 * vz);
  const blur = op > 0 && Math.max(sx, sy) >= 0.7;

  const fs = at(face.s, frame);
  const fox = at(face.ox, frame);
  const foy = at(face.oy, frame);
  const faceMoved = Math.abs(fs - 1) > 1e-4 || Math.abs(fox) > 0.05 || Math.abs(foy) > 0.05;

  return (
    <AccentProvider value={resolveAccent(accent)}>
      <AbsoluteFill style={{ background: T.bg, overflow: "hidden" }}>
        {/* him — the floor of the world */}
        <AbsoluteFill
          style={
            faceMoved
              ? { transformOrigin: `${FACE.x}px ${FACE.y}px`, transform: `translate(${fox.toFixed(2)}px, ${foy.toFixed(2)}px) scale(${fs.toFixed(4)})` }
              : undefined
          }
        >
          {videoSrc ? (
            <OffthreadVideo src={asset(videoSrc)} volume={voiceBoost ?? 1} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <AbsoluteFill style={{ background: `linear-gradient(170deg, ${T.bg2}, ${T.bg})` }} />
          )}
        </AbsoluteFill>

        {tp ? (
          <Sequence from={0} durationInFrames={introEnd} layout="none">
            <TitleOverlay text={tp.text} kicker={tp.kicker} emphasis={tp.emphasis} brand={tp.brand} words={words} durF={introEnd} />
          </Sequence>
        ) : null}

        {/* while graphics hold, the whole plate dims a touch (the "focus" dim) — it reads as
            depth, keeps every kind legible, and lifts the moment the world releases to him.
            Its own layer, outside the motion blur (blurring a flat fill is wasted work). */}
        {op > 0 && objs.length ? <AbsoluteFill style={{ background: DIM, opacity: op }} /> : null}

        {/* the world, seen through the camera */}
        {op > 0 && objs.length ? (
          <AbsoluteFill style={{ opacity: op, overflow: "hidden", filter: blur ? `url(#${MB_ID})` : undefined }}>
            {blur ? (
              <svg width={0} height={0} style={{ position: "absolute" }}>
                <filter id={MB_ID} x="-5%" y="-5%" width="110%" height="110%" colorInterpolationFilters="sRGB">
                  <feGaussianBlur stdDeviation={`${sx.toFixed(2)} ${sy.toFixed(2)}`} />
                </filter>
              </svg>
            ) : null}
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: 0,
                height: 0,
                transformOrigin: "0 0",
                transform: `translate(${(ANCHOR.x - cx * cz).toFixed(2)}px, ${(ANCHOR.y - cy * cz).toFixed(2)}px) scale(${cz.toFixed(5)})`,
              }}
            >
              <SceneModeCtx.Provider value="object">
                {objs.map((o, i) => {
                  const b = beats[i];
                  // mounted when the camera starts travelling to it, so it's already arriving
                  // mid-move (never an empty frame between objects)
                  const mount = o.from - LEAD;
                  const dur = Math.max(1, Math.min(durationInFrames + 1, b.end) - mount);
                  return (
                    <React.Fragment key={i}>
                      {i > 0 ? <Trail objs={objs} i={i} /> : null}
                      <Sequence from={mount} durationInFrames={dur} layout="none">
                        <ObjectShell o={o} b={b}>
                          <SceneBoundary kind={o.scene.kind}>
                            <SceneBody s={spans[i]} />
                          </SceneBoundary>
                        </ObjectShell>
                      </Sequence>
                    </React.Fragment>
                  );
                })}
              </SceneModeCtx.Provider>
            </div>
          </AbsoluteFill>
        ) : null}

        {/* audio */}
        {music ? <Audio src={asset(music)} volume={musicVolume ?? 0.32} loop /> : null}
        {cues.length
          ? cues.map((c, i) => (
              <Sequence key={`cue${i}`} from={Math.max(0, Math.round(c.frame))} layout="none">
                <Audio src={asset(c.file)} volume={Math.min(1, c.volume * sfxGain)} trimBefore={c.trimBefore ? Math.round(c.trimBefore) : undefined} />
              </Sequence>
            ))
          : (sfx ?? []).map((s, i) => (
              <Sequence key={`sfx${i}`} from={f(s.atMs)} durationInFrames={Math.round(1.6 * fps)} layout="none">
                <Audio src={asset(s.file)} volume={Math.min(1, (s.volume ?? 0.16) * sfxGain)} trimBefore={f(s.trimBeforeMs ?? 0)} />
              </Sequence>
            ))}

        <Caption2 words={words} timeMs={(frame / fps) * 1000} />
      </AbsoluteFill>
    </AccentProvider>
  );
};
