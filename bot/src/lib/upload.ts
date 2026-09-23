import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { uploadReel } from "./supabase.js";

// Put the reel somewhere PUBLIC so Instagram can pull it. Supabase is the real home (proven
// with IG); tmpfiles.org is a last resort — Instagram often can't fetch its URLs, and when it
// can't, the failure only shows up minutes later as a bare "container ERROR". So: try Supabase
// properly (with retries and a realistic timeout), and PROVE whatever URL we end up with is
// actually downloadable as video before Instagram ever sees it.
export async function uploadPublic(localPath: string): Promise<{ url: string; via: string }> {
  const name = `reel-${Date.now()}.mp4`;
  let lastErr = "";
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const url = await uploadReel(localPath, name);
      await assertFetchable(url);
      return { url, via: "supabase" };
    } catch (e: any) {
      lastErr = String(e?.message ?? e);
      console.error(`supabase upload attempt ${attempt} failed:`, lastErr);
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
