import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { config, REPO_ROOT } from "../config.js";
import { conversationWith, followsUs, igGet, listComments, listConversations, me, replyToComment, sendMessage, sendPrivateReply, type IgError, type QuickReply } from "../lib/ig.js";
import { deletePostBySlug, postsWithMedia, publicLinkFor, recentToolPosts } from "../lib/posts.js";
import { sendToChat } from "./discover.js";

// The comment -> DM funnel. Someone comments "TOOL" on a tool reel; they get the link in
// their DMs. Runs as a poll inside the bot process (every DM_POLL_MINUTES), because the
// comments WEBHOOK needs Meta Advanced Access + App Review and polling doesn't.
//
// Meta's consent rule shapes everything: we can't read whether someone follows us until
// they've MESSAGED us — a comment doesn't count. So with the gate on it's two steps:
//   comment TOOL -> DM #1 "follow + reply" (no link) -> they reply -> check follow -> DM #2 link
// One private reply per comment, ever; follow-ups only within 24h of their last message.
//
// DM_FOLLOW_GATE:  strict = link only to followers (nudge once, then go quiet)
//                  soft   = ask once; if they reply again, send it regardless
//                  off    = link in DM #1, one step, no follow check
// It's a flag on purpose: the gate costs conversion (non-followers get DMs in Requests).
// Run a week each way and read the numbers before deciding.

type Pending = { igsid: string; slug: string; commentId: string; title: string; link: string; dm1At: string; lastOursAt: string; nudges?: number };
type DmState = {
  handled: Record<string, string>; // commentId -> when we replied (never reply twice)
  pending: Record<string, Pending>; // igsid -> waiting on their reply
  check?: { at: string; ok: boolean; note?: string };
  stats: { dm1: number; dm2: number; nudges: number; lastTick?: string; lastError?: string; lastSweep?: string };
};

const FILE = resolve(REPO_ROOT, "bot/data/dm-state.json");
const DAY = 864e5;

function load(): DmState {
  try {
    return JSON.parse(readFileSync(FILE, "utf8"));
  } catch {
    return { handled: {}, pending: {}, stats: { dm1: 0, dm2: 0, nudges: 0 } };
  }
}
function save(s: DmState) {
  try {
    if (!existsSync(resolve(REPO_ROOT, "bot/data"))) mkdirSync(resolve(REPO_ROOT, "bot/data"), { recursive: true });
    writeFileSync(FILE, JSON.stringify(s, null, 2));
  } catch (e) {
    console.error("dm state persist failed", e);
  }
}

// the copy — sahil's wording. The parenthetical is the fallback for anyone whose app doesn't
// show the button: typing anything does exactly what tapping does.
const FOLLOWED: QuickReply[] = [{ title: "I've followed", payload: "FOLLOWED" }];
const copy = {
  askFollow: () => `hi! please make sure you're following and i'll send you the tool. (reply with anything after following to get the link)`,
  link: (title: string, link: string) => `here you go — ${title}: ${link}`,
  intro: (title: string, link: string) => `hi! here's ${title}: ${link}`,
  nudge: () => `looks like you're not following yet — follow, then tap the button (or reply with anything) and i'll send it right over.`,
  // public, under their comment. Rotated so a dozen identical replies don't read as spam to Instagram.
  commentReplies: ["Sent, check your DMs", "sent! check your DMs", "just sent it — check your DMs", "Sent 👀 check your DMs"],
};
const MAX_NUDGES = 2; // strict gate: stop after this many "not following yet"s

function keywordRe(): RegExp {
  const k = (config.dm.keyword || "TOOL").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${k}\\b`, "i");
}

// "User consent is required to access user profile" — they haven't messaged us yet. Not an
// error, just "not yet". Anything else IS an error and should surface.
const isConsentError = (e: IgError) => /consent/i.test(e.message);

// every id Meta might use for our own account (see me() in ig.ts) + our username
let ours = { ids: new Set<string>(), username: "" };
const isOurs = (id?: string, username?: string) =>
  (id !== undefined && ours.ids.has(id)) || (!!username && username === ours.username);
async function loadOurs() {
  const m = await me();
  ours = { ids: new Set([m.id, m.userId, config.ig.userId].filter(Boolean) as string[]), username: m.username ?? "" };
}

// Can this token do what the funnel needs? Cheap, read-only, and the answer goes to Telegram
// so a missing scope never fails silently for a week.
async function selfCheck(): Promise<{ ok: boolean; note?: string }> {
  try {
    await loadOurs();
    const posts = await recentToolPosts(30);
    const withMedia = posts.find((p) => p.ig_media_id);
    if (withMedia) await listComments(withMedia.ig_media_id!); // instagram_business_manage_comments
    await listConversations(); // instagram_business_manage_messages — needed even when the inbox is empty
    return { ok: true };
  } catch (e: any) {
    return { ok: false, note: String(e.message).slice(0, 300) };
  }
}

export async function dmTick(): Promise<void> {
  const s = load();
  const now = Date.now();
  const stale = !s.check || now - new Date(s.check.at).getTime() > 6 * 3600_000;
  if (stale || !s.check?.ok) {
    const c = await selfCheck();
    const wasOk = s.check?.ok;
    s.check = { at: new Date().toISOString(), ...c };
    if (!c.ok && wasOk !== false) {
      await sendToChat(
        `⚠️ DM autoresponder can't run: ${c.note}\n\nUsually the token is missing a scope — regenerate it with instagram_business_manage_comments + instagram_business_manage_messages (see BUILD.md). I'll retry every 6h.`,
      ).catch(() => {});
    }
    if (c.ok && wasOk === false) await sendToChat("DM autoresponder is back up.").catch(() => {});
    save(s);
    if (!c.ok) return;
  }
  if (!ours.ids.size) await loadOurs();

  try {
    if (!s.stats.lastSweep || now - new Date(s.stats.lastSweep).getTime() > 30 * 60_000) {
      await sweepDeletedReels();
      s.stats.lastSweep = new Date().toISOString();
    }
    await pollComments(s, now);
    await pollReplies(s, now);
    s.stats.lastTick = new Date().toISOString();
    s.stats.lastError = undefined;
  } catch (e: any) {
    s.stats.lastError = `${new Date().toISOString()} ${String(e.message).slice(0, 200)}`;
    console.error("dm tick:", e.message);
  }
  // housekeeping — handled ids older than 14d, pending older than 7d (private-reply window)
  for (const [id, ts] of Object.entries(s.handled)) if (now - new Date(ts).getTime() > 14 * DAY) delete s.handled[id];
  for (const [id, p] of Object.entries(s.pending)) if (now - new Date(p.dm1At).getTime() > 7 * DAY) delete s.pending[id];
  save(s);
}

// A reel deleted on Instagram shouldn't linger on the site (or keep getting polled). Meta
// answers a lookup on deleted media with code 100 "does not exist". Anything else — a timeout,
// a rate limit — is left alone: never delete a row on a maybe.
async function sweepDeletedReels() {
  const gone: { slug: string; title: string }[] = [];
  for (const p of await postsWithMedia(60)) {
    try {
      await igGet(p.ig_media_id!, { fields: "id" });
    } catch (e: any) {
      const err = e as IgError;
      if (err.code === 100 && err.subcode === 33) gone.push({ slug: p.slug, title: p.title });
    }
  }
  // subcode 33 also covers "missing permissions" — a token problem would make EVERY reel look
  // deleted. More than two at once is far likelier to be that, so ask instead of wiping the site.
  if (gone.length > 2) {
    await sendToChat(`⚠️ ${gone.length} reels look deleted on Instagram (${gone.map((g) => g.title).join(", ")}). That's more likely a token problem than real deletions, so I left the site alone.`).catch(() => {});
    return;
  }
  for (const g of gone) {
    await deletePostBySlug(g.slug);
    console.log(`sweep: reel for "${g.slug}" is gone from Instagram — removed from the site`);
    await sendToChat(`removed "${g.title}" from the site — the reel was deleted on Instagram.`).catch(() => {});
  }
}

async function pollComments(s: DmState, now: number) {
  const re = keywordRe();
  const posts = await recentToolPosts(7);
  for (const post of posts) {
    if (!post.ig_media_id || !post.tool_url) continue;
    const link = publicLinkFor(post);
    const comments = await listComments(post.ig_media_id).catch((e: any) => {
      console.error(`dm: comments on ${post.slug}:`, e.message);
      return [];
    });
    for (const c of comments) {
      if (s.handled[c.id]) continue;
      if (isOurs(c.fromId, c.username)) continue; // our own replies
      if (c.timestamp && now - new Date(c.timestamp).getTime() > 7 * DAY) continue; // outside the reply window anyway
      if (!re.test(c.text)) continue;

      const gate = config.dm.gate;
      try {
        const { igsid, buttons } =
          gate === "off" ? await sendPrivateReply(c.id, copy.intro(post.title, link)) : await sendPrivateReply(c.id, copy.askFollow(), FOLLOWED);
        s.handled[c.id] = new Date().toISOString();
        s.stats.dm1++;
        console.log(`dm#1 -> @${c.username ?? "?"} for ${post.slug} (${gate}${gate !== "off" ? `, button ${buttons ? "on" : "rejected"}` : ""})`);
        // the public "sent, check your DMs" — best effort, never blocks the DM
        const pub = copy.commentReplies[s.stats.dm1 % copy.commentReplies.length];
        await replyToComment(c.id, pub).catch((e: any) => console.error(`comment reply failed on ${c.id}:`, e.message));
        if (gate !== "off" && igsid) {
          s.pending[igsid] = { igsid, slug: post.slug, commentId: c.id, title: post.title, link, dm1At: s.handled[c.id], lastOursAt: s.handled[c.id] };
        }
      } catch (e: any) {
        // already replied / comment gone / commenter blocks DMs — all permanent. Don't retry forever.
        s.handled[c.id] = new Date().toISOString();
        console.error(`dm#1 failed for comment ${c.id}:`, e.message);
      }
    }
  }
}

async function pollReplies(s: DmState, now: number) {
  for (const p of Object.values(s.pending)) {
    const msgs = await conversationWith(p.igsid).catch((e: any) => {
      console.error(`dm: conversation ${p.igsid}:`, e.message);
      return [];
    });
    const since = new Date(p.lastOursAt).getTime();
    const theirs = msgs.find((m) => m.fromId && !isOurs(m.fromId) && new Date(m.createdTime).getTime() > since);
    if (!theirs) continue;

    let follows: boolean | undefined;
    try {
      follows = await followsUs(p.igsid);
    } catch (e: any) {
      if (isConsentError(e)) continue; // consent hasn't propagated yet — next tick
      console.error(`dm: follow check ${p.igsid}:`, e.message);
      continue;
    }

    const sendLink = async () => {
      await sendMessage(p.igsid, copy.link(p.title, p.link));
      s.stats.dm2++;
      delete s.pending[p.igsid];
      console.log(`dm#2 link -> ${p.igsid} for ${p.slug}`);
    };

    if (follows) {
      await sendLink();
    } else if ((p.nudges ?? 0) < MAX_NUDGES) {
      await sendMessage(p.igsid, copy.nudge(), FOLLOWED);
      p.nudges = (p.nudges ?? 0) + 1;
      p.lastOursAt = new Date().toISOString();
      s.stats.nudges++;
    } else if (config.dm.gate === "soft") {
      await sendLink(); // asked, they came back — good enough
    } else {
      delete s.pending[p.igsid]; // strict: asked enough times, go quiet
    }
  }
}

// /dm in Telegram
export function dmStatus(): string {
  const s = load();
  const { enabled, gate, keyword, pollMinutes } = config.dm;
  return [
    `DM autoresponder: ${enabled ? "on" : "OFF"} · gate=${gate} · keyword=${keyword} · every ${pollMinutes}m`,
    s.check ? `last check: ${s.check.ok ? "ok" : "FAILED — " + s.check.note} (${s.check.at.slice(0, 16)})` : "not checked yet",
    `sent: ${s.stats.dm1} first DMs · ${s.stats.dm2} links · ${s.stats.nudges} nudges`,
    `waiting on a reply: ${Object.keys(s.pending).length}`,
    s.stats.lastTick ? `last tick: ${s.stats.lastTick.slice(0, 16)}` : "",
    s.stats.lastError ? `last error: ${s.stats.lastError}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

let timer: NodeJS.Timeout | undefined;
export function startDmLoop(): void {
  if (!config.dm.enabled || timer) return;
  const run = () => dmTick().catch((e) => console.error("dm loop:", e.message));
  setTimeout(run, 15_000); // let the bot come up first
  timer = setInterval(run, Math.max(1, config.dm.pollMinutes) * 60_000);
  console.log(`dm autoresponder on (gate=${config.dm.gate}, every ${config.dm.pollMinutes}m)`);
}
