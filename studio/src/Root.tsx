import "./index.css";
import "./fonts";
import "./nick/fonts";
import "./reel_cursor/fonts";
import { Composition, type CalculateMetadataFunction } from "remotion";
import { Reel } from "./Reel";
import { NickReel, NICK_TOTAL } from "./nick/NickReel";
import { CursorReel, CURSOR_TOTAL } from "./reel_cursor/CursorReel";
import { AutoReel, type AutoReelData } from "./auto/AutoReel";
import { Showcase, SHOWCASE_FRAMES } from "./showcase/Showcase";
import { Thumbnail } from "./auto/Thumbnail";
import { Dispatch, SLIDE_W, SLIDE_H, type DispatchProps } from "./carousel/Dispatch";
import { dispatchSample } from "./carousel/sample";
import { DuoExplainer, DUO_FRAMES } from "./explainer/duo/Duo";
import { GENERATED_EXPLAINERS } from "./explainer/gen";
import { ExplainerCover, type CoverProps } from "./explainer/Cover";
import { WorldReel } from "./world/WorldReel";
import { HereticWorld, type HereticWorldData } from "./world/heretic/HereticWorld";
import { mockReel } from "./data/mockReel";
import { totalFrames } from "./timing";
import { WIDTH, HEIGHT, FPS } from "./style/tokens";
import type { ReelData } from "./types";

const calculateMetadata: CalculateMetadataFunction<ReelData> = ({ props }) => {
  return { durationInFrames: totalFrames(props.captions) };
};

// both production renderers take the SAME props (the director's plan) and run for the
// length of the transcript + 18 frames
const autoMeta = ({ props }: { props: AutoReelData }) => {
  const last = props.captions.length ? props.captions[props.captions.length - 1].endMs : 9000;
  return { durationInFrames: Math.ceil((last / 1000) * FPS) + 18 };
};
const autoDefaults = { videoSrc: "", captions: [], scenes: [] } as AutoReelData;

export const RemotionRoot: React.FC = () => {
  return (
    <>
    {/* style A: full-screen scene covers over the talking head */}
    <Composition
      id="AutoReel"
      component={AutoReel}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
      durationInFrames={300}
      defaultProps={autoDefaults}
      calculateMetadata={autoMeta}
    />
    {/* style B — the default: the same plan as objects in one world, a camera travelling
        between them (world/WorldReel.tsx; motion v3: top-centre band, long holds, hook card,
        face punch-ins, motion blur) */}
    <Composition
      id="WorldReel"
      component={WorldReel}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
      durationInFrames={300}
      defaultProps={autoDefaults}
      calculateMetadata={autoMeta}
    />
    {/* the cover image: a frame of him + the hook's title (bot renders it as a still) */}
    <Composition
      id="Thumbnail"
      component={Thumbnail}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
      durationInFrames={1}
      defaultProps={autoDefaults}
    />
    {/* faceless explainer series ("how it actually works"): one composition per video for now */}
    <Composition id="ExplainerDuo" component={DuoExplainer} fps={30} width={1080} height={1920} durationInFrames={DUO_FRAMES} />
    {/* the nightly ones (bot/src/jobs/explainer.ts writes src/explainer/gen/<id>/Video.tsx + the registry) */}
    {GENERATED_EXPLAINERS.map((g) => (
      <Composition key={g.id} id={`Explainer-${g.id}`} component={g.component} fps={30} width={1080} height={1920} durationInFrames={g.frames} />
    ))}
    {/* the series cover (title + key frame), rendered as a still for cover_url */}
    <Composition
      id="ExplainerCover"
      component={ExplainerCover}
      fps={30}
      width={1080}
      height={1920}
      durationInFrames={1}
      defaultProps={{ title: "Why the iPhone Duo is *already cracking*", image: "explainer/duo/cover-frame.png" } as CoverProps}
    />
    {/* news carousel: the whole carousel as ONE wide still (slides x 1080 by 1350), sliced into
        slides by bot/src/lib/carousel.ts. Its own design system: carousel/Dispatch.tsx */}
    <Composition
      id="Dispatch"
      component={Dispatch}
      fps={FPS}
      width={SLIDE_W * dispatchSample.slides.length}
      height={SLIDE_H}
      durationInFrames={1}
      defaultProps={dispatchSample}
      calculateMetadata={({ props }: { props: DispatchProps }) => ({ width: SLIDE_W * Math.max(1, props.slides.length) })}
    />
    {/* reference: the hand-built Heretic world the camera grammar came from. not used by the bot. */}
    <Composition
      id="WorldHeretic"
      component={HereticWorld}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
      durationInFrames={300}
      defaultProps={{ videoSrc: "", captions: [] } as HereticWorldData}
      calculateMetadata={({ props }: { props: HereticWorldData }) => {
        const last = props.captions.length ? props.captions[props.captions.length - 1].endMs : 9000;
        return { durationInFrames: Math.ceil((last / 1000) * FPS) + 18 };
      }}
    />
    <Composition
      id="CursorReel"
      component={CursorReel}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
      durationInFrames={CURSOR_TOTAL}
    />
    <Composition
      id="NickReel"
      component={NickReel}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
      durationInFrames={NICK_TOTAL}
    />
    <Composition
      id="Reel"
      component={Reel}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
      durationInFrames={totalFrames(mockReel.captions)}
      defaultProps={mockReel}
      calculateMetadata={calculateMetadata}
    />
    <Composition
      id="Showcase"
      component={Showcase}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
      durationInFrames={SHOWCASE_FRAMES}
    />
    </>
  );
};
