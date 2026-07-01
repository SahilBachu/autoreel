import type { Word } from "./types";
import { msToFrames, scene } from "./style/tokens";

// The reel is exactly the talking-head length (last word end + small tail).
// No intro/outro title cards.
export function totalFrames(captions: Word[]): number {
  const lastEnd = captions.length ? captions[captions.length - 1].endMs : 0;
  return msToFrames(lastEnd) + scene.tailFrames;
}
