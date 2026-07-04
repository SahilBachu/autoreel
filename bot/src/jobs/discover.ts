import { appendFile, readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { claudeJson, claudeSession } from "../lib/claude.js";
import { scriptPrompt } from "../lib/voice.js";
import { topicBlock } from "../lib/learn.js";
import { REPO_ROOT, config } from "../config.js";

// STATION 0 — grounded topic discovery. The tomorrow: stack (topics.md) outranks research;
// the rest comes from an agentic Opus run with the last30days skill + WebSearch (real posts,
// real engagement, real links — no invented news). Produces 3 cards, each WITH a full script
// in the VOICE.md voice and a live session id so revisions resume with context.

export type Card = {
  n: number;
  topic: string;
  whyNow: string;
  links: string[];
  angle?: string;
  script: string;
  sessionId?: string;
};
export type Digest = { ts: string; cards: Card[] };

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

async function readPitchLog(days = 21): Promise<PitchEv[]> {
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

async function logPitch(topics: string[], ev: PitchEv["ev"]): Promise<void> {
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

// rotating hunting grounds so every morning doesn't hunt the same way
const LENSES = [
  "a launch/release from the last 48h",
  "a weird agent failure or AI screwup people are laughing at",
  "money: pricing changes, API costs, someone's insane bill, absurd funding",
  "GitHub trending: a repo/tool suddenly blowing up",
  "drama/beef between labs, or a spicy exec statement",
  "a niche dev tool or model most people haven't heard of yet",
  "benchmarks: a model quietly topping (or bombing) a leaderboard",
  "research: a paper with a wild claim making the rounds",
  "policy/legal: bans, lawsuits, regulation with real dev impact",
  "the vibe shift: something devs are all suddenly doing differently",
];
function pickLenses(n = 3): string[] {
  const pool = [...LENSES];
  const out: string[] = [];
  for (let i = 0; i < n && pool.length; i++) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  return out;
}

async function research(k: number, history: PitchEv[]): Promise<{ topic: string; whyNow: string; links: string[]; angle?: string }[]> {
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

Find the ${k} most reel-worthy stories for a dry, unserious tech creator (AI apps, frontier
models, dev tooling, agent chaos). Prioritize: what people are actually posting/arguing about,
launches, weird failures, spicy takes.${topicBlock()}
TODAY'S HUNTING GROUNDS (aim roughly one story per lens — this is how the picks stay fresh):
${pickLenses(Math.max(3, k)).map((l) => `- ${l}`).join("\n")}
${avoidBlock}
FRESHNESS RULE: at most ONE story may be the current mega-headline everyone is covering; the
rest must be things a daily AI-news reader hasn't already seen five times.
For each story VERIFY it's real (a source you actually fetched/searched — never from memory)
and return:
[{"topic":"short specific title","whyNow":"1-2 sentences, what happened + why people care",
  "links":["2-3 REAL urls you saw"],"angle":"the funny/dry angle for this creator"}]
Return ONLY the JSON array, exactly ${k} items.`;
  return claudeJson(prompt, {
    model: "opus",
    tools: ["Bash", "Read", "Glob", "Grep", "WebSearch", "WebFetch"],
    cwd: REPO_ROOT,
  });
}

export async function buildDigest(n = 3): Promise<Digest> {
  const stack = await popStack(n);
  const queued = stack.map((t) => ({ topic: t, whyNow: "queued by you (tomorrow: stack)", links: [] as string[], angle: undefined as string | undefined }));
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
  const raw = [...queued, ...fresh].slice(0, n);

  const cards: Card[] = [];
  for (let i = 0; i < raw.length; i++) {
    const r = raw[i];
    const { text, sessionId } = await claudeSession(scriptPrompt(r.topic, { angle: r.angle }), { model: "opus" });
    cards.push({ n: i + 1, topic: r.topic, whyNow: r.whyNow, links: r.links ?? [], angle: r.angle, script: text.trim(), sessionId });
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
        `${c.n}) ${c.topic}`,
        `why now: ${c.whyNow}`,
        c.links.length ? c.links.slice(0, 3).join("\n") : "",
        ``,
        c.script,
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
