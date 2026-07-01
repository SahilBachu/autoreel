import "./index.css";
import "./fonts";
import "./nick/fonts";
import "./reel_cursor/fonts";
import { Composition, type CalculateMetadataFunction } from "remotion";
import { Reel } from "./Reel";
import { NickReel, NICK_TOTAL } from "./nick/NickReel";
import { CursorReel, CURSOR_TOTAL } from "./reel_cursor/CursorReel";
import { Showcase, SHOWCASE_FRAMES } from "./showcase/Showcase";
import { mockReel } from "./data/mockReel";
import { totalFrames } from "./timing";
import { WIDTH, HEIGHT, FPS } from "./style/tokens";
import type { ReelData } from "./types";

const calculateMetadata: CalculateMetadataFunction<ReelData> = ({ props }) => {
  return { durationInFrames: totalFrames(props.captions) };
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
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
