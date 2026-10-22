import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { config, REPO_ROOT } from "../config.js";
import { conversationWith, followsUs, igGet, listComments, listConversations, me, recentThreads, replyToComment, sendMessage, sendPrivateReply, type IgError, type QuickReply } from "../lib/ig.js";
import { deletePostBySlug, postsWithMedia, postUrl, publicLinkFor, recentPostsWithMedia, recentToolPosts, type ReelPost } from "../lib/posts.js";
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
  retries?: Record<string, number>; // commentId -> failed attempts on a transient error
  asked?: Record<string, { slug: string; at: string }>; // commenter username -> the reel they asked on (rescue)
  sentTo?: Record<string, string>; // igsid -> when they got their link (rescue never double-sends)
  check?: { at: string; ok: boolean; note?: string };
  stats: { dm1: number; dm2: number; nudges: number; rescued?: number; lastTick?: string; lastError?: string; lastSweep?: string; lastRescue?: string };
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
  askFollow: () => `hi! please make sure you're following and i'll send you the link. (reply with anything after following to get it)`,
  link: (title: string, link: string) => `here you go — ${title}: ${link}`,
  intro: (title: string, link: string) => `hi! here's ${title}: ${link}`,
  nudge: () => `looks like you're not following yet — follow, then tap the button (or reply with anything) and i'll send it right over.`,
  // public, under their comment. Rotated so a dozen identical replies don't read as spam to Instagram.
  commentReplies: ["Sent, check your DMs", "sent! check your DMs", "just sent it — check your DMs", "Sent 👀 check your DMs"],
};
const MAX_NUDGES = 2; // strict gate: stop after this many "not following yet"s

// the caption asks tool reels for TOOL and news reels for NEWS; either word (or LINK, or a
// plural) on any reel gets that reel's link — people don't read captions carefully
function keywordRe(): RegExp {
  const words = [config.dm.keyword || "TOOL", "TOOL", "NEWS", "LINK"].map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return new RegExp(`\\b(${[...new Set(words)].join("|")})s?\\b`, "i");
}

// what a commenter on this reel gets: the tool (through /go/ so clicks count), or the article
const linkFor = (post: ReelPost) => (post.type === "news" ? postUrl(post.slug, "news") : publicLinkFor(post));

// Meta errors that will never succeed on retry: already replied (2534025-ish), comment gone /
// no such object (100), the person blocks messages (551), permission (10, 200). Anything else —
// a timeout, "fetch failed", code 1/2/4/17 rate limits — is retried on later ticks.
const isPermanent = (e: IgError) => [10, 100, 200, 551].includes(e.code ?? -1) || e.subcode === 2534025;
const MAX_RETRIES = 6;

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
    if (!s.stats.lastRescue || now - new Date(s.stats.lastRescue).getTime() > 20 * 60_000) {
      await rescueStuck(s, now);
      s.stats.lastRescue = new Date().toISOString();
    }
    s.stats.lastTick = new Date().toISOString();
    s.stats.lastError = undefined;
  } catch (e: any) {
    s.stats.lastError = `${new Date().toISOString()} ${String(e.message).slice(0, 200)}`;
    console.error("dm tick:", e.message);
  }
  // housekeeping — handled ids older than 14d, pending older than 7d (private-reply window)
  for (const [id, ts] of Object.entries(s.handled)) if (now - new Date(ts).getTime() > 14 * DAY) delete s.handled[id];
  for (const [id, p] of Object.entries(s.pending)) if (now - new Date(p.dm1At).getTime() > 7 * DAY) delete s.pending[id];
  for (const [u, a] of Object.entries(s.asked ?? {})) if (now - new Date(a.at).getTime() > 7 * DAY) delete s.asked![u];
  for (const [id, ts] of Object.entries(s.sentTo ?? {})) if (now - new Date(ts).getTime() > 30 * DAY) delete s.sentTo![id];
  for (const id of Object.keys(s.retries ?? {})) if (s.handled[id]) delete s.retries![id];
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
  // a month back, not a week: reels keep getting found (and commented on) for weeks. Meta's limit
  // is 7 days from the COMMENT, which the timestamp check below enforces.
  const posts = await recentPostsWithMedia(30);
  for (const post of posts) {
    if (!post.ig_media_id || (post.type === "tool" && !post.tool_url)) continue;
    const link = linkFor(post);
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
        if (gate !== "off" && igsid) {
          s.pending[igsid] = { igsid, slug: post.slug, commentId: c.id, title: post.title, link, dm1At: s.handled[c.id], lastOursAt: s.handled[c.id] };
        }
        if (gate !== "off" && c.username) (s.asked ??= {})[c.username] = { slug: post.slug, at: s.handled[c.id] };
        if (gate === "off" && igsid) (s.sentTo ??= {})[igsid] = s.handled[c.id];
        // saved NOW, not at the end of the tick: a tick cut short used to forget who it had
        // asked, so their "followed" reply went unanswered
        save(s);
        // the public "sent, check your DMs" — best effort, never blocks the DM
        const pub = copy.commentReplies[s.stats.dm1 % copy.commentReplies.length];
        await replyToComment(c.id, pub).catch((e: any) => console.error(`comment reply failed on ${c.id}:`, e.message));
      } catch (e: any) {
        const tries = ((s.retries ??= {})[c.id] ?? 0) + 1;
        s.retries[c.id] = tries;
        if (isPermanent(e) || tries >= MAX_RETRIES) s.handled[c.id] = new Date().toISOString(); // give up on this one
        save(s);
        console.error(`dm#1 failed for comment ${c.id} (try ${tries}${s.handled[c.id] ? ", giving up" : ", will retry"}):`, e.message);
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
      (s.sentTo ??= {})[p.igsid] = new Date().toISOString();
      save(s);
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

// RESCUE: people we asked to follow who replied but never got their link. Until Oct 2026 the bot
// crash-looped and forgot who it had asked, so their "followed" went unanswered. Every 20 min,
// look at recent DM threads: our last word is the follow ask (or a nudge), they answered after
// it, no link since, and they answered inside Meta's 24h messaging window -> put them back on the
// waiting list, and pollReplies does the rest (follow check, link, or nudge) on the next tick.
const ASK_RE = /make sure you're following|not following yet/i;
const LINK_RE = /here you go|here's .+: https?:\/\//i;
async function rescueStuck(s: DmState, now: number) {
  let threads;
  try {
    threads = await recentThreads(25);
  } catch (e: any) {
    console.error("dm rescue: threads:", e.message);
    return;
  }
  let posts: ReelPost[] | undefined;
  const commentsBy = new Map<string, { post: ReelPost; commentId: string }>(); // username -> their keyword comment
  const re = keywordRe();
  for (const t of threads) {
    const them = t.people.find((p) => !isOurs(p.id, p.username));
    if (!them || s.pending[them.id] || s.sentTo?.[them.id]) continue;
    const msgs = t.messages; // newest first
    const askIdx = msgs.findIndex((m) => isOurs(m.fromId) && ASK_RE.test(m.text ?? ""));
    if (askIdx <= 0) continue; // never asked, or our ask is the newest message (they haven't answered)
    const after = msgs.slice(0, askIdx);
    if (after.some((m) => isOurs(m.fromId) && LINK_RE.test(m.text ?? ""))) continue; // already got it
    const reply = after.find((m) => !isOurs(m.fromId));
    if (!reply || now - new Date(reply.createdTime).getTime() > 23 * 3600_000) continue; // outside the 24h window

    // which reel were they asking about?
    let slug = them.username ? s.asked?.[them.username]?.slug : undefined;
    let commentId = "";
    posts ??= await recentPostsWithMedia(30).catch(() => []);
    if (!slug && them.username) {
      if (!commentsBy.size)
        for (const post of posts) {
          if (!post.ig_media_id) continue;
          for (const c of await listComments(post.ig_media_id).catch(() => []))
            if (c.username && re.test(c.text) && !commentsBy.has(c.username)) commentsBy.set(c.username, { post, commentId: c.id });
        }
      const hit = commentsBy.get(them.username);
      if (hit) ({ slug, commentId } = { slug: hit.post.slug, commentId: hit.commentId });
    }
    const post = posts.find((p) => p.slug === slug);
    if (!post) {
      console.error(`dm rescue: @${them.username ?? them.id} replied but I can't tell which reel they want`);
      continue;
    }
    const askedAt = msgs[askIdx].createdTime;
    s.pending[them.id] = { igsid: them.id, slug: post.slug, commentId, title: post.title, link: linkFor(post), dm1At: askedAt, lastOursAt: askedAt };
    s.stats.rescued = (s.stats.rescued ?? 0) + 1;
    console.log(`dm rescue: @${them.username ?? them.id} answered the follow ask for ${post.slug} and never got the link — back on the list`);
  }
  save(s);
}

// /dm in Telegram
export function dmStatus(): string {
  const s = load();
  const { enabled, gate, keyword, pollMinutes } = config.dm;
  return [
    `DM autoresponder: ${enabled ? "on" : "OFF"} · gate=${gate} · keyword=${keyword} · every ${pollMinutes}m`,
    s.check ? `last check: ${s.check.ok ? "ok" : "FAILED — " + s.check.note} (${s.check.at.slice(0, 16)})` : "not checked yet",
    `sent: ${s.stats.dm1} first DMs · ${s.stats.dm2} links · ${s.stats.nudges} nudges${s.stats.rescued ? ` · ${s.stats.rescued} rescued` : ""}`,
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
