// Instagram growth knowledge for the AI/ML/dev-tools niche — encoded from 2025–2026
// research (Mosseri statements, Buffer/Later/Sprout/Social Media Today). This drives the
// post-caption generator so reels are optimized for REACH without breaking the dry voice.
//
// The three load-bearing facts:
//  1. SENDS (DM shares) per reach is the #1 lever for reaching non-followers (~3–5× a like).
//     Dry, "this is so us / tag him" humor is natively send-optimized — the voice is an asset.
//  2. Hashtags are HARD-CAPPED at 5 (IG, Dec 2025, platform-enforced). They classify + feed
//     search; they do NOT buy reach. So keywords live in the CAPTION TEXT, not in tag spam.
//  3. Captions are indexed for IG search AND Google (since Jul 2025). Naming real tools/models
//     = free SEO. First line = the SEO title.

// Real, in-use hashtags grouped by size tier. Per post: 1 broad + 2 mid + 2 niche = 5 total.
export const HASHTAGS = {
  broad: [
    "ai", "artificialintelligence", "technology", "tech", "coding",
    "programming", "machinelearning", "datascience", "deeplearning", "techtok",
  ],
  mid: [
    "aitools", "generativeai", "genai", "llm", "aiagents", "chatgpt", "openai",
    "promptengineering", "automation", "devtools", "ainews", "futureofwork", "airevolution",
  ],
  niche: [
    "claudeai", "cursorai", "anthropic", "githubcopilot", "langchain", "huggingface",
    "ollama", "vibecoding", "aicoding", "opensourceai", "agenticai", "geminiai",
    "perplexityai", "mlops", "llama",
  ],
  community: [
    "buildinpublic", "100daysofcode", "techcreator", "devcommunity",
    "codinglife", "programmerhumor", "techhumor", "indiehacker",
  ],
} as const;

// Natural-language search phrases to weave into captions (SEO). What the audience searches.
export const KEYWORDS = [
  "AI coding agent", "vibe coding", "Claude Code", "open source LLM", "frontier model",
  "agentic AI", "AI tools", "prompt engineering", "local LLM", "context window", "Cursor",
  "GitHub Copilot", "AI pair programmer", "large language model", "generative AI", "RAG",
  "AI dev tools", "model benchmarks", "inference cost", "multimodal model", "reasoning model",
  "AI agents", "MCP", "open weights", "self-hosted AI", "AI automation", "LLM API", "AI news",
  "SOTA", "long-context coding",
];

// The caption strategy, distilled for the prompt. Growth WITHOUT selling out the voice.
export const CAPTION_STRATEGY = `
Instagram growth rules for this caption (2025–2026 algorithm — follow exactly):
- FIRST LINE = the hook AND the primary keyword. It's the SEO title (indexed by IG + Google)
  and the scroll-stopper. Lead with the real model/tool/company name (e.g. "Sonnet 5",
  "Claude Code", "Cursor"), wrapped in the funniest true line.
- NAME REAL THINGS. Use exact proper nouns and category terms people actually search
  (Claude Code, Cursor, open-source LLM, AI coding agent, frontier model, agentic AI). Specific
  nouns ARE the SEO — no salesy language needed.
- Weave 2–4 keywords across the body conversationally (a competing tool, the category, the
  model). Never keyword-stuff — it must read as a normal dry take.
- Include ONE deadpan factual "what it is" line (e.g. "new Claude model — faster, cheaper,
  scary good at long-context code"). Doubles as context for search.
- ENGINEER THE SEND, don't ask for it. End on a relatable-pain line or a hot take that begs to
  be DM'd to a coworker. Sends are the #1 reach lever. NO CTAs ("follow/like/comment/share"),
  no hype, no "this changes everything", no emoji-bait. Stay 100% deadpan.
- Keep it SHORT: 1–3 punchy lines + the factual line. Dry humor dies with length.
- Then a blank line, then EXACTLY 5 lowercase hashtags on one line: 1 broad + 2 mid + 2 niche,
  each genuinely relevant to THIS topic (pick from the provided bank; you may use a more
  specific real tag if the topic demands it). Never more than 5.
`.trim();

// pick n random from an array (variety across posts without repeating the same tags every time)
function sample<T>(arr: readonly T[], n: number): T[] {
  const pool = [...arr];
  const out: T[] = [];
  for (let i = 0; i < n && pool.length; i++) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  return out;
}

// A suggested tag palette to steer Claude (it still picks the most relevant for the topic).
export function hashtagPalette(): string {
  const broad = sample(HASHTAGS.broad, 3);
  const mid = sample(HASHTAGS.mid, 6);
  const niche = sample(HASHTAGS.niche, 8);
  return [
    `BROAD (pick 1): ${broad.map((t) => "#" + t).join(" ")}`,
    `MID (pick 2): ${mid.map((t) => "#" + t).join(" ")}`,
    `NICHE (pick 2, prefer the ones matching the actual tool/model in the reel): ${niche.map((t) => "#" + t).join(" ")}`,
  ].join("\n");
}
