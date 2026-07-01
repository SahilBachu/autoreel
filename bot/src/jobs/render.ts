import { transcribe, type Word } from "../lib/whisper.js";

// Full pipeline: talking-head clip -> whisper -> scene plan -> bespoke components ->
// ReelData -> remotion render -> mp4 path. See BUILD.md "Render pipeline details".
//
// This is the heart of the Robot and where quality lives. Steps are stubbed with the
// exact plan; implement + test on the runner (needs faster-whisper + remotion + Playwright).
export async function renderReel(opts: {
  clipPath: string; // the user's talking-head mp4 (local path from the Bot API server)
  script: string;
  topic: string;
  editNote?: string; // set when the user pressed [Edit] and described a change
}): Promise<string> {
  // 1. extract audio + transcribe (word-level) — captions MUST match this, not even-spacing
  //    `npx remotion ffmpeg -i <clip> -ar 16000 -ac 1 -y <wav>` (run in studio/)
  const wav = opts.clipPath.replace(/\.\w+$/, ".wav");
  const words: Word[] = await transcribe(wav); // TODO: run the ffmpeg extract before this

  // 2. director: transcript + topic (+ editNote) -> ordered scene plan with frame ranges
  //    tied to word timestamps (cutaway on the word it's mentioned). See lib/scenePlan.
  //    const plan = await planScenes({ words, topic: opts.topic, editNote: opts.editNote });

  // 3. per scene: reuse a matching component OR ask `claude -p` to WRITE a new polished
  //    Remotion component (studio/src/generated/<id>/). Fetch REAL assets via Playwright
  //    (logos, repo/site screenshots) into studio/public/generated/<id>/.

  // 4. audio: read studio/public/audio-manifest.json; SFX at cut frames; music bed ducked.

  // 5. build ReelData (user's clip in the face slots via videoSrc; captions = `words`) and
  //    render:  cd studio && npx remotion render <Comp> out/<id>.mp4 --props=<json>
  //    then validate H.264/AAC with `npx remotion ffmpeg -i out/<id>.mp4`.

  void words;
  throw new Error("renderReel: implement steps 2-5 on the runner (see BUILD.md).");
}
