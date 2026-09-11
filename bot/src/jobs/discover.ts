import { appendFile, readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { claudeJson, claudeSession } from "../lib/claude.js";
import { scriptPrompt, type PostType } from "../lib/voice.js";
import { topicBlock } from "../lib/learn.js";
import { REPO_ROOT, config } from "../config.js";

// STATION 0 — grounded topic discovery. The tomorrow: stack (topics.md) outranks research;
// the rest comes from an agentic Opus run with the last30days skill + WebSearch (real posts,
// real engagement, real links — no invented news). Produces 3 cards, each WITH a full script
// in the VOICE.md voice and a live session id so revisions resume with context.
//
// The page is repositioning toward TOOLS people can go use today, with news as a strong
// minority — so most lenses hunt for tools, every card is typed, and a tool card carries a
// real, fetched homepage URL (the website + DM autoresponder downstream depend on it).

// what research hands back for one story, before a script is written
export type Found = {
  topic: string;
  whyNow: string;
  links: string[];
  angle?: string;
  type: PostType;
  toolUrl?: string; // tool cards only — the homepage the researcher actually fetched
};

export type Card = Found & {
  n: number;
  script: string;
  sessionId?: string;
  // a queued (user-supplied) topic research could NOT verify — no script is written until
  // the user says "write it from my description anyway" (picking the card = saying so)
  unverified?: boolean;
};
export type Digest = { ts: string; cards: Card[] };

// the writer's toolset: the same web + repo access the researcher gets. Without this the
// script writer could never look anything up — it wrote from training data + pasted text.
export const WRITER_TOOLS = ["WebSearch", "WebFetch", "Bash", "Read", "Glob", "Grep"];

const DIGEST_PATH = resolve(REPO_ROOT, "bot/data/digest.json");

// pop up to n ideas off the top of topics.md (stack, newest first)
async function popStack(n: number): Promise<string[]> {
  try {
    const raw = await readFile(resolve(REPO_ROOT, "topics.md"), "utf8");
    const lines = raw.split("\n");
    const picked: string[] = [];
    const rest: string[] = [];
    for (const l of lines) {
      const m = l.match(/^-\s+(.+)/);
      if (m && picked.length < n) picked.push(m[1].trim());
      else rest.push(l);
    }
    if (picked.length) await writeFile(resolve(REPO_ROOT, "topics.md"), rest.join("\n"));
    return picked;
  } catch {
    return [];
  }
}

// ---- freshness: pitch history + variety lenses ---------------------------------
// Without memory the researcher re-pitches the same dominant stories every morning
// (a big launch stays "the news" for days). We log every pitched card, tell the next
// run what it already pitched (and what got picked vs ignored), rotate the hunting
// grounds, and mechanically drop near-duplicates it returns anyway.

const PITCH_LOG = resolve(REPO_ROOT, "bot/data/pitched.jsonl");
type PitchEv = { ts: string; topic: string; ev: "pitched" | "picked" };

export async function readPitchLog(days = 21): Promise<PitchEv[]> {
  try {
    const cutoff = Date.now() - days * 864e5;
    return (await readFile(PITCH_LOG, "utf8"))
      .trim().split("\n").filter(Boolean)
      .map((l) => JSON.parse(l) as PitchEv)
      .filter((p) => new Date(p.ts).getTime() > cutoff)
      .slice(-60);
  } catch {
    return [];
  }
}

export async function logPitch(topics: string[], ev: PitchEv["ev"]): Promise<void> {
  if (!topics.length) return;
  try {
    await mkdir(resolve(REPO_ROOT, "bot/data"), { recursive: true });
    const ts = new Date().toISOString();
    await appendFile(PITCH_LOG, topics.map((topic) => JSON.stringify({ ts, topic, ev })).join("\n") + "\n");
  } catch {
    /* best-effort */
  }
}

// called by the bot when a digest card is picked — picked topics are the strongest
// "this story is DONE, move on" signal for future research
export async function markPicked(topic: string): Promise<void> {
  await logPitch([topic], "picked");
}

const STOP = new Set(["the", "and", "for", "with", "from", "that", "this", "its", "has", "are", "was", "but", "not", "into", "over", "after", "just", "now", "new", "out", "off", "get", "gets", "got", "how", "why", "who", "say", "says", "said"]);
const topicTokens = (s: string) =>
  new Set(
    s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/)
      .map((w) => w.replace(/s$/, "")) // crude plural fold (prices/price)
      .filter((w) => (w.length >= 3 || /^\d+$/.test(w)) && !STOP.has(w)),
  );
function similarTopics(a: string, b: string): boolean {
  const A = topicTokens(a), B = topicTokens(b);
  if (A.size < 2 || B.size < 2) return false;
  let hit = 0;
  for (const t of A) if (B.has(t)) hit++;
  return hit / Math.min(A.size, B.size) >= 0.6;
}

// rotating hunting grounds so every morning doesn't hunt the same way. Weighted toward
// TOOLS (7) with news (3) as the minority — that's the page's new shape.
const LENSES = [
  "[tool] GitHub trending: a repo suddenly blowing up (stars jumping this week) that a dev could clone and use today",
  "[tool] Product Hunt: an AI tool launched in the last few days that people are actually upvoting and trying",
  "[tool] Show HN: a tool someone built and posted, with real discussion in the comments",
  "[tool] Hugging Face trending: a model/space people are downloading and running, not just talking about",
  "[tool] a tool circulating on X right now — people posting demos, 'this is insane', screenshots (use the last30days X lane)",
  "[tool] a niche tool that solves one real dev annoyance (a CLI, an extension, an agent add-on) most people haven't heard of",
  "[tool] a free/open-source alternative to a paid AI tool that just got good enough to switch to",
  "[news] a model release or big AI lab announcement from the last 48h",
  "[news] the big AI story everyone is arguing about right now — money, drama, policy, an outage",
  "[news] benchmarks: a model quietly topping (or bombing) a leaderboard, or a paper with a wild claim",
];
function pickLenses(n = 3): string[] {
  const pool = [...LENSES];
  const out: string[] = [];
  for (let i = 0; i < n && pool.length; i++) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  return out;
}

// What "verified" means for each card type. Shared by the morning research and the
// user-idea check so a tool URL is held to the same standard wherever it comes from.
const VERIFY_RULES = `For EVERY story: verify it's real via a source you actually fetched/searched — never from memory.
Set "type":
- "tool" = something a viewer can go use today (an app, repo, model, CLI, extension). A tool
  card MUST include "toolUrl": the tool's real homepage (or its GitHub repo if that IS the
  home). You must WebFetch that exact URL and see the tool's own page load before returning
  it — a website and a DM autoresponder send people there, so a guessed/dead/redirected URL
  is worse than no card. Prefer the canonical home (docs/landing) over a tweet or a blog post.
- "news" = a release, result, story or argument. No toolUrl.`;

export async function research(k: number, history: PitchEv[]): Promise<Found[]> {
  const picked = new Set(history.filter((h) => h.ev === "picked").map((h) => h.topic));
  const seen = [...new Map(history.filter((h) => h.ev === "pitched").map((h) => [h.topic, h])).values()];
  const avoidBlock = seen.length
    ? `\nALREADY PITCHED TO HIM RECENTLY — do NOT return these stories or near-duplicates of
them. Only revisit one if something genuinely NEW happened since, and the whyNow must lead
with what's new:\n${seen.map((p) => `- ${p.topic}${picked.has(p.topic) ? " (he already made a reel on this — story is DONE)" : ""}`).join("\n")}\n`
    : "";
  const prompt = `Today is ${new Date().toDateString()}. Research what the AI/dev world is talking
about RIGHT NOW (last 24-48 hours).

You have real tools:
- The last30days skill at .claude/skills/last30days (read its SKILL.md; run its scripts with
  Bash — python3 + node are installed, X cookies are configured in ~/.config/last30days/.env).
- WebSearch / WebFetch for verification.

Find the ${k} most reel-worthy stories for a tech creator whose page is about AI TOOLS people
can actually go use (apps, repos, models, CLIs, agent add-ons), with AI news/breakthroughs as
the strong minority. Prioritize: tools people are actually posting demos of, trying and
arguing about; launches; things that solve a real dev annoyance.${topicBlock()}
TODAY'S HUNTING GROUNDS (aim roughly one story per lens — the [tool]/[news] tag is the card
type — this is how the picks stay fresh):
${pickLenses(Math.max(3, k)).map((l) => `- ${l}`).join("\n")}
${avoidBlock}
FRESHNESS RULE: at most ONE story may be the current mega-headline everyone is covering; the
rest must be things a daily AI-news reader hasn't already seen five times.
${VERIFY_RULES}
Return:
[{"topic":"short specific title","type":"tool"|"news","toolUrl":"https://... (tool only)",
  "whyNow":"1-2 sentences, what it is/what happened + why people care",
  "links":["2-3 REAL urls you saw"],"angle":"the hook for this creator — the one line that makes a viewer stop"}]
Return ONLY the JSON array, exactly ${k} items.`;
  const found = await claudeJson<Found[]>(prompt, {
    model: "opus",
    tools: WRITER_TOOLS,
    cwd: REPO_ROOT,
  });
  // a "tool" with no URL is a broken promise downstream — demote it rather than ship it
  return (Array.isArray(found) ? found : []).map(normalizeFound);
}

function normalizeFound(f: Found): Found {
  const toolUrl = f.toolUrl?.trim();
  if (f.type === "tool" && !/^https?:\/\//.test(toolUrl ?? "")) {
    console.error(`discovery: tool card "${f.topic}" came back without a real toolUrl — demoting to news`);
    return { ...f, type: "news", toolUrl: undefined, links: f.links ?? [] };
  }
  return { ...f, type: f.type === "tool" ? "tool" : "news", toolUrl: f.type === "tool" ? toolUrl : undefined, links: f.links ?? [] };
}

// A topic the USER supplied (tomorrow: stack, idea: <desc>) gets the same research as a
// discovered one — focused on that topic instead of hunting. The important part is the
// honest "no" path: if nothing solid turns up we say so instead of writing a script that
// fills the gap with invented facts.
export async function verifyTopic(description: string): Promise<{ found: true; card: Found } | { found: false; note: string }> {
  const prompt = `Today is ${new Date().toDateString()}. Sahil wants to make a reel about this, in his words:
"${description}"

You have real tools:
- The last30days skill at .claude/skills/last30days (read its SKILL.md; run its scripts with
  Bash — python3 + node are installed, X cookies are configured in ~/.config/last30days/.env).
- WebSearch / WebFetch for verification.

Research it: what is this actually, is it real and current, what are people saying, what's
the concrete detail (price, what it does, who made it, the number). Search under a few
phrasings — he may have the name slightly wrong.
${VERIFY_RULES}
BE HONEST. If you cannot find solid sources for what he's describing — it doesn't exist, it's
a rumour, the name matches nothing, or you only find vague mentions — return
{"found":false,"note":"one line: what you searched and what you did/didn't find"}.
Do NOT stretch a weak match into a story. A "found":false is a fine answer.
Otherwise return:
{"found":true,"topic":"short specific title (keep his framing)","type":"tool"|"news",
  "toolUrl":"https://... (tool only)","whyNow":"1-2 sentences, what it is + why now",
  "links":["2-3 REAL urls you saw"],"angle":"the hook — his framing, sharpened by what you found"}
Return ONLY the JSON object.`;
  const r = await claudeJson<({ found: true } & Found) | { found: false; note?: string }>(prompt, {
    model: "opus",
    tools: WRITER_TOOLS,
    cwd: REPO_ROOT,
  });
  if (!r || r.found !== true || !r.topic) return { found: false, note: (r as { note?: string })?.note?.trim() || "no sources found" };
  const { found: _f, ...rest } = r;
  return { found: true, card: normalizeFound(rest) };
}

// research context handed to the writer — the ground truth it must not stray from
export function foundContext(f: Found): string {
  return [f.whyNow, ...(f.links ?? []).slice(0, 3)].filter(Boolean).join("\n");
}

export async function buildDigest(n = 3): Promise<Digest> {
  const stack = await popStack(n);
  // queued topics used to be stamped "queued by you" with no links and no research — so a
  // pitched idea was never checked. Now they get verified like everything else.
  const queued: (Found & { unverified?: boolean })[] = [];
  for (const t of stack) {
    try {
      const v = await verifyTopic(t);
      queued.push(
        v.found
          ? { ...v.card, whyNow: `queued by you — ${v.card.whyNow}` }
          : { topic: t, type: "news", links: [], unverified: true, whyNow: `queued by you — couldn't verify this: ${v.note}` },
      );
    } catch (e) {
      console.error("verify of queued topic failed:", (e as Error).message?.slice(0, 200));
      queued.push({ topic: t, type: "news", links: [], unverified: true, whyNow: "queued by you — research failed, couldn't verify" });
    }
  }
  const need = n - queued.length;
  const history = await readPitchLog();
  const found = need > 0 ? await research(need, history) : [];

  // mechanical near-dup guard — the model sometimes repeats itself despite the avoid list
  const fresh: typeof found = [];
  const isStale = (topic: string) =>
    history.some((p) => similarTopics(p.topic, topic)) ||
    queued.some((q) => similarTopics(q.topic, topic)) ||
    fresh.some((x) => similarTopics(x.topic, topic));
  for (const r of found) {
    if (r?.topic && !isStale(r.topic)) fresh.push(r);
    else console.error(`discovery: dropped stale/duplicate card "${r?.topic}"`);
  }
  // one top-up round if the filter cost us cards
  if (need > 0 && fresh.length < need) {
    try {
      const more = await research(
        need - fresh.length,
        [...history, ...fresh.map((f) => ({ ts: new Date().toISOString(), topic: f.topic, ev: "pitched" as const }))],
      );
      for (const r of more) if (fresh.length < need && r?.topic && !isStale(r.topic)) fresh.push(r);
    } catch (e) {
      console.error("discovery top-up failed:", (e as Error).message?.slice(0, 200));
    }
  }
  const raw: (Found & { unverified?: boolean })[] = [...queued, ...fresh].slice(0, n);

  const cards: Card[] = [];
  for (let i = 0; i < raw.length; i++) {
    const r = raw[i];
    // unverified = no script. Picking the card later writes one from the description alone.
    if (r.unverified) {
      cards.push({ ...r, n: i + 1, script: "" });
      continue;
    }
    const { text, sessionId } = await claudeSession(
      scriptPrompt(r.topic, { angle: r.angle, type: r.type, toolUrl: r.toolUrl, context: foundContext(r) }),
      { model: "opus", tools: WRITER_TOOLS, cwd: REPO_ROOT },
    );
    cards.push({ ...r, n: i + 1, script: text.trim(), sessionId });
  }
  const digest: Digest = { ts: new Date().toISOString(), cards };
  await mkdir(resolve(REPO_ROOT, "bot/data"), { recursive: true });
  await writeFile(DIGEST_PATH, JSON.stringify(digest, null, 2));
  await logPitch(cards.map((c) => c.topic), "pitched"); // tomorrow's run must not re-pitch these
  return digest;
}

export async function loadDigest(maxAgeHours = 36): Promise<Digest | null> {
  try {
    const d: Digest = JSON.parse(await readFile(DIGEST_PATH, "utf8"));
    if (Date.now() - new Date(d.ts).getTime() > maxAgeHours * 3600_000) return null;
    return d;
  } catch {
    return null;
  }
}

export function formatDigest(d: Digest): string {
  const parts = [`morning drop — reply 1, 2 or 3 to pick (or "2 but shorter hook"). anything else works too.`];
  for (const c of d.cards) {
    parts.push(
      [
        `${c.n}) [${c.type ?? "news"}] ${c.topic}`, // pre-typing digests on disk have no type
        c.type === "tool" ? `tool: ${c.toolUrl ?? "(no url — check before posting)"}` : "",
        `why now: ${c.whyNow}`,
        c.links.length ? c.links.slice(0, 3).join("\n") : "",
        ``,
        c.unverified
          ? `no script yet — no sources found for this. reply ${c.n} and I'll write it from your description alone (nothing invented), or push a clearer version with tomorrow:`
          : c.script,
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }
  return parts.join("\n\n————————\n\n").slice(0, 4000);
}

// send a plain message through the local bot api (used by the 3am timer, outside grammy)
export async function sendToChat(text: string): Promise<void> {
  const url = `${config.telegram.apiRoot}/bot${config.telegram.token}/sendMessage`;
  await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: config.telegram.chatId, text }),
  });
}
