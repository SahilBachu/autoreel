import { spawn } from "node:child_process";
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { config } from "../config.js";
import { transcribe, type Word } from "../lib/whisper.js";
import { alignCaptions } from "../lib/align.js";
import { planCutaways, type AudioLib } from "../lib/scenePlan.js";
import { buildCustomScenes } from "../lib/studio.js";
import { screenshot } from "../lib/shot.js";

const exists = (p: string) => stat(p).then(() => true, () => false);

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
      // only a silence run starting AT (near) ZERO counts as lead silence — a quiet patch
      // at 0.5s must not be mistaken for it (the old prefix-match regex did exactly that)
      const m = out.match(/silence_start:\s*(-?[\d.]+)[\s\S]*?silence_end:\s*([\d.]+)/);
      res(m && parseFloat(m[1]) <= 0.05 ? Math.round(parseFloat(m[2]) * 1000) : 0);
    });
    p.on("error", () => res(0));
  });
}

// pick scene start times to place a whoosh on, spaced >= gapMs apart, max n, skipping the
// very first beat (no whoosh right on the hook).
function spacedStarts(scenes: { startMs: number }[], gapMs: number, n: number): number[] {
  const out: number[] = [];
  for (const s of scenes) {
    if (out.length >= n) break;
    if (s.startMs < 1500) continue;
    if (!out.length || s.startMs - out[out.length - 1] >= gapMs) out.push(s.startMs);
  }
  return out;
}

// The handpicked audio library the DIRECTOR chooses from: manifest entries + any *.mp3
// dropped into public/music (picked up automatically, no manifest edit needed).
async function audioLib(studio: string): Promise<AudioLib> {
  let man: any = {};
  try {
    man = JSON.parse(await readFile(resolve(studio, "public/audio-manifest.json"), "utf8"));
  } catch {
    /* no manifest — music dir only */
  }
  const music: AudioLib["music"] = [...(man.music ?? [])];
  try {
    const files = (await readdir(resolve(studio, "public/music"))).filter((f) => f.toLowerCase().endsWith(".mp3"));
    for (const f of files) if (!music.some((m) => m.file === `music/${f}`)) music.push({ file: `music/${f}` });
  } catch {
    /* no music dir yet */
  }
  return { music, sfx: man.sfx ?? [] };
}

// clip -> whisper -> aligned captions (script spelling) -> director cutaways -> audio -> mp4
export async function renderReel(opts: {
  clipPath: string;
  script: string;
  topic: string;
  editNote?: string;
}): Promise<{ mp4: string; planSummary: string }> {
  const studio = config.studioDir;
  const id = `reel-${Date.now()}`;

  // Whisper + the ffmpeg normalize are the slow steps, and the CLIP doesn'T change on
  // Redo/Edit — cache both keyed by the source clip path, so only the first render pays.
  const key = createHash("sha1").update(opts.clipPath).digest("hex").slice(0, 10);
  const clipRel = `clips/clip-${key}.mp4`;
  const wav = resolve(studio, "public/clips", `clip-${key}.wav`);
  const wordsPath = resolve(studio, "public/clips", `clip-${key}.words.json`);

  await mkdir(resolve(studio, "public/clips"), { recursive: true });
  await mkdir(resolve(studio, "out"), { recursive: true });

  // 1. transcribe the clip's actual audio -> captions come STRAIGHT from what was spoken, so
  // they always line up with the audio (aligning a possibly-adlibbed script drifted out of sync).
  let words: Word[];
  if (await exists(wordsPath)) {
    words = JSON.parse(await readFile(wordsPath, "utf8"));
  } else {
    await run("npx", ["remotion", "ffmpeg", "-i", opts.clipPath, "-ar", "16000", "-ac", "1", "-y", wav], studio);
    words = await transcribe(wav);
    await writeFile(wordsPath, JSON.stringify(words));
  }
  const captions = alignCaptions(opts.script, words, { syncFromAudio: true });

  // Normalize the clip to EXACTLY 1080x1920 (center cover-crop) up front. Whatever it was
  // recorded at — odd resolutions from weird apps, square, landscape — it now fills the 9:16
  // frame with correct proportions and can NEVER stretch the face (Remotion then shows it 1:1).
  // scale ...:increase makes both dims >= target while preserving aspect; crop trims the excess.
  if (!(await exists(resolve(studio, "public", clipRel)))) {
    await run("npx", ["remotion", "ffmpeg", "-i", opts.clipPath,
      "-vf", "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920",
      "-c:a", "aac", "-b:a", "128k", "-pix_fmt", "yuv420p", "-y", resolve(studio, "public", clipRel)], studio);
  }

  // 2. director designs a dense sequence of motion-graphic scenes (timed to the words),
  // picks the video's accent + music bed (+ emphasis SFX), and may commission bespoke
  // components (built + typechecked + visually verified by lib/studio.ts; dropped on failure)
  const audio = await audioLib(studio);
  const plan = await planCutaways({ topic: opts.topic, words: captions, editNote: opts.editNote, audio });
  await writeFile(resolve(studio, "out", `${id}.plan.json`), JSON.stringify(plan, null, 2)).catch(() => {});
  const planned = await buildCustomScenes(plan.scenes, id);

  // 2b. resolve any real screenshots (Playwright) for "screenshot" scenes (and optional "logo"
  // art). Failed fetches: drop a screenshot scene, or keep a logo scene without the image.
  await mkdir(resolve(studio, "public/generated"), { recursive: true });
  const scenes: any[] = [];
  let shotN = 0;
  for (const c of planned as any[]) {
    if ((c.kind === "browser" || c.kind === "screenshot" || c.kind === "phone" || c.kind === "ascii") && c.url && !c.src && !c.brand) {
      const rel = `generated/shot-${id}-${shotN++}.png`;
      const ok = await screenshot(c.url, resolve(studio, "public", rel));
      if (ok) scenes.push({ ...c, src: rel });
      else if (c.kind === "phone") scenes.push(c); // phone renders a placeholder screen
      // browser/ascii scenes whose fetch failed are dropped (head stays on screen)
    } else {
      scenes.push(c);
    }
  }

  // 3. audio: the director picked the bed + emphasis moments from the manifest; mechanical
  // transition whooshes on scene cuts stay as the base layer (quiet, spaced >=5s, max 3).
  const music = plan.music
    ?? (audio.music.length ? audio.music[Math.floor(Math.random() * audio.music.length)].file : undefined);
  const whoosh = (audio.sfx.find((s) => s.tags?.includes("transition")) ?? audio.sfx[0])?.file;
  const lead = new Map<string, number>();
  const leadOf = async (f: string) => {
    if (!lead.has(f)) lead.set(f, await leadSilenceMs(studio, f));
    return lead.get(f)!;
  };
  const sfx: { file: string; atMs: number; trimBeforeMs: number; volume: number }[] = [];
  if (whoosh) {
    const t = await leadOf(whoosh);
    for (const atMs of spacedStarts(scenes, 5000, 3)) sfx.push({ file: whoosh, atMs, trimBeforeMs: t, volume: 0.16 });
  }
  for (const e of plan.sfx ?? []) {
    if (sfx.some((x) => Math.abs(x.atMs - e.atMs) < 800)) continue; // don't stack on a whoosh
    sfx.push({ file: e.file, atMs: e.atMs, trimBeforeMs: await leadOf(e.file), volume: 0.2 });
  }

  // 4. props + render — the director chooses the accent to fit the topic; random fallback
  const ACCENTS = ["blue", "cyan", "green", "orange", "red", "pink", "violet"];
  const accent = plan.accent && ACCENTS.includes(plan.accent) ? plan.accent : ACCENTS[Math.floor(Math.random() * ACCENTS.length)];
  const propsPath = resolve(studio, "out", `${id}.props.json`);
  await writeFile(propsPath, JSON.stringify({ videoSrc: clipRel, captions, scenes, accent, music, sfx, voiceBoost: 2.8 }));
  const mp4 = resolve(studio, "out", `${id}.mp4`);
  await run("npx", ["remotion", "render", "AutoReel", mp4, `--props=${propsPath}`], studio);

  // compact description of what was rendered — stored in state so a Redo can log exactly
  // which plan got rejected (the learning pass needs to see WHAT he didn't like)
  const planSummary = [
    scenes.map((s: any) => `${s.kind} ${(s.startMs / 1000).toFixed(1)}-${(s.endMs / 1000).toFixed(1)}s`).join(", "),
    `accent=${accent}`,
    music ? `music=${music}` : "",
  ].filter(Boolean).join(" | ");
  return { mp4, planSummary };
}
