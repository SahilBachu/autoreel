import type { BackgroundStyle } from "../../types";
import { Spotlight } from "./Spotlight";
import { Solid } from "./Solid";

export type BackgroundPreset = React.FC;

export const backgroundPresets: Record<BackgroundStyle, BackgroundPreset> = {
  spotlight: Spotlight,
  solid: Solid,
};
