import { spawn } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import { basename } from "node:path";
import { config } from "../config.js";
import { uploadReel } from "./supabase.js";

// Put the reel somewhere PUBLIC so Instagram can pull it. Supabase is the real home (proven
// with IG); tmpfiles.org is a last resort — Instagram often can't fetch its URLs, and when it
// can't, the failure only shows up minutes later as a bare "container ERROR". So: try Supabase
// properly (with retries and a realistic timeout), and PROVE whatever URL we end up with is
// actually downloadable as video before Instagram ever sees it.
export async function uploadPublic(sourcePath: string): Promise<{ url: string; via: string }> {
  const name = `reel-${Date.now()}.mp4`;
  const localPath = await fitForUpload(sourcePath);
  let lastErr = "";
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const url = await uploadReel(localPath, name);
      await assertFetchable(url);
      return { url, via: "supabase" };
    } catch (e: any) {
      lastErr = String(e?.message ?? e);
      console.error(`supabase upload attempt ${attempt} failed:`, lastErr);
      if (/413|too large|EntityTooLarge/i.test(lastErr)) break; // retrying the same bytes can't help
      if (attempt < 3) await new Promise((r) => setTimeout(r, 5000 * attempt));
    }
  }
  console.error("supabase failed 3 times, falling back to tmpfiles");
  const url = await uploadTmpfiles(localPath);
  try {
    await assertFetchable(url);
  } catch (e: any) {
    throw new Error(`couldn't get the reel to a public URL Instagram can read. supabase: ${lastErr.slice(0, 120)} · tmpfiles: ${e.message}`);
  }
  return { url, via: "tmpfiles" };
}

// Supabase's free plan rejects any object over 50MB (413 EntityTooLarge), and a camera-heavy
// world render can come out at 55MB+. Instagram re-encodes every upload anyway, so a reel over
// the line is re-encoded to a sensible delivery bitrate first — ~6 Mbps is a 30s reel at
// ~23MB, visually identical on a phone. Steps down if a long reel still doesn't fit.
const UPLOAD_LIMIT = 45 * 1024 * 1024; // headroom under Supabase's 50MB

async function fitForUpload(path: string): Promise<string> {
  const size = (await stat(path)).size;
  if (size <= UPLOAD_LIMIT) return path;
  // size the bitrate to the reel's length so ONE encode fits (each pass is ~2.5 min on the
  // runner): aim for ~38MB total, never above 6 Mbps, then step down only if it still misses
  const secs = await durationSecs(path);
  const fitted = secs ? Math.min(6, Math.max(1.5, (38 * 8 * 1.048576) / secs - 0.128)) : 4;
  const ladder = [Number(fitted.toFixed(1)), Number((fitted * 0.7).toFixed(1))];
  for (const mbps of ladder) {
    const out = path.replace(/\.mp4$/, `.ig${mbps}.mp4`);
    await ffmpeg([
      "-i", path,
      "-c:v", "libx264", "-preset", "medium", "-b:v", `${mbps}M`, "-maxrate", `${mbps * 1.5}M`, "-bufsize", `${mbps * 2}M`,
      "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", "-y", out,
    ]);
    const s = (await stat(out)).size;
    console.log(`upload: ${(size / 1048576).toFixed(0)}MB is over Supabase's limit, re-encoded at ${mbps}Mbps -> ${(s / 1048576).toFixed(0)}MB`);
    if (s <= UPLOAD_LIMIT) return out;
  }
  throw new Error(`reel is ${(size / 1048576).toFixed(0)}MB and couldn't be brought under Supabase's 50MB limit`);
}

function durationSecs(path: string): Promise<number | undefined> {
  return new Promise((res) => {
    const p = spawn("npx", ["remotion", "ffprobe", path], { cwd: config.studioDir, shell: process.platform === "win32" });
    let out = "";
    p.stdout.on("data", (d) => (out += d));
    p.stderr.on("data", (d) => (out += d));
    p.on("error", () => res(undefined));
    p.on("close", () => {
      const m = out.match(/Duration:\s*(\d+):(\d+):([\d.]+)/);
      res(m ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) : undefined);
    });
  });
}

// Remotion ships its own ffmpeg — use it from the studio so the runner needs nothing extra
function ffmpeg(args: string[]): Promise<void> {
  return new Promise((res, rej) => {
    const p = spawn("npx", ["remotion", "ffmpeg", ...args], { cwd: config.studioDir, shell: process.platform === "win32" });
    let err = "";
    p.stderr.on("data", (d) => (err += d));
    p.on("error", rej);
    p.on("close", (code) => (code === 0 ? res() : rej(new Error(`ffmpeg exited ${code}: ${err.slice(-300)}`))));
  });
}

/** A public URL Instagram will accept: 200 (or 206), served as video, and not empty. */
async function assertFetchable(url: string): Promise<void> {
  const r = await fetch(url, { headers: { range: "bytes=0-1023" }, signal: AbortSignal.timeout(20_000) });
  const type = r.headers.get("content-type") ?? "";
  if (!(r.ok || r.status === 206)) throw new Error(`public URL returned ${r.status}`);
  if (!/video\/|octet-stream/.test(type)) throw new Error(`public URL serves ${type || "no content-type"}, not video`);
  const buf = new Uint8Array(await r.arrayBuffer());
  if (buf.length < 16) throw new Error("public URL returned an empty body");
}

async function uploadTmpfiles(localPath: string): Promise<string> {
  const body = await readFile(localPath);
  const form = new FormData();
  form.append("file", new Blob([body], { type: "video/mp4" }), basename(localPath));
  const r = await fetch("https://tmpfiles.org/api/v1/upload", {
    method: "POST",
    body: form,
    signal: AbortSignal.timeout(5 * 60_000),
  });
  if (!r.ok) throw new Error(`tmpfiles upload failed: ${r.status}`);
  const j: any = await r.json();
  const page: string | undefined = j?.data?.url; // https://tmpfiles.org/<id>/<name>.mp4
  if (!page) throw new Error("tmpfiles: no url in response");
  // the page URL isn't the file — the direct download (correct content-type) is /dl/<id>/...
  return page.replace("://tmpfiles.org/", "://tmpfiles.org/dl/");
}
