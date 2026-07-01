import { spawn } from "node:child_process";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
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

// how much silence a sound file has at the very start (ms) — so SFX fire on the beat,
// not into dead air. Uses ffmpeg silencedetect.
function leadSilenceMs(studio: string, relFile: string): Promise<number> {
  return new Promise((res) => {
    const p = spawn("npx", ["remotion", "ffmpeg", "-i", resolve(studio, "public", relFile), "-af", "silencedetect=n=-35dB:d=0.1", "-f", "null", "-"], { cwd: studio, shell: process.platform === "win32" });
    let out = "";
    p.stderr.on("data", (d) => (out += d));
    p.on("close", () => {
      const m = out.match(/silence_start: 0[\s\S]*?silence_end: ([\d.]+)/);
      res(m ? Math.round(parseFloat(m[1]) * 1000) : 0);
    });
    p.on("error", () => res(0));
  });
}

// pick up to n items, evenly spread across the list (so an SFX isn't spammed on every cut)
function pickSpread<T>(arr: T[], n: number): T[] {
  if (arr.length <= n) return arr;
  const out: T[] = [];
  for (let i = 0; i < n; i++) out.push(arr[Math.round((i * (arr.length - 1)) / (n - 1))]);
  return out;
}

// Music bed = a RANDOM lofi track from public/music (any *.mp3 dropped in there is picked up
// automatically — no manifest edit needed). SFX (the hard-cut whoosh) still comes from the manifest.
async function pickAudio(studio: string) {
  let music: string | undefined;
  try {
    const files = (await readdir(resolve(studio, "public/music"))).filter((f) => f.toLowerCase().endsWith(".mp3"));
    if (files.length) music = `music/${files[Math.floor(Math.random() * files.length)]}`;
  } catch {
    /* no music dir yet */
  }
  let whoosh: string | undefined;
  try {
    const man = JSON.parse(await readFile(resolve(studio, "public/audio-manifest.json"), "utf8"));
    whoosh = (man.sfx?.find((s: any) => s.tags?.includes("transition")) ?? man.sfx?.[0])?.file as string | undefined;
  } catch {
    /* no manifest — skip sfx */
  }
  return { music, whoosh };
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

  // 1. transcribe (timing) from the original clip's audio, then align to the script (spelling)
  const wav = resolve(studio, "public/clips", `${id}.wav`);
  await run("npx", ["remotion", "ffmpeg", "-i", opts.clipPath, "-ar", "16000", "-ac", "1", "-y", wav], studio);
  const words = await transcribe(wav);
  const captions = alignCaptions(opts.script, words);

  // Normalize the clip to EXACTLY 1080x1920 (center cover-crop) up front. Whatever it was
  // recorded at — odd resolutions from weird apps, square, landscape — it now fills the 9:16
  // frame with correct proportions and can NEVER stretch the face (Remotion then shows it 1:1).
  // scale ...:increase makes both dims >= target while preserving aspect; crop trims the excess.
  await run("npx", ["remotion", "ffmpeg", "-i", opts.clipPath,
    "-vf", "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920",
    "-c:a", "aac", "-b:a", "128k", "-pix_fmt", "yuv420p", "-y", resolve(studio, "public", clipRel)], studio);

  // 2. director plans cutaways (timed to the words)
  const cutaways = await planCutaways({ topic: opts.topic, words: captions, editNote: opts.editNote });

  // 3. audio: whoosh on each cutaway start (skipping its lead silence) + a music bed
  const { music, whoosh } = await pickAudio(studio);
  const trimBeforeMs = whoosh ? await leadSilenceMs(studio, whoosh) : 0;
  // each sound effect max 2x per video, spread across the cutaways
  const sfx = whoosh ? pickSpread(cutaways, 2).map((c) => ({ file: whoosh, atMs: c.startMs, trimBeforeMs, volume: 0.9 })) : [];

  // 4. props + render
  const propsPath = resolve(studio, "out", `${id}.props.json`);
  await writeFile(propsPath, JSON.stringify({ videoSrc: clipRel, captions, cutaways, music, sfx, voiceBoost: 2.8 }));
  const mp4 = resolve(studio, "out", `${id}.mp4`);
  await run("npx", ["remotion", "render", "AutoReel", mp4, `--props=${propsPath}`], studio);
  return mp4;
}
