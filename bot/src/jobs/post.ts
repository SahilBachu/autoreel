import { uploadReel } from "../lib/supabase.js";
import { publishReel } from "../lib/ig.js";

// Upload the mp4 to Supabase (public URL) then publish to Instagram. Returns the permalink.
export async function postReel(mp4Path: string, caption: string): Promise<string> {
  const publicUrl = await uploadReel(mp4Path, `reel-${Date.now()}.mp4`);
  return publishReel(publicUrl, caption);
}
