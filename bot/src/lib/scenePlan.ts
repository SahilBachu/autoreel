import { claudeJson } from "./claude.js";
import { visualBlock } from "./learn.js";
import type { Word } from "./whisper.js";

// Mirrors studio/src/auto/AutoReel.tsx Scene type. Every scene is PARAMETRIC and filled with
// the reel's REAL content. The visual-heavy kinds (logo/logowall/versus/charts/tweet/phone/
// screenshot) should carry most of the reel — plain text is the fallback, not the default.
export type Bg = "paper" | "cream" | "dark" | "warm";
export type Scene = any; // union enforced on the studio side; kept loose here for flexibility

// The art director. Designs a DENSE (~70%) sequence of full-screen scenes timed to the words,
// leaning HARD on real assets (brand logos, screenshots, charts) over text. Safe fallback.
export async function planCutaways(args: { topic: string; words: Word[]; editNote?: string }): Promise<Scene[]> {
  const { topic, words, editNote } = args;
  if (!words.length) return [];
  const totalMs = words[words.length - 1].endMs;
  const transcript = words.map((w) => `[${w.startMs}] ${w.text}`).join(" ");

  const prompt = `You are the ART DIRECTOR for a premium vertical (1080x1920) tech reel — the bar
is a top Instagram tech creator (real logos, screenshots, charts, slick motion), NOT lyric-video
text cards. TOPIC: "${topic}". The reel is ${totalMs} ms long.
Word-timestamped TRANSCRIPT (ms in brackets): ${transcript}

Design a DENSE sequence of full-screen SCENES that cut over the talking head.

HARD RULES:
- Cover ~70% of the 0–${totalMs}ms timeline. Talking head shows only ~30%, in short 1.2–2.2s
  gaps between scenes. Each scene 1.8–3.6s, startMs/endMs on word boundaries, NO overlaps, in order.
- LEAN ON REAL ASSETS. At least HALF the scenes must be visual (logo, logowall, versus,
  screenshot, phone, linechart, barchart, donut, statgrid, tweet). Use plain-text kinds
  (headline/quote/callout/points) for at most ~40% of scenes.
- Whenever a real PRODUCT/COMPANY is named (Anthropic, OpenAI, Claude, Cursor, GitHub, Gemini,
  Google, Meta, Llama, Perplexity, Ollama, Vercel, Notion, Figma, etc.), show its LOGO
  (logo/logowall/versus) or a SCREENSHOT of its site — don't just write the name.
- LOGO/LOGOWALL/VERSUS only work with real BRAND names that have a logo (the companies above +
  "Claude"). A MODEL name (Sonnet 5, Opus, GPT-5) has NO logo — for the opener use the company
  logo with the model as the tagline (e.g. {"kind":"logo","name":"Claude","tagline":"Sonnet 5"}),
  and for model number comparisons use compare/barchart/statgrid/donut, NOT versus.
- SCREENSHOTS: give a real MARKETING, DOCS, or GITHUB url (https://anthropic.com,
  https://cursor.com, https://github.com/<org>/<repo>, a docs/pricing page). NEVER an app/login
  page (claude.ai, chatgpt.com) — those show a bot-check page and get dropped.
- On-screen NUMBERS must be REAL (stated in the script or true). If you don't have a real number,
  don't use stat/donut/charts for it.
- Vary the background across scenes (never same bg twice in a row): "paper", "cream", "dark",
  "warm" (terracotta). Open on a strong logo or headline hook.
- Do NOT include captions — captions are added automatically from the audio.

SCENE KINDS (use a rich mix, favor the visual ones):
- {"kind":"logo","name":"Claude","tagline":"Sonnet 5","bg":"dark"}  (real brand logo + name; use a company that HAS a logo, model as tagline)
- {"kind":"logowall","title":"everyone's adding it","brands":["Cursor","GitHub","Perplexity","Vercel","OpenAI"],"bg":"dark"}  (grid of REAL company logos)
- {"kind":"versus","a":"Anthropic","b":"OpenAI","aNote":"$3 / M","bNote":"$15 / M","bg":"paper"}  (two real company logos head-to-head)
- {"kind":"screenshot","url":"https://cursor.com","label":"cursor.com","bg":"dark"}  (REAL screenshot — use a marketing/docs/github URL, NOT an app login)
- {"kind":"phone","url":"https://cursor.com","label":"the site","bg":"warm"}  (marketing/docs screenshot in a phone frame)
- {"kind":"linechart","title":"benchmark over time","values":[40,55,72,90],"caption":"straight up","bg":"dark"}  (animated trend)
- {"kind":"barchart","title":"SWE-bench %","unit":"%","rows":[{"label":"Opus","value":72},{"label":"Sonnet 5","value":78,"highlight":true}],"bg":"paper"}
- {"kind":"donut","percent":90,"label":"as good as Opus","kicker":"benchmarks","bg":"dark"}  (a single % ring)
- {"kind":"statgrid","items":[{"value":"3×","label":"faster"},{"value":"$3","label":"per M tokens"},{"value":"200k","label":"context"}],"bg":"dark"}  (2-3 real stats)
- {"kind":"stat","value":"90%","sub":"as good as Opus","kicker":"ON BENCHMARKS","bg":"dark"}  (one giant counting number)
- {"kind":"compare","title":"price / M tokens","unit":"$","rows":[{"label":"Opus","value":15},{"label":"Sonnet 5","value":3,"highlight":true}],"bg":"paper"}
- {"kind":"terminal","title":"zsh","lines":["claude -p \\"ship it\\"","done in 4s"],"bg":"warm"}  (types itself out)
- {"kind":"tweet","name":"a dev","handle":"handle","text":"a real-sounding hot take about it","brand":"Anthropic","bg":"dark"}  (X post card)
- {"kind":"features","title":"what's new","items":[{"label":"long-context code","brand":"Anthropic"},{"label":"agentic tasks"}],"bg":"cream"}  (2-4 feature cards)
- {"kind":"headline","text":"3-6 word hook","emphasis":"ONE word","bg":"paper"}
- {"kind":"quote","pre":"my Opus sub is now","boxed":"emotional support","bg":"paper"}
- {"kind":"callout","text":"anyway. moving on.","bg":"warm"}
- {"kind":"points","title":"the gist","items":["faster","cheaper"],"bg":"cream"}

${editNote ? `IMPORTANT change requested: ${editNote}` : ""}
${visualBlock()}
Return ONLY a JSON array of scene objects.`;

  let scenes: Scene[] = [];
  try {
    const plan = await claudeJson<Scene[]>(prompt);
    if (Array.isArray(plan)) scenes = plan;
  } catch {
    /* fall through */
  }
  scenes = sanitize(scenes, totalMs);
  if (!scenes.length) scenes = [{ kind: "headline", startMs: 200, endMs: 2600, text: topic.split(" ").slice(0, 6).join(" "), bg: "paper" }];
  return scenes;
}

function sanitize(scenes: Scene[], totalMs: number): Scene[] {
  const ok = scenes
    .filter((s) => s && typeof s.startMs === "number" && typeof s.endMs === "number" && s.endMs > s.startMs)
    .map((s) => ({ ...s, startMs: Math.max(0, Math.round(s.startMs)), endMs: Math.min(totalMs, Math.round(s.endMs)) }))
    .filter((s) => s.endMs - s.startMs >= 800)
    .sort((a, b) => a.startMs - b.startMs);
  const out: Scene[] = [];
  let lastEnd = -1;
  for (const s of ok) {
    if (s.startMs < lastEnd) s.startMs = lastEnd;
    if (s.endMs - s.startMs < 800) continue;
    out.push(s);
    lastEnd = s.endMs;
  }
  return out;
}
