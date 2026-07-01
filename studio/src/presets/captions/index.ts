import type { Word, CaptionStyle } from "../../types";
import { CleanCaps } from "./CleanCaps";
import { PunchCaps } from "./PunchCaps";

export type CaptionPreset = React.FC<{ words: Word[]; timeMs: number }>;

// The engine picks a caption preset per video by name.
export const captionPresets: Record<CaptionStyle, CaptionPreset> = {
  clean: CleanCaps,
  punch: PunchCaps,
};
