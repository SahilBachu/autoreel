import { spawn } from "node:child_process";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { config } from "../config.js";
import { transcribe } from "../lib/whisper.js";
import { alignCaptions } from "../lib/align.js";
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

// pick a music bed + an SFX file from the handpicked audio library (public/audio-manifest.json)
async function pickAudio(studio: string) {
  try {
    const man = JSON.parse(await readFile(resolve(studio, "public/audio-manifest.json"), "utf8"));
    const music = man.music?.[0]?.file as string | undefined;
    const whoosh = (man.sfx?.find((s: any) => s.tags?.includes("transition")) ?? man.sfx?.[0])?.file as string | undefined;
    return { music, whoosh };
  } catch {
    return { music: undefined, whoosh: undefined };
  }
}

// clip -> whisper -> aligned captions (script spelling) -> director cutaways -> audio -> mp4
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

  // 1. transcribe (timing) then align to the script (spelling)
  const wav = resolve(studio, "public/clips", `${id}.wav`);
  await run("npx", ["remotion", "ffmpeg", "-i", resolve(studio, "public", clipRel), "-ar", "16000", "-ac", "1", "-y", wav], studio);
  const words = await transcribe(wav);
  const captions = alignCaptions(opts.script, words);

  // 2. director plans cutaways (timed to the words)
  const cutaways = await planCutaways({ topic: opts.topic, words: captions, editNote: opts.editNote });

  // 3. audio: whoosh on each cutaway start + a music bed
  const { music, whoosh } = await pickAudio(studio);
  const sfx = whoosh ? cutaways.map((c) => ({ file: whoosh, atMs: c.startMs })) : [];

  // 4. props + render
  const propsPath = resolve(studio, "out", `${id}.props.json`);
  await writeFile(propsPath, JSON.stringify({ videoSrc: clipRel, captions, cutaways, music, sfx, voiceBoost: 2.8 }));
  const mp4 = resolve(studio, "out", `${id}.mp4`);
  await run("npx", ["remotion", "render", "AutoReel", mp4, `--props=${propsPath}`], studio);
  return mp4;
}
