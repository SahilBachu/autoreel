import { uploadPublic } from "../lib/upload.js";
import { publishReel } from "../lib/ig.js";
import { uploadReel } from "../lib/supabase.js";

// Progress hooks so the bot can tell the user what's happening during the (slow) publish.
export type PostHooks = {
  onUploaded?: () => void;
  onProcessing?: () => void;
  onPublishing?: () => void;
};

// Upload the mp4 to a public URL (Supabase, or tmpfiles fallback) then publish to Instagram.
// Returns the permalink for the user and the media id for the site row / DM autoresponder.
export async function postReel(mp4Path: string, caption: string, hooks: PostHooks = {}, thumbPath?: string): Promise<{ permalink: string; mediaId: string }> {
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
  return publishReel(publicUrl, caption, hooks, coverUrl);
}
