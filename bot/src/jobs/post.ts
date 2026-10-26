import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { uploadPublic } from "../lib/upload.js";
import { publishCarousel, publishReel, publishStory } from "../lib/ig.js";
import { uploadReel } from "../lib/supabase.js";
import { config } from "../config.js";

// Progress hooks so the bot can tell the user what's happening during the (slow) publish.
export type PostHooks = {
  onUploaded?: () => void;
  onProcessing?: () => void;
  onPublishing?: () => void;
};

function run(cmd: string, args: string[]): Promise<{ ok: boolean; out: string }> {
  return new Promise((res) => {
    const p = spawn(cmd, args, { cwd: config.studioDir, shell: process.platform === "win32" });
    let out = "";
    p.stdout.on("data", (d) => (out += d));
    p.stderr.on("data", (d) => (out += d));
    p.on("error", () => res({ ok: false, out }));
    p.on("close", (code) => res({ ok: code === 0, out }));
  });
}

async function videoSeconds(path: string): Promise<number> {
  const r = await run("npx", ["remotion", "ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path]);
  const n = Number(r.out.trim().split(/\s+/).pop());
  return Number.isFinite(n) ? n : Infinity;
}

// Upload the mp4 to a public URL (Supabase, or tmpfiles fallback) then publish to Instagram.
// Returns the permalink for the user and the media id for the site row / DM autoresponder.
// Stories are OFF by default: sahil wants the tappable "share → add to story" card, which the
// API can't create (it can only upload raw media), so he adds it himself. opts.story re-enables.
export async function postReel(
  mp4Path: string,
  caption: string,
  hooks: PostHooks = {},
  thumbPath?: string,
  opts: { story?: boolean; aiGenerated?: boolean } = {},
): Promise<{ permalink: string; mediaId: string; story?: string }> {
  const { url: publicUrl, via } = await uploadPublic(mp4Path);
  console.log(`reel uploaded via ${via}: ${publicUrl}`);
  hooks.onUploaded?.();
  // the generated cover — a failed upload just means Instagram picks its own frame
  let coverUrl: string | undefined;
  if (thumbPath) {
    coverUrl = await uploadReel(thumbPath, `cover-${Date.now()}.jpg`, "image/jpeg").catch((e) => {
      console.error("cover upload failed, posting without it:", e?.message ?? e);
      return undefined;
    });
  }
  const r = await publishReel(publicUrl, caption, hooks, coverUrl, { aiGenerated: opts.aiGenerated });
  let story: string | undefined;
  if (opts.story === true) story = await storyFor(mp4Path, publicUrl);
  return { ...r, story };
}

// best effort: a story that fails never makes the post look failed
async function storyFor(mp4Path: string, publicUrl: string): Promise<string | undefined> {
  try {
    const secs = await videoSeconds(mp4Path);
    if (secs > 59.5) {
      console.log(`story skipped: the reel is ${secs.toFixed(1)} s (stories take ≤60 s)`);
      return undefined;
    }
    const id = await publishStory({ videoUrl: publicUrl });
    console.log(`story posted (${id})`);
    return id;
  } catch (e: any) {
    console.error("story failed:", e?.message ?? e);
    return undefined;
  }
}

/**
 * Publish a carousel from local JPEG slides (1080×1350): upload each, publish, then put the
 * cover on the story (padded to 9:16 on the paper colour so it doesn't get letterboxed black).
 */
export async function postCarousel(slides: string[], caption: string, hooks: PostHooks = {}, opts: { storyBg?: string; story?: boolean } = {}): Promise<{ permalink: string; mediaId: string; story?: string }> {
  const stamp = Date.now();
  const urls: string[] = [];
  for (const [i, s] of slides.entries()) urls.push(await uploadReel(s, `carousel-${stamp}-${String(i + 1).padStart(2, "0")}.jpg`, "image/jpeg"));
  hooks.onUploaded?.();
  const r = await publishCarousel(urls, caption, hooks);
  let story: string | undefined;
  if (opts.story === true) try {
    const storyPath = resolve(config.studioDir, "out", `carousel-${stamp}-story.jpg`);
    // the system ffmpeg (Remotion's bundled build has no pad filter); without it the plain 4:5
    // cover goes up and Instagram letterboxes it
    const padArgs = ["-y", "-i", slides[0], "-vf", `pad=1080:1920:0:285:color=0x${(opts.storyBg ?? "#F1ECE0").replace("#", "")}`, "-q:v", "2", storyPath];
    let pad = await run("ffmpeg", ["-hide_banner", "-loglevel", "error", ...padArgs]);
    if (!pad.ok) pad = await run("npx", ["remotion", "ffmpeg", ...padArgs]);
    const storyUrl = pad.ok ? await uploadReel(storyPath, `carousel-${stamp}-story.jpg`, "image/jpeg") : urls[0];
    story = await publishStory({ imageUrl: storyUrl });
  } catch (e: any) {
    console.error("carousel story failed:", e?.message ?? e);
  }
  return { ...r, story };
}
