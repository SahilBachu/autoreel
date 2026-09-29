// SOUND POLICY — which subtle sound effects a reel gets, and exactly when.
//
// The renderer (world/WorldReel.tsx) knows when each object arrives and leaves; this module
// turns that into a short list of cues. Keeping the policy here, separate from the renderer,
// means the sound design can be tuned without touching motion code.
//
// Contract (the renderer depends on this shape):
//   objs  — the world objects in order: their scene kind and the frames they're on screen
//   fps   — composition fps
//   returns cues: a public/ path, the frame to start on, and a volume (0-1)

export type SoundObject = { kind: string; from: number; to: number };
export type SoundCue = { file: string; frame: number; volume: number; trimBefore?: number };

export function soundCues(_objs: SoundObject[], _fps: number, _opts: { totalFrames?: number } = {}): SoundCue[] {
  return []; // implemented by the sound pass
}
