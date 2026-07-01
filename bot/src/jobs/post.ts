import { config } from "../config.js";

// Upload the mp4 to Supabase (public URL) then publish to Instagram via the Graph API on
// host graph.instagram.com. See BUILD.md "Instagram posting". Returns the permalink.
export async function postReel(_mp4Path: string, _caption: string): Promise<string> {
  // 1. supabase: upload to bucket `${config.supabase.bucket}` -> get public URL
  // 2. POST `${config.ig.base}/${config.ig.userId}/media`  { media_type: "REELS",
  //      video_url, caption, access_token }
  // 3. poll `${config.ig.base}/{container}?fields=status_code` until FINISHED
  // 4. POST `${config.ig.base}/${config.ig.userId}/media_publish` { creation_id, access_token }
  // 5. return the resulting permalink
  void config;
  throw new Error("postReel: implement supabase upload + IG publish (see BUILD.md).");
}
