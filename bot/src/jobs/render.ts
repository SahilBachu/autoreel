import { spawn } from "node:child_process";
import { copyFile, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { config } from "../config.js";
import { transcribe } from "../lib/whisper.js";
import { planCutaways } from "../lib/scenePlan.js";

function run(cmd: string, args: string[], cwd: string): Promise<void> {
  return new Promise((res, rej) => {
    const p = spawn(cmd, args, { cwd, shell: process.platform === "win32" });
    let err = "";
    p.stderr.on("data", (d) => (err += d));
    p.on("error", rej);
    p.on("close", (code) => (code === 0 ? res() : rej(new Error(`${cmd} exited ${code}: ${err.slice(-400)}`))));
  });
}

// Full pipeline: talking-head clip -> whisper -> director -> AutoReel props -> mp4 path.
// Captions come straight from the whisper word timestamps, so they match the audio.
export async function renderReel(opts: {
  clipPath: string;
  script: string;
  topic: string;
  editNote?: string;
}): Promise<string> {
  const studio = config.studioDir;
  const id = `reel-${Date.now()}`;
  const clipRel = `clips/${id}.mp4`;

  await mkdir(resolve(studio, "public/clips"), { recursive: true });
  await mkdir(resolve(studio, "out"), { recursive: true });
  await copyFile(opts.clipPath, resolve(studio, "public", clipRel));

  // 1. extract audio + transcribe (word-level)
  const wav = resolve(studio, "public/clips", `${id}.wav`);
  await run("npx", ["remotion", "ffmpeg", "-i", resolve(studio, "public", clipRel), "-ar", "16000", "-ac", "1", "-y", wav], studio);
  const words = await transcribe(wav);

  // 2. director plans the cutaways (timed to the words)
  const cutaways = await planCutaways({ topic: opts.topic, words, editNote: opts.editNote });

  // 3. write props + render
  const propsPath = resolve(studio, "out", `${id}.props.json`);
  await writeFile(propsPath, JSON.stringify({ videoSrc: clipRel, captions: words, cutaways }));
  const mp4 = resolve(studio, "out", `${id}.mp4`);
  await run("npx", ["remotion", "render", "AutoReel", mp4, `--props=${propsPath}`], studio);
  return mp4;
}
