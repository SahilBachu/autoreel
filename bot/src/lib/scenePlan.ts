import { claudeJson } from "./claude.js";
import { visualBlock } from "./learn.js";
import type { Word } from "./whisper.js";

// Mirrors studio/src/auto/AutoReel.tsx (brand v2). Every scene is PARAMETRIC — filled with the
// reel's REAL content. Full catalog with previews: COMPONENTS.md (repo root).
export type Scene = any;

// The art director. Designs a DENSE (~70%) sequence of full-screen scenes timed to the words,
// on the dark+accent design system, leaning HARD on real assets and product-grade UI.
export async function planCutaways(args: { topic: string; words: Word[]; editNote?: string }): Promise<Scene[]> {
  const { topic, words, editNote } = args;
  if (!words.length) return [];
  const totalMs = words[words.length - 1].endMs;
  const transcript = words.map((w) => `[${w.startMs}] ${w.text}`).join(" ");

  const prompt = `You are the ART DIRECTOR for a premium vertical (1080x1920) tech reel. The look is
dark, minimal, Vercel/Linear-grade — glassy panels, hairline borders, ONE bright accent color
(applied automatically; you don't pick colors). The bar is a top tech creator, not lyric-video
text cards. TOPIC: "${topic}". Reel length: ${totalMs} ms.
Word-timestamped TRANSCRIPT (ms in brackets): ${transcript}

Design a DENSE sequence of full-screen SCENES cutting over the talking head.

HARD RULES:
- Cover ~70% of 0–${totalMs}ms. Talking head shows only in short 1.2–2.2s gaps. Each scene
  1.8–3.6s, startMs/endMs on word boundaries, NO overlaps, ordered by startMs.
- LEAN ON RICH VISUALS: at least half the scenes from the visual/data/ui groups below —
  text-only kinds (headline/decrypt/callout/quote) capped at ~40%.
- When a real PRODUCT/COMPANY is named (Anthropic, OpenAI, Claude, Cursor, GitHub, Gemini,
  Google, Meta, Perplexity, Vercel, Notion, Figma...), SHOW it: logo / logowall / versus /
  browser / ascii — not just its name in text.
- On-screen NUMBERS must be REAL (stated in the script or true). No real number → no stat/
  donut/charts/statrow for it.
- browser/phone URLs must be real MARKETING/DOCS/GITHUB pages (https://anthropic.com,
  https://cursor.com, https://github.com/org/repo). NEVER app/login pages (claude.ai,
  chatgpt.com) — they hit bot-walls and get dropped.
- Open on a strong hook (headline, decrypt, logo or notifications). Keep ALL text short.
- Captions are added automatically — never include them.

SCENE KINDS
text:
- {"kind":"headline","text":"3-6 word hook","emphasis":"ONE word","kicker":"optional label"}
- {"kind":"decrypt","text":"short line that scramble-reveals","sub":"optional","kicker":"optional"}  (great hook/reveal)
- {"kind":"callout","text":"punchy line.","emphasis":"word"}
- {"kind":"quote","pre":"my Opus sub is now","boxed":"emotional support","post":""}
data (real numbers only):
- {"kind":"stat","value":"90%","label":"as good as Opus","kicker":"benchmarks"}  (giant counter)
- {"kind":"statrow","items":[{"value":"3x","label":"faster"},{"value":"$3","label":"per M tokens"}],"kicker":"optional"}
- {"kind":"linechart","title":"swe-bench over time","values":[40,55,72,90],"caption":"straight up"}
- {"kind":"barchart","title":"price / M tokens","unit":"$","rows":[{"label":"Opus","value":15},{"label":"Sonnet 5","value":3,"hero":true}]}
- {"kind":"donut","percent":90,"label":"as good as Opus","kicker":"benchmarks"}
- {"kind":"table","title":"the lineup","columns":["model","score","price"],"rows":[{"label":"Sonnet 5","values":["78%","$3"],"hero":true},{"label":"GPT-5","values":["72%","$10"]}]}
ui:
- {"kind":"bento","title":"what's new","cells":[{"title":"agentic for hours","sub":"no wandering"},{"title":"200k context","brand":"Anthropic"}]}  (first cell = biggest)
- {"kind":"calendar","month":"January","highlights":[2,3,4,9,10,11,16],"label":"shipping every week"}  (date/frequency beats)
- {"kind":"timeline","title":"how it went","steps":[{"title":"GPT-4 era","sub":"2023"},{"title":"now","sub":"agents everywhere"}]}
- {"kind":"chat","app":"claude","messages":[{"role":"user","text":"ship the feature"},{"role":"ai","text":"done. deployed to prod."}]}  (AI convo beats)
- {"kind":"notifications","items":[{"app":"Anthropic","title":"Sonnet 5 released","body":"3x faster","brand":"Anthropic"}]}  (news-drop beats, up to 3)
- {"kind":"checklist","title":"the gist","items":["faster","cheaper","smarter"]}
- {"kind":"kbd","keys":["⌘","K"],"label":"that's it. that's the feature."}
media (real assets):
- {"kind":"logo","name":"Claude","tagline":"Sonnet 5"}  (company WITH a logo; model names go in tagline)
- {"kind":"logowall","title":"everyone's on it","brands":["Cursor","GitHub","Perplexity","Vercel"]}
- {"kind":"versus","a":"Anthropic","b":"OpenAI","aNote":"$3 / M","bNote":"$15 / M"}  (a = the winner)
- {"kind":"browser","url":"https://cursor.com","label":"cursor.com"}  (REAL site screenshot)
- {"kind":"phone","url":"https://anthropic.com","label":"optional"}
- {"kind":"ascii","brand":"Claude","label":"optional"}  (logo/image dissolves into glowing ascii — 1 max, hero moment)
- {"kind":"terminal","title":"zsh","lines":["claude -p \\"ship it\\"","done in 4s"]}
- {"kind":"code","title":"agent.ts","lines":["const r = await claude.run(task)","// runs for hours"],"highlight":[1]}
- {"kind":"tweet","name":"a dev","handle":"handle","text":"realistic hot take","brand":"Anthropic"}

${editNote ? `IMPORTANT change requested: ${editNote}` : ""}
${visualBlock()}
Return ONLY a JSON array of scene objects.`;

  let scenes: Scene[] = [];
  try {
    const plan = await claudeJson<Scene[]>(prompt, { model: "opus" });
    if (Array.isArray(plan)) scenes = plan;
  } catch {
    /* fall through */
  }
  scenes = sanitize(scenes, totalMs);
  if (!scenes.length) scenes = [{ kind: "headline", startMs: 200, endMs: 2600, text: topic.split(" ").slice(0, 6).join(" ") }];
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
