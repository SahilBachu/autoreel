import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { uploadReel } from "./supabase.js";

// Put the reel somewhere PUBLIC so Instagram can pull it. Prefer Supabase (configured, proven
// with IG); if it's unreachable — Supabase's CF edge flakes from some networks/WSL even when
// everything else works — fall back to tmpfiles.org, which serves the mp4 as video/mp4.
export async function uploadPublic(localPath: string): Promise<{ url: string; via: string }> {
  const name = `reel-${Date.now()}.mp4`;
  try {
    const url = await uploadReel(localPath, name);
    return { url, via: "supabase" };
  } catch (e: any) {
    console.error("supabase upload failed, falling back to tmpfiles:", e?.message ?? e);
  }
  const url = await uploadTmpfiles(localPath);
  return { url, via: "tmpfiles" };
}

async function uploadTmpfiles(localPath: string): Promise<string> {
  const body = await readFile(localPath);
  const form = new FormData();
  form.append("file", new Blob([body], { type: "video/mp4" }), basename(localPath));
  const r = await fetch("https://tmpfiles.org/api/v1/upload", {
    method: "POST",
    body: form,
    signal: AbortSignal.timeout(90000),
  });
  if (!r.ok) throw new Error(`tmpfiles upload failed: ${r.status}`);
  const j: any = await r.json();
  const page: string | undefined = j?.data?.url; // https://tmpfiles.org/<id>/<name>.mp4
  if (!page) throw new Error("tmpfiles: no url in response");
  // the page URL isn't the file — the direct download (correct content-type) is /dl/<id>/...
  return page.replace("://tmpfiles.org/", "://tmpfiles.org/dl/");
}
