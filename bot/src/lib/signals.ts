import { readFileSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { REPO_ROOT } from "../config.js";

// The SIGNAL PACK: before the researcher picks anything, pull what's actually moving right now
// from sources that don't need a login — the watchlist creators' latest YouTube uploads, the top
// posts of the day in the subreddits, brand-new GitHub repos gaining stars, Show HN and AI front-
// page stories. Sources are listed in DISCOVERY.md. This is what keeps discovery niche: the
// researcher starts from the community's actual chatter instead of from whatever a web search
// ranks highest (which is always the biggest names).
//
// Every fetcher is best-effort — a source that's down just drops out of the pack.

const DOC = resolve(REPO_ROOT, "DISCOVERY.md");
const CACHE = resolve(REPO_ROOT, "bot/data/signals.json");
const CACHE_MIN = 45;
const UA = "Mozilla/5.0 (compatible; autoreel-discovery/1.0)";

type Config = {
  creators: { name: string; youtube?: string }[];
  subreddits: string[];
  githubDays: number;
  githubMinStars: number;
  showHnMin: number;
  frontPageMin: number;
  counts: string; // "## what counts" verbatim
  skip: string; // "## skip" verbatim
};

function section(doc: string, heading: string): string {
  const lines = doc.split("\n");
  const start = lines.findIndex((l) => l.trim().toLowerCase() === `## ${heading}`);
  if (start < 0) return "";
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) if (lines[i].startsWith("## ")) { end = i; break; }
  return lines.slice(start + 1, end).join("\n").trim();
}

// "- Nate Herk | youtube: UC..." -> { name: "Nate Herk", youtube: "UC..." }
function bullets(body: string): { name: string; kv: Record<string, string> }[] {
  return body
    .split("\n")
    .filter((l) => /^-\s+\S/.test(l))
    .map((l) => {
      const [name, ...rest] = l.replace(/^-\s+/, "").split("|").map((x) => x.trim());
      const kv: Record<string, string> = {};
      for (const r of rest) {
        const m = r.match(/^([^:]+):\s*(.+)$/);
        if (m) kv[m[1].trim().toLowerCase()] = m[2].trim();
      }
      return { name, kv };
    });
}

export function discoveryConfig(): Config {
  let doc = "";
  try {
    doc = readFileSync(DOC, "utf8").replace(/\r\n/g, "\n");
  } catch {
    /* no file: defaults below */
  }
  const num = (rows: { name: string; kv: Record<string, string> }[], name: string, key: string, dflt: number) =>
    Number(rows.find((r) => r.name.toLowerCase() === name)?.kv[key]) || dflt;
  const gh = bullets(section(doc, "github"));
  const hn = bullets(section(doc, "hacker news"));
  return {
    creators: bullets(section(doc, "creators")).map((b) => ({ name: b.name, youtube: b.kv.youtube })),
    subreddits: bullets(section(doc, "subreddits")).map((b) => b.name.replace(/^r\//, "")),
    githubDays: num(gh, "window", "days", 45),
    githubMinStars: num(gh, "minimum", "stars", 150),
    showHnMin: num(hn, "show hn", "min points", 20),
    frontPageMin: num(hn, "front page ai stories", "min points", 100),
    counts: section(doc, "what counts"),
    skip: section(doc, "skip"),
  };
}

const decode = (s: string) =>
  s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
const tag = (xml: string, name: string) => decode(xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`))?.[1] ?? "");
const attr = (xml: string, name: string, a: string) => xml.match(new RegExp(`<${name}[^>]*\\s${a}="([^"]*)"`))?.[1] ?? "";
const entries = (xml: string) => xml.split("<entry>").slice(1);
const ago = (iso: string) => {
  const h = Math.round((Date.now() - new Date(iso).getTime()) / 3600_000);
  return h < 48 ? `${h}h ago` : `${Math.round(h / 24)}d ago`;
};
const compact = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}k` : String(n));

const AI_WORDS =
  /\b(ai|llms?|gpt\S*|claude\S*|anthropic|openai|gemini|agents?|agentic|mcp|models?|rag|diffusion|copilot|cursor|prompts?|prompting|inference|embeddings?|transformers?|fine-?tun\S*|open.?weights|neural|chatbots?|whisper|codex|deepseek|mistral|llama|qwen|fable|mythos|astra|automations?|n8n|vibe.?cod\S*|skills?|hugging.?face|elevenlabs|sora|veo)\b/i;

async function get(url: string): Promise<Response> {
  return fetch(url, { headers: { "user-agent": UA, accept: "*/*" }, signal: AbortSignal.timeout(15_000) });
}

async function youtube(c: Config): Promise<string[]> {
  const out: string[] = [];
  await Promise.all(
    c.creators.filter((x) => x.youtube).map(async (cr) => {
      try {
        const xml = await (await get(`https://www.youtube.com/feeds/videos.xml?channel_id=${cr.youtube}`)).text();
        let kept = 0;
        for (const e of entries(xml)) {
          const published = tag(e, "published");
          if (Date.now() - new Date(published).getTime() > 7 * 864e5 || kept >= 8) continue;
          // business/lifestyle creators post plenty that isn't AI — only the AI uploads are signal
          if (!AI_WORDS.test(`${tag(e, "title")} ${tag(e, "media:description").slice(0, 400)}`)) continue;
          kept++;
          const views = Number(attr(e, "media:statistics", "views")) || 0;
          const desc = tag(e, "media:description").split("\n").filter((l) => l.trim() && !/https?:\/\/|sponsor|%|code /i.test(l)).slice(0, 2).join(" ").slice(0, 220);
          out.push(`- [${cr.name}, ${ago(published)}, ${compact(views)} views] ${tag(e, "title")} — ${attr(e, "link", "href")}${desc ? `\n    ${desc}` : ""}`);
        }
      } catch {
        /* source down */
      }
    }),
  );
  return out;
}

async function reddit(c: Config): Promise<string[]> {
  const out: string[] = [];
  // one at a time with a pause — Reddit rate-limits a burst of parallel feed requests
  for (const sub of c.subreddits) {
    try {
      let res = await get(`https://www.reddit.com/r/${sub}/top/.rss?t=day&limit=8`);
      if (res.status === 429) {
        await new Promise((r) => setTimeout(r, 10_000)); // rate-limited — one patient retry
        res = await get(`https://www.reddit.com/r/${sub}/top/.rss?t=day&limit=8`);
      }
      if (!res.ok) continue;
      const xml = await res.text();
      entries(xml).slice(0, 8).forEach((e, i) => {
        out.push(`- [r/${sub} #${i + 1} today] ${tag(e, "title")} — ${attr(e, "link", "href")}`);
      });
    } catch {
      /* source down */
    }
    await new Promise((r) => setTimeout(r, 2500));
  }
  return out;
}

async function github(c: Config): Promise<string[]> {
  try {
    const since = new Date(Date.now() - c.githubDays * 864e5).toISOString().slice(0, 10);
    const headers: Record<string, string> = { "user-agent": UA, accept: "application/vnd.github+json" };
    if (process.env.GITHUB_TOKEN) headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    const r = await fetch(
      `https://api.github.com/search/repositories?q=${encodeURIComponent(`created:>${since} stars:>${c.githubMinStars}`)}&sort=stars&order=desc&per_page=80`,
      { headers, signal: AbortSignal.timeout(15_000) },
    );
    const j = (await r.json()) as { items?: any[] };
    return (j.items ?? [])
      .filter((x) => AI_WORDS.test(`${x.name} ${x.description ?? ""} ${(x.topics ?? []).join(" ")}`))
      .slice(0, 25)
      .map((x) => `- [GitHub, ${compact(x.stargazers_count)}★, created ${ago(x.created_at)}] ${x.full_name}: ${(x.description ?? "").slice(0, 160)} — ${x.html_url}`);
  } catch {
    return [];
  }
}

async function hackernews(c: Config): Promise<string[]> {
  const since = Math.floor(Date.now() / 1000) - 3 * 86400;
  const out: string[] = [];
  const hits = async (q: string) => ((await (await get(`https://hn.algolia.com/api/v1/search_by_date?${q}`)).json()) as { hits?: any[] }).hits ?? [];
  try {
    for (const h of await hits(`tags=show_hn&numericFilters=created_at_i>${since},points>=${c.showHnMin}&hitsPerPage=40`)) {
      if (!AI_WORDS.test(h.title ?? "")) continue;
      out.push(`- [Show HN, ${h.points} pts, ${h.num_comments} comments] ${h.title} — ${h.url || `https://news.ycombinator.com/item?id=${h.objectID}`}`);
    }
    for (const h of await hits(`tags=story&numericFilters=created_at_i>${since},points>=${c.frontPageMin}&hitsPerPage=80`)) {
      if (!AI_WORDS.test(h.title ?? "") || /^Show HN/i.test(h.title)) continue;
      out.push(`- [HN front page, ${h.points} pts, ${h.num_comments} comments] ${h.title} — https://news.ycombinator.com/item?id=${h.objectID}`);
    }
  } catch {
    /* source down */
  }
  return out.slice(0, 25);
}

/** Everything moving right now, as a compact text block for the research prompt. Cached ~45 min
 *  so a /discover right after the 3am run (or a burst of /idea) doesn't re-fetch everything. */
export async function signalPack(): Promise<string> {
  try {
    const c = JSON.parse(await readFile(CACHE, "utf8")) as { ts: string; text: string };
    if (Date.now() - new Date(c.ts).getTime() < CACHE_MIN * 60_000) return c.text;
  } catch {
    /* no cache */
  }
  const cfg = discoveryConfig();
  const [yt, rd, gh, hn] = await Promise.all([youtube(cfg), reddit(cfg), github(cfg), hackernews(cfg)]);
  const block = (title: string, lines: string[]) => (lines.length ? `### ${title}\n${lines.join("\n")}` : `### ${title}\n(nothing came back from this source today)`);
  const text = [
    block("watchlist creators — uploads in the last 7 days (what the community is watching)", yt),
    block("reddit — top posts of the day", rd),
    block("github — new repos gaining stars", gh),
    block("hacker news — last 3 days", hn),
  ].join("\n\n");
  try {
    await mkdir(resolve(REPO_ROOT, "bot/data"), { recursive: true });
    await writeFile(CACHE, JSON.stringify({ ts: new Date().toISOString(), text }));
  } catch {
    /* cache is optional */
  }
  console.log(`signals: ${yt.length} creator uploads · ${rd.length} reddit · ${gh.length} github · ${hn.length} hn`);
  return text;
}
