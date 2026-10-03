import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { REPO_ROOT } from "../config.js";
import { igGet, listComments } from "../lib/ig.js";
import { allPosts } from "../lib/posts.js";
import { claudeJson } from "../lib/claude.js";
import { proposalHistory, TARGET_HELP, type Proposal } from "../lib/proposals.js";
import { stripAiTells } from "../lib/voice.js";

// THE ANALYST. Every morning (after the 3am digest) and on /stats: pull the account's real
// Instagram numbers, join them with what this system knows about each reel (tool vs news,
// the script, site clicks, DMs sent), keep a history, and have Opus write a social-media-
// manager report — what's working, what isn't, whether reach looks throttled, what to do next,
// and what to change in the system itself. Every run is kept, so each report can say whether
// the last one's advice was followed and what moved.
//
// Everything used here is readable with the token the bot already has (instagram_business_basic):
// account reach/views/engagement per day, views split follower vs non-follower over a range, and
// per-reel views, reach, likes, comments, shares, saves, average watch time and skip rate.

const DIR = resolve(REPO_ROOT, "bot/data/analytics");
const SNAPSHOTS = resolve(DIR, "snapshots.jsonl");
const REPORTS = resolve(DIR, "reports");
// what the researcher reads when picking topics — the performance half of the learning loop
export const PERFORMANCE_NOTES = resolve(REPO_ROOT, "bot/data/performance.md");

const DAY = 864e5;
const REEL_METRICS = "views,reach,likes,comments,shares,saved,total_interactions,ig_reels_avg_watch_time,ig_reels_video_view_total_time,reels_skip_rate";
const BASIC_METRICS = "views,reach,likes,comments,shares,saved,total_interactions";

export type ReelStat = {
  id: string;
  permalink: string;
  postedAt: string;
  ageDays: number;
  hourLocal: number; // hour it went out, runner-local time
  kind: string; // REELS / FEED …
  captionLine: string; // first real line of the caption (the hook)
  views?: number;
  reach?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  saved?: number;
  interactions?: number;
  avgWatchS?: number;
  skipRate?: number; // % of viewers who swiped away in the first ~3s
  // ours
  type?: "tool" | "news";
  title?: string;
  siteClicks?: number;
  toolComments?: number; // comments that asked for the link (contain the DM keyword)
  script?: string;
  scriptWords?: number;
};

export type Snapshot = {
  at: string;
  profile: { followers: number; following: number; posts: number };
  yesterday: Record<string, number>;
  week: { views: number; viewsFollower: number; viewsNonFollower: number; reach?: number };
  prevWeek?: { views: number; viewsNonFollower: number };
  month: { views: number; viewsNonFollower: number };
  reels: ReelStat[];
  funnel: { dm1: number; dm2: number; nudges: number };
};

const n = (v: unknown) => (typeof v === "number" ? v : undefined);

async function metricTotal(metric: string, since: number, until: number, breakdown?: string) {
  const params: Record<string, string> = {
    metric,
    period: "day",
    metric_type: "total_value",
    since: String(Math.floor(since / 1000)),
    until: String(Math.floor(until / 1000)),
  };
  if (breakdown) params.breakdown = breakdown;
  const j = await igGet("me/insights", params);
  const tv = j.data?.[0]?.total_value;
  const byType: Record<string, number> = {};
  for (const r of tv?.breakdowns?.[0]?.results ?? []) byType[r.dimension_values?.[0]] = r.value;
  return { total: n(tv?.value) ?? 0, byType };
}

async function mediaInsights(id: string, product: string): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  const metrics = product === "REELS" ? REEL_METRICS : BASIC_METRICS;
  try {
    const j = await igGet(`${id}/insights`, { metric: metrics });
    for (const d of j.data ?? []) out[d.name] = d.values?.[0]?.value;
  } catch {
    try {
      const j = await igGet(`${id}/insights`, { metric: BASIC_METRICS });
      for (const d of j.data ?? []) out[d.name] = d.values?.[0]?.value;
    } catch {
      /* media too new / unsupported — leave blank */
    }
  }
  return out;
}

// what the bot posted and when (the script behind each reel)
async function postedScripts(): Promise<{ ts: number; topic: string; script: string }[]> {
  try {
    return (await readFile(resolve(REPO_ROOT, "bot/data/interactions.jsonl"), "utf8"))
      .trim().split("\n").filter(Boolean)
      .map((l) => JSON.parse(l))
      .filter((e) => e.type === "post" && e.after)
      .map((e) => ({ ts: new Date(e.ts).getTime(), topic: e.topic, script: e.after }));
  } catch {
    return [];
  }
}

// how many comments on a tool reel actually asked for the link — the top of the DM funnel
async function countKeyword(mediaId: string): Promise<number | undefined> {
  const word = (process.env.DM_KEYWORD || "TOOL").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const kw = new RegExp(`\\b${word}\\b`, "i");
  try {
    return (await listComments(mediaId)).filter((c) => kw.test(c.text)).length;
  } catch {
    return undefined;
  }
}

async function dmFunnel() {
  try {
    const s = JSON.parse(await readFile(resolve(REPO_ROOT, "bot/data/dm-state.json"), "utf8"));
    return { dm1: s.stats?.dm1 ?? 0, dm2: s.stats?.dm2 ?? 0, nudges: s.stats?.nudges ?? 0 };
  } catch {
    return { dm1: 0, dm2: 0, nudges: 0 };
  }
}

export async function collect(): Promise<Snapshot> {
  const now = Date.now();
  const p = await igGet("me", { fields: "followers_count,follows_count,media_count" });

  const yesterday: Record<string, number> = {};
  for (const m of ["reach", "views", "accounts_engaged", "total_interactions", "likes", "comments", "shares", "saves", "profile_views", "profile_links_taps"]) {
    try {
      yesterday[m] = (await metricTotal(m, now - DAY, now)).total;
    } catch {
      /* metric unavailable for this account size — skip */
    }
  }

  const range = async (from: number, to: number) => {
    const v = await metricTotal("views", from, to, "follow_type").catch(() => ({ total: 0, byType: {} as Record<string, number> }));
    return { views: v.total, viewsFollower: v.byType.FOLLOWER ?? 0, viewsNonFollower: v.byType.NON_FOLLOWER ?? 0 };
  };
  const week = await range(now - 7 * DAY, now);
  const prev = await range(now - 14 * DAY, now - 7 * DAY);
  // Meta caps an insights range at 30 days; the month figure is 28 to stay clear of it
  const month = await range(now - 28 * DAY, now);

  const media = await igGet("me/media", { fields: "id,caption,timestamp,permalink,media_product_type,like_count,comments_count", limit: "30" });
  const rows = await allPosts().catch(() => []);
  const byMedia = new Map(rows.filter((r) => r.ig_media_id).map((r) => [r.ig_media_id!, r]));
  const scripts = await postedScripts();

  const reels: ReelStat[] = [];
  for (const m of media.data ?? []) {
    const ins = await mediaInsights(m.id, m.media_product_type);
    const t = new Date(m.timestamp).getTime();
    const row = byMedia.get(String(m.id));
    // the bot logs a post a few seconds after publishing — nearest one within 20 minutes
    const sc = scripts.filter((s) => Math.abs(s.ts - t) < 20 * 60_000).sort((a, b) => Math.abs(a.ts - t) - Math.abs(b.ts - t))[0];
    const caption = String(m.caption ?? "");
    reels.push({
      id: String(m.id),
      permalink: m.permalink,
      postedAt: m.timestamp,
      ageDays: Math.round(((now - t) / DAY) * 10) / 10,
      hourLocal: new Date(t).getHours(),
      kind: m.media_product_type,
      captionLine: caption.split("\n").map((l) => l.trim()).find((l) => l && !/^comment TOOL/i.test(l))?.slice(0, 140) ?? "",
      views: n(ins.views),
      reach: n(ins.reach),
      likes: n(ins.likes) ?? n(m.like_count),
      comments: n(ins.comments) ?? n(m.comments_count),
      shares: n(ins.shares),
      saved: n(ins.saved),
      interactions: n(ins.total_interactions),
      avgWatchS: n(ins.ig_reels_avg_watch_time) !== undefined ? Math.round(ins.ig_reels_avg_watch_time / 100) / 10 : undefined,
      skipRate: n(ins.reels_skip_rate),
      type: row?.type,
      title: row?.title,
      siteClicks: row?.clicks,
      toolComments: row?.type === "tool" && (n(m.comments_count) ?? 0) > 0 ? await countKeyword(String(m.id)) : row?.type === "tool" ? 0 : undefined,
      script: sc?.script,
      scriptWords: sc?.script ? sc.script.split(/\s+/).filter(Boolean).length : undefined,
    });
  }

  return {
    at: new Date(now).toISOString(),
    profile: { followers: p.followers_count ?? 0, following: p.follows_count ?? 0, posts: p.media_count ?? 0 },
    yesterday,
    week,
    prevWeek: { views: prev.views, viewsNonFollower: prev.viewsNonFollower },
    month: { views: month.views, viewsNonFollower: month.viewsNonFollower },
    reels,
    funnel: await dmFunnel(),
  };
}

async function history(): Promise<Snapshot[]> {
  try {
    return (await readFile(SNAPSHOTS, "utf8")).trim().split("\n").filter(Boolean).map((l) => JSON.parse(l));
  } catch {
    return [];
  }
}

async function lastReport(): Promise<string | undefined> {
  try {
    const { readdir } = await import("node:fs/promises");
    const files = (await readdir(REPORTS)).filter((f) => f.endsWith(".md")).sort();
    return files.length ? await readFile(resolve(REPORTS, files[files.length - 1]), "utf8") : undefined;
  } catch {
    return undefined;
  }
}

// Numbers the model shouldn't have to do arithmetic for.
function derive(s: Snapshot, past: Snapshot[]) {
  const prev = past[past.length - 1];
  const reels = s.reels.filter((r) => r.kind === "REELS" && r.views !== undefined);
  const median = (xs: number[]) => {
    const a = [...xs].sort((x, y) => x - y);
    return a.length ? (a.length % 2 ? a[(a.length - 1) / 2] : (a[a.length / 2 - 1] + a[a.length / 2]) / 2) : 0;
  };
  const rate = (a?: number, b?: number) => (a !== undefined && b ? Math.round((a / b) * 1000) / 10 : undefined);
  const perReel = reels.map((r) => ({
    ...r,
    engagementPct: rate(r.interactions, r.reach),
    sharePct: rate(r.shares, r.reach),
    savePct: rate(r.saved, r.reach),
  }));
  const byType = (t: string) => {
    const xs = perReel.filter((r) => r.type === t);
    return xs.length ? { count: xs.length, medianViews: median(xs.map((r) => r.views!)), medianSkip: median(xs.filter((r) => r.skipRate !== undefined).map((r) => r.skipRate!)) } : undefined;
  };
  const last5 = perReel.slice(0, 5).map((r) => r.views!);
  const prior = perReel.slice(5, 15).map((r) => r.views!);
  return {
    followersDelta: prev ? s.profile.followers - prev.profile.followers : undefined,
    daysSincePrevSnapshot: prev ? Math.round(((Date.parse(s.at) - Date.parse(prev.at)) / DAY) * 10) / 10 : undefined,
    nonFollowerShareWeekPct: rate(s.week.viewsNonFollower, s.week.views),
    nonFollowerSharePrevWeekPct: rate(s.prevWeek?.viewsNonFollower, s.prevWeek?.views),
    weekViewsChangePct: s.prevWeek?.views ? Math.round(((s.week.views - s.prevWeek.views) / s.prevWeek.views) * 1000) / 10 : undefined,
    medianViewsLast5: median(last5),
    medianViewsPrior10: median(prior),
    postsLast7Days: perReel.filter((r) => r.ageDays <= 7).length,
    tool: byType("tool"),
    news: byType("news"),
    perReel,
  };
}

const REPORT_BRIEF = `You are sahil's social media manager and data analyst. His page, @21stcentury.sahil, is a
young AI-tools / AI-news Instagram account (short talking-head reels with motion graphics, made by
an automated pipeline he approves in Telegram). Tool reels end "comment TOOL if you want access":
commenters get a DM with the link, which goes through his link-in-bio site. News reels have no CTA.
Growth levers on Instagram right now: shares per reach, watch time and the first-3-second skip
rate, saves, and consistent posting.

He reads this on his phone every morning. He wants it SHORT and ACTIONABLE, not an essay.

"report": plain text, at most ~8 short lines total:
  line 1: the numbers in one line (followers and change, yesterday's views, 7-day views vs the
          week before, newest reel's views + skip rate).
  then 2-4 lines starting "- " : what you NOTICED that matters, each with its number.
  then, only if there is one, 1 line starting "you: " : the single thing HE should do differently
  when recording or posting (not system changes — those are proposals).
  Say plainly when a sample is too small. Real numbers only. No section titles, no filler.

"proposals": 0 to 3 changes to the AUTOMATION the system can make itself if he approves —
  only when the data actually supports one, and never one he already denied or approved (see the
  history). Each: {"title": "a few words", "why": "the evidence in one line with numbers",
  "change": "exactly what will change, specific enough to apply as written", "target": one of:
  ${TARGET_HELP}}. Zero proposals is a fine answer.

"notes": 3 to 6 short lines for the TOPIC RESEARCHER (what topics/types/hooks perform, what to
  avoid), each starting "- ".

No em dashes or en dashes anywhere. Return ONLY JSON: {"report": "...", "proposals": [...], "notes": [...]}`;

export async function runAnalytics(): Promise<{ report: string; notes: string; proposals: Pick<Proposal, "title" | "why" | "change" | "target">[] }> {
  await mkdir(REPORTS, { recursive: true });
  const past = await history();
  const snap = await collect();
  await appendFile(SNAPSHOTS, JSON.stringify(snap) + "\n");
  const d = derive(snap, past);
  const prevReport = await lastReport();

  const data = {
    snapshotAt: snap.at,
    profile: snap.profile,
    yesterday: snap.yesterday,
    week: snap.week,
    prevWeek: snap.prevWeek,
    last28Days: snap.month,
    funnel: {
      ...snap.funnel,
      toolCommentsTotal: d.perReel.reduce((a, r) => a + (r.toolComments ?? 0), 0),
      siteClicksTotal: d.perReel.reduce((a, r) => a + (r.siteClicks ?? 0), 0),
      note: "dm1 = first DMs sent, dm2 = links delivered, nudges = 'follow first' replies; all-time counts since the autoresponder started",
    },
    derived: { ...d, perReel: undefined },
    reels: d.perReel.map((r) => ({
      posted: r.postedAt.slice(0, 16),
      ageDays: r.ageDays,
      hourLocal: r.hourLocal,
      type: r.type ?? "unknown",
      title: r.title ?? r.captionLine,
      views: r.views,
      reach: r.reach,
      likes: r.likes,
      comments: r.comments,
      shares: r.shares,
      saves: r.saved,
      engagementPct: r.engagementPct,
      skipRatePct: r.skipRate,
      avgWatchS: r.avgWatchS,
      scriptWords: r.scriptWords,
      siteClicks: r.siteClicks,
      toolComments: r.toolComments,
      hook: r.script?.split("\n")[0] ?? r.captionLine,
      link: r.permalink,
    })),
  };

  const asked = proposalHistory();
  const prompt = `${REPORT_BRIEF}

THE DATA (JSON, pulled just now from the Instagram API and this system's own records):
${JSON.stringify(data, null, 1)}
${prevReport ? `
YESTERDAY'S REPORT (say what moved, don't repeat it):
${prevReport.slice(0, 2500)}` : ""}
${asked ? `
PROPOSALS ALREADY SENT (status in brackets; never re-propose these):
${asked}` : ""}`;

  const out = await claudeJson<{ report?: string; proposals?: Proposal[]; notes?: string[] }>(prompt, { timeoutMs: 8 * 60_000 });
  const report = stripAiTells(String(out.report ?? "").trim());
  if (!report) throw new Error("analyst returned an empty report");
  const notes = (out.notes ?? []).map((l) => stripAiTells(String(l).trim())).filter((l) => l).map((l) => (l.startsWith("- ") ? l : `- ${l}`)).slice(0, 6).join("\n");
  const proposals = (out.proposals ?? [])
    .filter((p) => p && p.title && p.change && ["voice", "discovery", "design", "style"].includes(p.target))
    .slice(0, 3)
    .map((p) => ({ title: stripAiTells(p.title), why: stripAiTells(p.why ?? ""), change: stripAiTells(p.change), target: p.target }));
  const day = snap.at.slice(0, 10);
  await writeFile(resolve(REPORTS, `${day}.md`), report + "\n");
  if (notes) await writeFile(PERFORMANCE_NOTES, `# what's performing (from the ${day} analytics report)

${notes}
`);
  return { report, notes, proposals };
}

/** Telegram caps a message at 4096 chars — split on section breaks. */
export function chunkForTelegram(text: string, max = 3900): string[] {
  const out: string[] = [];
  let cur = "";
  for (const para of text.split(/\n(?=\n)/)) {
    if ((cur + para).length > max && cur) {
      out.push(cur.trim());
      cur = "";
    }
    cur += para;
  }
  if (cur.trim()) out.push(cur.trim());
  return out.flatMap((c) => (c.length <= max ? [c] : c.match(new RegExp(`[\\s\\S]{1,${max}}`, "g")) ?? []));
}
