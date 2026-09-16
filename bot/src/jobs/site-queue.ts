import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { REPO_ROOT } from "../config.js";
import type { Pending } from "../state.js";
import { writeSiteCopy } from "../lib/article.js";
import { insertPost, postUrl, slugify } from "../lib/posts.js";
import { sendToChat } from "./discover.js";

// Writing the site row is the one step that happens AFTER the reel is already public, so a
// failure here is uniquely annoying: the reel is live, the site is missing it, and the moment
// has passed. It fails for boring reasons — the writer CLI hiccups, Supabase times out, the
// runner's wifi drops — so it retries itself instead of asking sahil to notice.
//
// Three attempts inline (the [Post] status message is still on screen), then the job goes on a
// disk queue that drains on a timer and survives a bot restart. Permanent errors (a bad key, a
// constraint) aren't retried — they'd just fail 12 more times.

export type SiteJob = { p: Pending; mediaId: string; permalink: string; at: string; tries: number; nextAt: string; lastError?: string };

const QUEUE = resolve(REPO_ROOT, "bot/data/site-queue.json");
// backoff between queue attempts — roughly a minute, then hours, giving up after ~16h
const BACKOFF_MIN = [1, 5, 15, 30, 60, 120, 240, 480];

function load(): SiteJob[] {
  try {
    return JSON.parse(readFileSync(QUEUE, "utf8")) as SiteJob[];
  } catch {
    return [];
  }
}
function save(jobs: SiteJob[]) {
  try {
    if (!existsSync(resolve(REPO_ROOT, "bot/data"))) mkdirSync(resolve(REPO_ROOT, "bot/data"), { recursive: true });
    writeFileSync(QUEUE, JSON.stringify(jobs, null, 2));
  } catch (e) {
    console.error("site queue persist failed", e);
  }
}

/** A row that will never insert no matter how often we try: a rejected key, a violated
 *  constraint, malformed data. Anything else (timeouts, 5xx, rate limits, a flaky CLI) is worth
 *  another go. */
function permanent(message: string): boolean {
  return /\b(401|403|42501|row-level security|violates check constraint|invalid input syntax)\b/i.test(message);
}

/** One attempt: write the site copy, insert the row, return the public URL. */
export async function publishToSite(p: Pending, mediaId: string, permalink: string): Promise<string> {
  const type = p.postType === "tool" && p.toolUrl ? "tool" : "news";
  const copy = await writeSiteCopy({ topic: p.topic, script: p.script, type, toolUrl: p.toolUrl, context: p.context });
  const row = await insertPost({
    slug: slugify(copy.title),
    type,
    title: copy.title,
    blurb: copy.blurb,
    tool_url: type === "tool" ? p.toolUrl : undefined,
    article: copy.article,
    script: p.script,
    ig_media_id: mediaId,
    ig_permalink: permalink,
  });
  const url = postUrl(row.slug, type);
  if (type === "news" && copy.article) {
    await sendToChat(`article for the site (${url}):\n\n${copy.title}\n\n${copy.article}`.slice(0, 4000)).catch(() => {});
  }
  return url;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Try now, a couple more times if it's worth retrying, and queue it for later if not. */
export async function publishWithRetry(
  p: Pending,
  mediaId: string,
  permalink: string,
  onNote?: (note: string) => void,
): Promise<{ url?: string; error?: string; queued?: boolean }> {
  const inlineWaits = [0, 20_000, 60_000];
  let last = "";
  for (let i = 0; i < inlineWaits.length; i++) {
    if (inlineWaits[i]) {
      onNote?.(`site step failed (${last.slice(0, 80)}) — retrying in ${inlineWaits[i] / 1000}s`);
      await sleep(inlineWaits[i]);
    }
    try {
      return { url: await publishToSite(p, mediaId, permalink) };
    } catch (e: any) {
      last = String(e.message ?? e);
      console.error(`site publish attempt ${i + 1} failed:`, last);
      if (permanent(last)) return { error: last }; // more attempts won't help
    }
  }
  const jobs = load().filter((j) => j.mediaId !== mediaId);
  jobs.push({ p, mediaId, permalink, at: new Date().toISOString(), tries: inlineWaits.length, nextAt: new Date(Date.now() + BACKOFF_MIN[0] * 60_000).toISOString(), lastError: last });
  save(jobs);
  return { error: last, queued: true };
}

/** Drain whatever is due. Called on a timer and shortly after boot. */
export async function drainSiteQueue(force = false): Promise<void> {
  const jobs = load();
  if (!jobs.length) return;
  const keep: SiteJob[] = [];
  for (const j of jobs) {
    if (!force && new Date(j.nextAt).getTime() > Date.now()) {
      keep.push(j);
      continue;
    }
    try {
      const url = await publishToSite(j.p, j.mediaId, j.permalink);
      console.log(`site queue: "${j.p.topic}" landed after ${j.tries + 1} tries`);
      await sendToChat(`added "${j.p.topic}" to the site after all: ${url}`).catch(() => {});
    } catch (e: any) {
      const msg = String(e.message ?? e);
      j.tries++;
      j.lastError = msg;
      const wait = BACKOFF_MIN[Math.min(j.tries - 3, BACKOFF_MIN.length - 1)] ?? 480;
      if (permanent(msg) || j.tries >= BACKOFF_MIN.length + 3) {
        console.error(`site queue: giving up on "${j.p.topic}":`, msg);
        await sendToChat(
          `gave up adding "${j.p.topic}" to the site after ${j.tries} tries.\nlast error: ${msg.slice(0, 200)}\nthe reel is live; /retrysite once it's fixed.`,
        ).catch(() => {});
        continue; // dropped from the queue
      }
      j.nextAt = new Date(Date.now() + wait * 60_000).toISOString();
      console.error(`site queue: "${j.p.topic}" failed (try ${j.tries}), next in ${wait}m:`, msg.slice(0, 120));
      keep.push(j);
    }
  }
  save(keep);
}

export function pendingSiteJobs(): SiteJob[] {
  return load();
}

let timer: NodeJS.Timeout | undefined;
export function startSiteQueue(): void {
  if (timer) return;
  const run = () => drainSiteQueue().catch((e) => console.error("site queue:", e.message));
  setTimeout(run, 60_000); // let the bot settle first — a queued job may be from before a restart
  timer = setInterval(run, 10 * 60_000);
}
