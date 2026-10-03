import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { config } from "../config.js";
import { claude } from "./claude.js";

// THE COVER for each reel: a real frame of him (the best of a few, picked by the model so he's
// not caught mid-blink), with the hook's title set over it in one consistent style — the
// studio's Thumbnail composition. Shown in Telegram with the render, then set as the Instagram
// cover (cover_url) when he posts.

function run(args: string[], cwd: string): Promise<boolean> {
  return new Promise((res) => {
    const p = spawn("npx", args, { cwd, shell: process.platform === "win32" });
    p.on("error", () => res(false));
    p.on("close", (code) => res(code === 0));
  });
}

// candidate moments: early (he's on camera with energy during the hook) and the middle of the
// longest stretch with no graphic on screen — so the frame is his face, not a covered one
function candidateTimes(scenes: { startMs: number; endMs: number }[], totalMs: number): number[] {
  const gaps: [number, number][] = [];
  let t = 0;
  for (const s of [...scenes].sort((a, b) => a.startMs - b.startMs)) {
    if (s.startMs - t > 800) gaps.push([t, s.startMs]);
    t = Math.max(t, s.endMs);
  }
  if (totalMs - t > 800) gaps.push([t, totalMs]);
  const longest = gaps.sort((a, b) => b[1] - b[0] - (a[1] - a[0]))[0];
  const picks = [900, 2200];
  if (longest) picks.push(Math.round((longest[0] + longest[1]) / 2));
  return picks.filter((x) => x < totalMs - 200);
}

export async function renderThumbnail(args: {
  id: string;
  clipPath: string; // the original clip (source of the frame)
  propsPath: string; // the reel's render props (title, scenes, accent)
  props: Record<string, unknown>;
  scenes: { startMs: number; endMs: number }[];
  totalMs: number;
}): Promise<string | undefined> {
  const studio = config.studioDir;
  await mkdir(resolve(studio, "public/generated"), { recursive: true });
  const frames: string[] = [];
  for (const [k, ms] of candidateTimes(args.scenes, args.totalMs).entries()) {
    const rel = `generated/thumbsrc-${args.id}-${k}.jpg`;
    const ok = await run(["remotion", "ffmpeg", "-ss", (ms / 1000).toFixed(2), "-i", args.clipPath, "-frames:v", "1", "-q:v", "2", "-y", resolve(studio, "public", rel)], studio);
    if (ok) frames.push(rel);
  }
  if (!frames.length) return undefined;

  let pick = 0;
  if (frames.length > 1) {
    try {
      const answer = await claude(
        `These are candidate frames for an Instagram reel's cover, a talking-head creator: ${frames.map((f, i) => `[${i}] public/${f}`).join("  ")}.
Read each image. Pick the one where his face is best for a thumbnail: eyes open and on camera, an
engaged expression (mid-word is fine, a blink or a smear is not), sharp, well framed. Reply with
ONLY the number.`,
        { tools: ["Read"], cwd: studio, timeoutMs: 3 * 60_000 },
      );
      const n = Number(answer.trim().match(/\d+/)?.[0]);
      if (Number.isInteger(n) && n >= 0 && n < frames.length) pick = n;
    } catch {
      /* first frame is fine */
    }
  }

  const thumbProps = resolve(studio, "out", `${args.id}.thumb.props.json`);
  await writeFile(thumbProps, JSON.stringify({ ...args.props, thumbSrc: frames[pick] }));
  const out = resolve(studio, "out", `${args.id}.thumb.jpg`);
  const ok = await run(["remotion", "still", "Thumbnail", out, `--props=${thumbProps}`, "--frame=0", "--jpeg-quality=92"], studio);
  return ok ? out : undefined;
}
