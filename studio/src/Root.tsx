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
    {/* style B: the same plan as objects in one world, a camera travelling between them */}
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
