import { config } from "../config.js";

// Instagram via the Instagram API with Instagram Login. HOST IS graph.instagram.com (not
// graph.facebook.com). Two halves live here:
//   publishing — create REELS container -> poll until FINISHED -> media_publish (24h expiry)
//   messaging  — read comments, private-reply a commenter, read their reply, check follow
// Every messaging call is Standard Access for an account you own, so none of it needs Meta
// App Review as long as we POLL for comments instead of subscribing to the comments webhook
// (that one alone needs Advanced Access). See jobs/dm.ts for the flow.

const base = config.ig.base; // https://graph.instagram.com
const token = () => config.ig.token;
const userId = () => config.ig.userId;

export type IgError = Error & { status?: number; code?: number; subcode?: number };

function igError(what: string, status: number, j: any): IgError {
  const e = new Error(`${what}: ${JSON.stringify(j)}`) as IgError;
  e.status = status;
  e.code = j?.error?.code;
  e.subcode = j?.error?.error_subcode;
  return e;
}

export async function igGet(path: string, params: Record<string, string> = {}) {
  const u = new URL(`${base}/${path}`);
  for (const [k, v] of Object.entries({ ...params, access_token: token() })) u.searchParams.set(k, v);
  const r = await fetch(u, { method: "GET", signal: AbortSignal.timeout(20_000) });
  const j = await r.json();
  if (!r.ok) throw igError(`IG GET ${path}`, r.status, j);
  return j as any;
}

// form-encoded POST — what the media endpoints expect
async function igPost(path: string, params: Record<string, string>) {
  const body = new URLSearchParams({ ...params, access_token: token() });
  const r = await fetch(`${base}/${path}`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
    signal: AbortSignal.timeout(30_000),
  });
  const j = await r.json();
  if (!r.ok) throw igError(`IG POST ${path}`, r.status, j);
  return j as any;
}

// JSON POST — what the messaging endpoint expects
async function igPostJson(path: string, payload: unknown) {
  const u = new URL(`${base}/${path}`);
  u.searchParams.set("access_token", token());
  const r = await fetch(u, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(20_000),
  });
  const j = await r.json();
  if (!r.ok) throw igError(`IG POST ${path}`, r.status, j);
  return j as any;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ---- publishing -----------------------------------------------------------------

export type PublishHooks = { onProcessing?: () => void; onPublishing?: () => void };

/** Publish a reel from a PUBLIC mp4 URL. Returns the permalink AND the media id — the id is
 *  the join key the site row and the DM autoresponder use to find this reel's comments. */
export async function publishReel(
  videoUrl: string,
  caption: string,
  hooks: PublishHooks = {},
): Promise<{ permalink: string; mediaId: string }> {
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
    const { status_code, status } = await igGet(creationId, { fields: "status_code,status" });
    if (status_code === "FINISHED") break;
    // `status` carries Meta's actual reason ("the video could not be downloaded", a codec
    // complaint, …) — without it a failure is just "container ERROR" and a guessing game
    if (status_code === "ERROR" || status_code === "EXPIRED")
      throw new Error(`Instagram rejected the video (${status_code}${status ? `: ${status}` : ""})`);
    if (Date.now() > deadline) throw new Error("IG container timeout");
    await sleep(4000);
  }

  // 3. publish
  hooks.onPublishing?.();
  const { id: mediaId } = await igPost(`${userId()}/media_publish`, { creation_id: creationId });

  // 4. permalink
  const { permalink } = await igGet(mediaId, { fields: "permalink" });
  return { permalink: permalink as string, mediaId: String(mediaId) };
}

// ---- messaging (the comment -> DM funnel) ----------------------------------------

export type IgComment = { id: string; text: string; timestamp: string; username?: string; fromId?: string };

/** Comments on one of OUR media objects. Standard Access — this is the poll that replaces
 *  the comments webhook. */
export async function listComments(mediaId: string): Promise<IgComment[]> {
  const j = await igGet(`${mediaId}/comments`, { fields: "id,text,timestamp,username,from", limit: "50" });
  return ((j.data ?? []) as any[]).map((c) => ({
    id: String(c.id),
    text: String(c.text ?? ""),
    timestamp: String(c.timestamp ?? ""),
    username: c.username ?? c.from?.username,
    fromId: c.from?.id ? String(c.from.id) : undefined,
  }));
}

export type QuickReply = { title: string; payload: string };
const toQuickReplies = (q?: QuickReply[]) =>
  q?.length ? { quick_replies: q.slice(0, 13).map((r) => ({ content_type: "text", title: r.title.slice(0, 20), payload: r.payload })) } : {};

/** The ONE private reply Meta allows per comment (7-day window). Returns the commenter's
 *  Instagram-scoped id, which is what every later call about that person keys on. Quick-reply
 *  buttons are attempted; if Meta rejects them on a private reply we resend as plain text
 *  (a rejected call doesn't use up the one reply). */
export async function sendPrivateReply(commentId: string, text: string, quick?: QuickReply[]): Promise<{ igsid?: string; buttons: boolean }> {
  const send = (withButtons: boolean) =>
    igPostJson(`me/messages`, {
      recipient: { comment_id: commentId },
      message: { text: clampMessage(text), ...(withButtons ? toQuickReplies(quick) : {}) },
    });
  let j: any;
  let buttons = !!quick?.length;
  try {
    j = await send(buttons);
  } catch (e: any) {
    if (!buttons || (e as IgError).subcode === 2534025) throw e; // already replied / invalid comment — not a buttons problem
    console.error("private reply with quick replies rejected, retrying as plain text:", e.message);
    buttons = false;
    j = await send(false);
  }
  return { igsid: j.recipient_id ? String(j.recipient_id) : undefined, buttons };
}

/** A follow-up DM — only legal within 24h of the person's last message to us. */
export async function sendMessage(igsid: string, text: string, quick?: QuickReply[]): Promise<void> {
  await igPostJson(`me/messages`, { recipient: { id: igsid }, message: { text: clampMessage(text), ...toQuickReplies(quick) } });
}

/** A PUBLIC reply under a comment ("sent, check your DMs"). instagram_business_manage_comments. */
export async function replyToComment(commentId: string, text: string): Promise<void> {
  const u = new URL(`${base}/${commentId}/replies`);
  u.searchParams.set("access_token", token());
  const r = await fetch(u, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ message: text }),
    signal: AbortSignal.timeout(20_000),
  });
  const j = await r.json();
  if (!r.ok) throw igError(`IG POST ${commentId}/replies`, r.status, j);
}

export type IgMessage = { id: string; fromId?: string; createdTime: string; text?: string };

/** Messages in our thread with one person, newest first. This is how we notice they replied
 *  to DM #1 without the messages webhook. */
export async function conversationWith(igsid: string): Promise<IgMessage[]> {
  const j = await igGet("me/conversations", {
    platform: "instagram",
    user_id: igsid,
    fields: "id,updated_time,messages{id,from,created_time,message}",
  });
  const conv = (j.data ?? [])[0];
  if (!conv) return [];
  let msgs: any[] = conv.messages?.data ?? [];
  // some API versions return only ids under the nested field — hydrate the few we need
  if (msgs.length && msgs[0].from === undefined) {
    msgs = await Promise.all(msgs.slice(0, 5).map((m) => igGet(m.id, { fields: "id,from,created_time,message" }).catch(() => m)));
  }
  return msgs.map((m) => ({
    id: String(m.id),
    fromId: m.from?.id ? String(m.from.id) : undefined,
    createdTime: String(m.created_time ?? ""),
    text: m.message,
  }));
}

/** One page of our inbox — only used to prove the token carries the messaging scope. (Asking
 *  for a conversation with our OWN id is rejected as "invalid user ID", so that can't be the
 *  probe.) */
export async function listConversations(): Promise<void> {
  await igGet("me/conversations", { platform: "instagram", fields: "id", limit: "1" });
}

/** Does this person follow us? Only answerable AFTER they've messaged us — before that Meta
 *  returns "User consent is required" (code 100 / subcode 2534006-ish). Caller handles it. */
export async function followsUs(igsid: string): Promise<boolean> {
  const j = await igGet(igsid, { fields: "username,is_user_follow_business" });
  return Boolean(j.is_user_follow_business);
}

/** Our own account — the cheapest "is this token alive" check. The API hands out TWO ids for
 *  the same account (the app-scoped `id` and the professional `user_id`), and comments /
 *  messages can carry either — so callers get both. */
export async function me(): Promise<{ id: string; userId?: string; username?: string }> {
  const j = await igGet("me", { fields: "id,user_id,username" });
  return { id: String(j.id), userId: j.user_id ? String(j.user_id) : undefined, username: j.username };
}

/** Our recent media ids, newest first. */
export async function recentMedia(limit = 10): Promise<{ id: string; permalink?: string; timestamp?: string }[]> {
  const j = await igGet("me/media", { fields: "id,permalink,timestamp", limit: String(limit) });
  return ((j.data ?? []) as any[]).map((m) => ({ id: String(m.id), permalink: m.permalink, timestamp: m.timestamp }));
}

// Meta caps message text at 1000 bytes UTF-8. Never let a long tool URL blow that up.
function clampMessage(s: string): string {
  const enc = new TextEncoder();
  if (enc.encode(s).length <= 1000) return s;
  let out = s;
  while (enc.encode(out).length > 997) out = out.slice(0, -1);
  return out + "…";
}
