import { readFile, writeFile, mkdir } from "node:fs/promises";
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

async function research(k: number): Promise<{ topic: string; whyNow: string; links: string[]; angle?: string }[]> {
  const prompt = `Research what the AI/dev world is talking about RIGHT NOW (last 24-48 hours).

You have real tools:
- The last30days skill at .claude/skills/last30days (read its SKILL.md; run its scripts with
  Bash — python3 + node are installed, X cookies are configured in ~/.config/last30days/.env).
- WebSearch / WebFetch for verification.

Find the ${k} most reel-worthy stories for a dry, unserious tech creator (AI apps, frontier
models, dev tooling, agent chaos). Prioritize: what people are actually posting/arguing about,
launches, weird failures, spicy takes.${topicBlock()}
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
  const found = need > 0 ? await research(need) : [];
  const raw = [...queued, ...found].slice(0, n);

  const cards: Card[] = [];
  for (let i = 0; i < raw.length; i++) {
    const r = raw[i];
    const { text, sessionId } = await claudeSession(scriptPrompt(r.topic, { angle: r.angle }), { model: "opus" });
    cards.push({ n: i + 1, topic: r.topic, whyNow: r.whyNow, links: r.links ?? [], angle: r.angle, script: text.trim(), sessionId });
  }
  const digest: Digest = { ts: new Date().toISOString(), cards };
  await mkdir(resolve(REPO_ROOT, "bot/data"), { recursive: true });
  await writeFile(DIGEST_PATH, JSON.stringify(digest, null, 2));
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
