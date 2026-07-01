import { uploadReel } from "../lib/supabase.js";
import { publishReel } from "../lib/ig.js";

// Progress hooks so the bot can tell the user what's happening during the (slow) publish.
export type PostHooks = {
  onUploaded?: () => void;
  onProcessing?: () => void;
  onPublishing?: () => void;
};

// Upload the mp4 to Supabase (public URL) then publish to Instagram. Returns the permalink.
export async function postReel(mp4Path: string, caption: string, hooks: PostHooks = {}): Promise<string> {
  const publicUrl = await uploadReel(mp4Path, `reel-${Date.now()}.mp4`);
  hooks.onUploaded?.();
  return publishReel(publicUrl, caption, hooks);
}
