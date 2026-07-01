import { config } from "../config.js";

// Instagram publishing via the Instagram API with Instagram Login.
// HOST IS graph.instagram.com (not graph.facebook.com). Flow: create REELS container ->
// poll status until FINISHED -> media_publish. Containers expire in 24h.

const base = config.ig.base; // https://graph.instagram.com
const token = () => config.ig.token;
const userId = () => config.ig.userId;

async function igGet(path: string, params: Record<string, string>) {
  const u = new URL(`${base}/${path}`);
  for (const [k, v] of Object.entries({ ...params, access_token: token() })) u.searchParams.set(k, v);
  const r = await fetch(u, { method: "GET" });
  const j = await r.json();
  if (!r.ok) throw new Error(`IG GET ${path}: ${JSON.stringify(j)}`);
  return j as any;
}

async function igPost(path: string, params: Record<string, string>) {
  const body = new URLSearchParams({ ...params, access_token: token() });
  const r = await fetch(`${base}/${path}`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`IG POST ${path}: ${JSON.stringify(j)}`);
  return j as any;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type PublishHooks = { onProcessing?: () => void; onPublishing?: () => void };

/** Publish a reel from a PUBLIC mp4 URL. Returns the permalink. */
export async function publishReel(videoUrl: string, caption: string, hooks: PublishHooks = {}): Promise<string> {
  if (!token() || !userId()) throw new Error("IG_ACCESS_TOKEN / IG_USER_ID not set");

  // 1. create container
  const { id: creationId } = await igPost(`${userId()}/media`, {
    media_type: "REELS",
    video_url: videoUrl,
    caption,
  });

  // 2. poll status until FINISHED (video transcode can take a while)
  hooks.onProcessing?.();
  const deadline = Date.now() + 5 * 60_000;
  for (;;) {
    const { status_code } = await igGet(creationId, { fields: "status_code" });
    if (status_code === "FINISHED") break;
    if (status_code === "ERROR" || status_code === "EXPIRED")
      throw new Error(`IG container ${status_code}`);
    if (Date.now() > deadline) throw new Error("IG container timeout");
    await sleep(4000);
  }

  // 3. publish
  hooks.onPublishing?.();
  const { id: mediaId } = await igPost(`${userId()}/media_publish`, { creation_id: creationId });

  // 4. permalink
  const { permalink } = await igGet(mediaId, { fields: "permalink" });
  return permalink as string;
}
