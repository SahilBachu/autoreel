import { spawn } from "node:child_process";
import { copyFile, mkdir, readdir, rm, stat, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { claude } from "./claude.js";
import { config, REPO_ROOT } from "../config.js";

// HAND-PAINTED SHOTS: short watercolour-cartoon moments made with the vendored
// ClaudeAnimationBase kit in clawd/ (p5.js + p5.brush in headless Chrome). The director plans 1-2
// `painted` scenes ({brief, clawd}): with Clawd, the Claude Code mascot, when the line is about
// Claude doing something, without him otherwise. For each one Opus writes a shot from the kit's
// guide, looks at its own contact sheets, fixes, and the kit renders a square MP4 that plays in a
// card over him (studio ClawdCard). A shot that fails is dropped, never the reel. (`clawd` is the
// older kind name for a Clawd shot and still works.)

const KIT = resolve(REPO_ROOT, "clawd");
const SIZE = 720; // square canvas
const FPS = 12; // hand-drawn "on twos" (the kit's linework already boils at 12): half the frames to render
// The runner has no GPU. Chrome's own software GL (SwiftShader, --soft-gl) measured ~10 s/frame
// there; ANGLE on Mesa's llvmpipe (--gpu-angle=gl-egl) ~2.3 s/frame for a busy 720px shot, so a
// 4 s shot renders in ~2 min. Elsewhere the kit's default (a real GPU) is used.
const GL = process.platform === "linux" ? ["--gpu-angle=gl-egl"] : [];
const TOOLS = ["Read", "Write", "Edit", "Glob", "Grep", "Bash(node shot.mjs:*)"];

type Word = { text: string; startMs: number; endMs: number };

function run(cmd: string, args: string[], cwd: string, timeoutMs: number): Promise<{ ok: boolean; out: string }> {
  return new Promise((res) => {
    const win = process.platform === "win32";
    // its own process group, so a timeout takes the headless Chrome down with it
    const p = spawn(cmd, args, { cwd, shell: win, detached: !win });
    let out = "";
    const timer = setTimeout(() => {
      try {
        if (!win && p.pid) process.kill(-p.pid, "SIGKILL");
        else p.kill("SIGKILL");
      } catch {
        /* already gone */
      }
    }, timeoutMs);
    p.stdout.on("data", (d) => (out += d));
    p.stderr.on("data", (d) => (out += d));
    p.on("error", (e) => res({ ok: false, out: String(e) }));
    p.on("close", (code) => {
      clearTimeout(timer);
      res({ ok: code === 0, out: out.slice(-1500) });
    });
  });
}

const page = (dur: number) => `<!doctype html>
<html><head><meta charset="utf-8"><title>clawd shot</title>
<style>html,body{margin:0;background:#1b1820}#out{width:${SIZE}px;height:${SIZE}px}.p5Canvas{display:none!important}</style>
<script src="../../node_modules/p5/lib/p5.min.js"></script>
<script src="../../node_modules/p5.brush/dist/p5.brush.js"></script>
</head><body>
<canvas id="out" width="${SIZE}" height="${SIZE}"></canvas>
<input id="scrub" type="range" min="0" max="${dur}" step="0.0417" value="0" hidden><span id="tt" hidden></span>
<script src="config.js"></script>
<script src="../../src/core.js"></script>
<script src="../../src/clawd.js"></script>
<script src="../../src/timeline.js"></script>
<script src="scene.js"></script>
</body></html>
`;

// keep a few days of jobs for debugging, no more
async function pruneJobs() {
  const dir = resolve(KIT, "jobs");
  try {
    for (const name of await readdir(dir)) {
      const st = await stat(resolve(dir, name));
      if (Date.now() - st.mtimeMs > 3 * 86_400_000) await rm(resolve(dir, name), { recursive: true, force: true });
    }
  } catch {
    /* no jobs yet */
  }
}

async function buildOne(s: any, k: number, videoId: string, topic: string, words: Word[]): Promise<any | undefined> {
  const dur = Math.round(Math.max(2.5, Math.min(8, (s.endMs - s.startMs) / 1000 + 0.5)) * 10) / 10;
  const job = `jobs/${videoId}-${k}`;
  const dir = resolve(KIT, job);
  await rm(dir, { recursive: true, force: true });
  await mkdir(resolve(dir, "out"), { recursive: true });
  await writeFile(resolve(dir, "config.js"), `const PROJECT = { duration: ${dur}, bpm: 110, offset: 0, w: ${SIZE}, h: ${SIZE} };\n`);
  await writeFile(resolve(dir, "studio.html"), page(dur));

  const line = words.filter((w) => w.endMs > s.startMs - 300 && w.startMs < s.endMs).map((w) => w.text).join(" ");
  const withClawd = s.kind === "clawd" || s.clawd === true || s.clawd === "true";
  const cast = withClawd
    ? "Clawd is the star of this shot (here Clawd IS Claude / the AI doing the thing)."
    : 'NO Clawd in this shot. Animate the objects, or simple characters you design in the same medium (see "shots without Clawd" in REEL.md).';
  const prompt = `You are animating ONE short hand-painted shot for an Instagram reel (cwd = the kit, clawd/).

Read these first, in order: REEL.md (what a reel shot is, and the speed rules: they override the
guide), ANIMATION_GUIDE.md (the kit's rules, principles and full API), docs/emotions.jpg and
docs/views.jpg (the model sheets). Open src/clawd.js / src/core.js only when you need a detail.

The reel's topic: "${topic}"
While this shot is on screen he says: "${line}"
What the director wants: ${s.brief}
${cast}
Length: ${dur} s. Canvas: ${SIZE}x${SIZE} (W and H are set from config.js).

Write ${job}/scene.js — the ONLY file you create or edit — as an IIFE ending in shots([...]).
Then look at it: \`node shot.mjs ${job} ${GL.join(" ")} --sheet=<5-6 times across the shot> --cols=6 --w=240 --out=out/sheet.jpg\`
and \`node shot.mjs ${job} ${GL.join(" ")} --strip=0:0.6 --cols=8 --w=160 --out=out/strip.jpg\`, then Read the images.
Fix what's wrong (does the event read in the first ~1.5 s? the subject big and clear, filling the square?
no text? opens with a paint-in, ends on a held alive pose, no fill/brushWipe?) and look again.
Renders here are slow (~2 s a frame), so keep it to two looks, three at most. Reply DONE when the
shot is good.`;

  try {
    await claude(prompt, { tools: TOOLS, cwd: KIT, timeoutMs: 16 * 60_000 });
  } catch (e) {
    // out of time while still polishing: a written shot is usually fine, so render it anyway
    if (!existsSync(resolve(dir, "scene.js"))) throw e;
    console.error(`clawd shot ${k}: ${(e as Error).message}; rendering the scene.js it wrote`);
  } finally {
    // a killed session can leave its review renders (and their Chrome) running
    if (process.platform !== "win32") await run("pkill", ["-TERM", "-f", `shot.mjs ${job} `], KIT, 10_000);
  }
  if (!existsSync(resolve(dir, "scene.js"))) throw new Error("no scene.js written");

  const r = await run("node", ["shot.mjs", job, ...GL, "--clip", `--fps=${FPS}`, "--out=out/clip.mp4"], KIT, 12 * 60_000);
  const clip = resolve(dir, "out/clip.mp4");
  if (!r.ok || !existsSync(clip) || (await stat(clip)).size < 10_000) throw new Error(`render failed: ${r.out.slice(-300)}`);
  const rel = `generated/clawd-${videoId}-${k}.mp4`;
  await copyFile(clip, resolve(config.studioDir, "public", rel));
  return { ...s, src: rel, durMs: dur * 1000 };
}

const isPainted = (s: any) => s.kind === "painted" || s.kind === "clawd";

/** Builds every hand-painted scene in the plan (in parallel). A shot that fails is dropped. */
export async function buildPaintedScenes(scenes: any[], videoId: string, opts: { topic: string; words: Word[] }): Promise<any[]> {
  const shots = scenes.filter((s) => isPainted(s) && typeof s.brief === "string" && s.brief.trim());
  if (!shots.length) return scenes.filter((s) => !isPainted(s));
  await pruneJobs();
  if (!existsSync(resolve(KIT, "node_modules/p5.brush"))) {
    const r = await run("npm", ["ci", "--silent"], KIT, 5 * 60_000);
    if (!r.ok) {
      console.error("painted: npm ci failed, dropping painted scenes:", r.out);
      return scenes.filter((s) => !isPainted(s));
    }
  }
  await mkdir(resolve(config.studioDir, "public/generated"), { recursive: true });
  const built = await Promise.all(
    shots.map((s, k) =>
      buildOne(s, k, videoId, opts.topic, opts.words).catch((e) => {
        console.error(`painted shot ${k} dropped:`, (e as Error).message);
        return undefined;
      }),
    ),
  );
  const byScene = new Map(shots.map((s, k) => [s, built[k]]));
  return scenes.flatMap((s) => (!isPainted(s) ? [s] : byScene.get(s) ? [byScene.get(s)] : []));
}
