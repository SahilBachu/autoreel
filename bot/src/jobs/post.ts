import { uploadPublic } from "../lib/upload.js";
import { publishReel } from "../lib/ig.js";

// Progress hooks so the bot can tell the user what's happening during the (slow) publish.
export type PostHooks = {
  onUploaded?: () => void;
  onProcessing?: () => void;
  onPublishing?: () => void;
};

// Upload the mp4 to a public URL (Supabase, or tmpfiles fallback) then publish to Instagram.
export async function postReel(mp4Path: string, caption: string, hooks: PostHooks = {}): Promise<string> {
  const { url: publicUrl, via } = await uploadPublic(mp4Path);
  console.log(`reel uploaded via ${via}: ${publicUrl}`);
  hooks.onUploaded?.();
  return publishReel(publicUrl, caption, hooks);
}
