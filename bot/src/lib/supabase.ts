import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { config } from "../config.js";

// Upload an mp4 to a PUBLIC Supabase Storage bucket and return its public URL
// (Instagram needs a publicly reachable video_url). Uses the service-role key.
export async function uploadReel(localPath: string, destName?: string): Promise<string> {
  const { url, serviceKey, bucket } = config.supabase;
  if (!url || !serviceKey) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_KEY not set");

  const name = destName || basename(localPath);
  const body = await readFile(localPath);

  const r = await fetch(`${url}/storage/v1/object/${bucket}/${name}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      "content-type": "video/mp4",
      "x-upsert": "true",
    },
    body,
    // fail fast if Supabase's edge is unreachable (it flakes from some WSL/network combos) so
    // the caller can fall back to another host instead of hanging.
    signal: AbortSignal.timeout(25000),
  });
  if (!r.ok) throw new Error(`Supabase upload failed: ${r.status} ${await r.text()}`);

  return `${url}/storage/v1/object/public/${bucket}/${name}`;
}
