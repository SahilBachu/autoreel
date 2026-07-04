import { claudeJson } from "./claude.js";
import { visualBlock } from "./learn.js";
import type { Word } from "./whisper.js";

// Mirrors studio/src/auto/AutoReel.tsx (brand v2). Every scene is PARAMETRIC — filled with the
// reel's REAL content. Full catalog with previews: COMPONENTS.md (repo root).
export type Scene = any;

export type Beat = { startMs: number; endMs: number; type: string; gist: string };
export type AudioLib = {
  music: { file: string; tags?: string[]; use?: string }[];
  sfx: { file: string; tags?: string[]; use?: string }[];
};
export type Plan = {
  accent?: string;
  music?: string; // director-picked bed (validated against the library by the caller)
  sfx?: { file: string; atMs: number }[]; // director-placed emphasis sounds
  scenes: Scene[];
  beats?: Beat[]; // stage-1 narrative segmentation (kept for the plan audit file)
};

const TEXT_KINDS = ["headline", "decrypt", "callout", "quote"];

// Required props per scene kind. A scene missing one renders blank (or crashes the component),
// so it's a lint violation for the repair round AND a hard drop in sanitize (final net).
const KIND_FIELDS: Record<string, string[]> = {
  headline: ["text"], decrypt: ["text"], callout: ["text"], quote: ["boxed"],
  stat: ["value"], statrow: ["items"], linechart: ["values"], barchart: ["rows"],
  donut: ["percent"], table: ["columns", "rows"], bento: ["cells"],
  calendar: ["month", "highlights"], timeline: ["steps"], chat: ["messages"],
  notifications: ["items"], checklist: ["items"], kbd: ["keys"], tweet: ["text"],
  terminal: ["lines"], code: ["lines"], logo: ["name"], logowall: ["brands"],
  versus: ["a", "b"], browser: ["url"], screenshot: ["url"], phone: ["url"],
  ascii: [], custom: ["name", "spec"],
  // app-ui group (v2-apps.tsx)
  command: ["query", "results"], diff: ["lines"], pricing: ["tiers"],
  leaderboard: ["rows"], progress: ["label", "percent"], toggles: ["items"],
  dashboard: ["cards"], search: ["query"], receipt: ["items"], waveform: [],
  inbox: ["items"], poll: ["options"], ticker: ["rows"], kanban: ["columns"],
  prompt: ["text"], rating: ["name", "rating"],
};

function missingFields(s: Scene): string[] {
  const req = KIND_FIELDS[s.kind] ?? [];
  return req.filter((f) => {
    const v = s[f];
    return v === undefined || v === null || v === "" || (Array.isArray(v) && !v.length);
  });
}

// ── STAGE 1: narrative beats ─────────────────────────────────────────────────
// Segment the transcript into story units first, so the scene pass maps visuals to
// narrative structure instead of doing rhythm analysis + design in one shot.
async function planBeats(topic: string, words: Word[]): Promise<Beat[] | undefined> {
  const totalMs = words[words.length - 1].endMs;
  const transcript = words.map((w) => `[${w.startMs}] ${w.text}`).join(" ");
  const prompt = `Segment the transcript of a ${totalMs}ms vertical tech reel into NARRATIVE BEATS,
so an art director can time cutaways to the story. TOPIC: "${topic}".
Word-timestamped transcript (ms in brackets): ${transcript}

Split into 4-9 beats. Each beat is ONE narrative unit — type is one of:
hook | setup | claim | evidence | aside | punchline.
Boundaries on word starts, covering the whole reel, no overlaps, in order.
Return ONLY JSON: [{"startMs":0,"endMs":2100,"type":"hook","gist":"3-6 words"}]`;
  try {
    const beats = await claudeJson<Beat[]>(prompt, { model: "opus" });
    const ok = (Array.isArray(beats) ? beats : []).filter(
      (b) => typeof b.startMs === "number" && typeof b.endMs === "number" && b.endMs > b.startMs && b.gist,
    );
    return ok.length >= 3 ? ok : undefined;
  } catch (e) {
    console.error("beat pass failed — directing without beats:", (e as Error).message?.slice(0, 200));
    return undefined;
  }
}

// ── the lint pass ────────────────────────────────────────────────────────────
// The prompt's HARD RULES, enforced mechanically. Violations go back to the director for
// ONE repair round (so the rules actually hold); sanitize() stays as the silent final net.
export function lintPlan(scenes: Scene[], totalMs: number): string[] {
  const v: string[] = [];
  if (!Array.isArray(scenes) || !scenes.length) return ["no scenes"];

  for (const s of scenes) {
    const at = `${s?.kind}@${s?.startMs}ms`;
    if (!s || !KIND_FIELDS[s.kind]) { v.push(`unknown scene kind "${s?.kind}"`); continue; }
    if (typeof s.startMs !== "number" || typeof s.endMs !== "number" || s.endMs <= s.startMs) {
      v.push(`${at} has invalid startMs/endMs`);
      continue;
    }
    const miss = missingFields(s);
    if (miss.length) v.push(`${at} is missing required field(s): ${miss.join(", ")}`);
    const dur = s.endMs - s.startMs;
    if (dur < 1600) v.push(`${at} is only ${dur}ms — scenes must be 2000-3600ms`);
    if (dur > 3800) v.push(`${at} runs ${dur}ms — scenes must be 2000-3600ms`);
    if (s.endMs > totalMs + 300) v.push(`${at} ends after the reel (${totalMs}ms total)`);
  }

  const sorted = scenes
    .filter((s) => s && typeof s.startMs === "number" && typeof s.endMs === "number" && s.endMs > s.startMs)
    .sort((a, b) => a.startMs - b.startMs);
  if (!sorted.length) return v;

  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i + 1].startMs < sorted[i].endMs)
      v.push(`${sorted[i].kind}@${sorted[i].startMs}ms overlaps ${sorted[i + 1].kind}@${sorted[i + 1].startMs}ms`);
  }

  // open on a text-overlay hook, on the face
  const first = sorted[0];
  if (!TEXT_KINDS.includes(first.kind) || first.startMs > 1200)
    v.push(`the reel must OPEN on a text-overlay hook (headline/decrypt) starting near 0ms — it opens with ${first.kind}@${first.startMs}ms`);

  // text scenes: sparse, never adjacent
  const textScenes = sorted.filter((s) => TEXT_KINDS.includes(s.kind));
  if (textScenes.length > 2)
    v.push(`${textScenes.length} text scenes — use at most 2 (the hook + maybe ONE more); face + captions carry the rest`);
  for (let i = 0; i < sorted.length - 1; i++) {
    if (TEXT_KINDS.includes(sorted[i].kind) && TEXT_KINDS.includes(sorted[i + 1].kind) && sorted[i + 1].startMs - sorted[i].endMs < 4000)
      v.push(`two text scenes near each other (${sorted[i].kind}@${sorted[i].startMs}ms then ${sorted[i + 1].kind}@${sorted[i + 1].startMs}ms) — never stack text cards`);
  }

  // full-screen pacing: contiguous cut OR a real face beat, never a sub-second flash
  const full = sorted.filter((s) => !TEXT_KINDS.includes(s.kind));
  for (let i = 0; i < full.length - 1; i++) {
    const gap = full[i + 1].startMs - full[i].endMs;
    if (gap > 0 && gap < 1400)
      v.push(`${gap}ms face sliver between ${full[i].kind}@${full[i].startMs}ms and ${full[i + 1].kind}@${full[i + 1].startMs}ms — make them contiguous or leave a real 1.5-2.5s face beat`);
  }
  if (full.length && (full.length < 4 || full.length > 8))
    v.push(`${full.length} full-screen scenes — use ~5-7`);
  const coverage = full.reduce((a, s) => a + (s.endMs - s.startMs), 0) / Math.max(1, totalMs);
  if (full.length && coverage < 0.4)
    v.push(`full-screen scenes cover only ${Math.round(coverage * 100)}% of the reel — target ~50-60%`);
  if (coverage > 0.75)
    v.push(`full-screen scenes cover ${Math.round(coverage * 100)}% of the reel — target ~50-60%, the face must breathe`);

  const customs = sorted.filter((s) => s.kind === "custom");
  if (customs.length > 1) v.push(`${customs.length} custom scenes — max 1 per video`);

  return v;
}

// ── STAGE 2: the art director ────────────────────────────────────────────────
// Designs the scene track, CHOOSES the accent + the music bed (+ optional emphasis SFX),
// and may commission bespoke components (kind "custom" — built + verified in lib/studio.ts).
export async function planCutaways(args: {
  topic: string;
  words: Word[];
  editNote?: string;
  audio?: AudioLib;
}): Promise<Plan> {
  const { topic, words, editNote, audio } = args;
  if (!words.length) return { scenes: [] };
  const totalMs = words[words.length - 1].endMs;
  const transcript = words.map((w) => `[${w.startMs}] ${w.text}`).join(" ");

  const beats = await planBeats(topic, words);
  const beatsBlock = beats
    ? `\nNARRATIVE BEATS (a first pass segmented the story — align scene boundaries to beat
boundaries and pick the visual that serves each beat; don't cut mid-beat):
${beats.map((b) => `- [${b.startMs}-${b.endMs}] ${b.type}: ${b.gist}`).join("\n")}\n`
    : "";

  const fmtAudio = (x: { file: string; tags?: string[]; use?: string }) =>
    `- ${x.file}${x.tags?.length ? ` — ${x.tags.join(", ")}` : ""}${x.use ? ` (${x.use})` : ""}`;
  const audioBlock = audio?.music.length || audio?.sfx.length
    ? `\nAUDIO (handpicked library — choose from these files ONLY):
Pick ONE music bed that fits the mood:
${audio.music.map(fmtAudio).join("\n") || "- (none available)"}
Optionally place up to 3 emphasis SFX at exact word moments (atMs) — punchlines, reveals, stat pops:
${audio.sfx.map(fmtAudio).join("\n") || "- (none available)"}\n`
    : "";

  const prompt = `You are the ART DIRECTOR for a premium vertical (1080x1920) tech reel. The look is
dark, minimal, Vercel/Linear-grade — glassy panels, hairline borders, ONE bright accent color
(applied automatically; you don't pick colors). The bar is a top tech creator, not lyric-video
text cards. TOPIC: "${topic}". Reel length: ${totalMs} ms.
Word-timestamped TRANSCRIPT (ms in brackets): ${transcript}
${beatsBlock}
Design the scene track that cuts over the talking head. The FACE is the anchor — let it breathe.

HARD RULES:
- Use ~5-7 FULL-SCREEN motion-graphic scenes (the data / ui / media groups) covering ~50-60%
  of 0–${totalMs}ms. NOT one per line — the face + captions carry the rest.
- TEXT kinds (headline/decrypt/callout/quote) render as OVERLAYS ON THE FACE (transparent —
  the face shows through). Use them SPARINGLY: the opening hook + maybe ONE sprinkled. Never
  two text scenes near each other — prefer bare face + captions over another text card.
- OPEN on a text-overlay hook (headline or decrypt) — the reel starts on the FACE with the
  title on top, never a full-screen card.
- PACING (critical): between full-screen scenes, either cut STRAIGHT to the next (make them
  contiguous: one scene's endMs == the next's startMs) OR leave a real 1.5-2.5s FACE beat.
  NEVER a sub-second sliver of bare face between two scenes — it reads as a flash.
- Each full-screen scene 2.0–3.6s. startMs/endMs on word boundaries, NO overlaps, ordered.
- PREFER REAL SCREENSHOTS. Aim for at LEAST 1-2 "browser" (or "phone") scenes per video
  that screenshot the actual product / launch post / docs / GitHub repo page. A real captured
  page is far more credible and premium than a logo or a text card — lean on it whenever the
  story has a concrete page to show (a launch, a new feature, a repo, a pricing page, a blog
  post). Default to a "browser" shot over a plain "logo" when a company/product is the subject.
- When a real PRODUCT/COMPANY is named (Anthropic, OpenAI, Claude, Cursor, GitHub, Gemini,
  Google, Meta, Perplexity, Vercel, Notion, Figma...), SHOW it — prefer a "browser" screenshot
  of its real site/page; otherwise logo / logowall / versus / ascii — never just its name in text.
- On-screen NUMBERS must be REAL (stated in the script or true). No real number → no stat/
  donut/charts/statrow for it.
- browser/phone URLs must be real MARKETING/DOCS/GITHUB pages (https://anthropic.com,
  https://cursor.com, https://github.com/org/repo). NEVER app/login pages (claude.ai,
  chatgpt.com) — they hit bot-walls and get dropped.
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
- {"kind":"browser","url":"https://cursor.com","label":"cursor.com"}  (REAL site screenshot — USE OFTEN)
    great for: launch/announcement posts (https://anthropic.com/news/..., https://openai.com/index/...),
    docs pages, pricing pages, blog posts, and GitHub repos (https://github.com/org/repo).
    Reach for this on almost every video that references a real page — 1-2 per reel ideal.
- {"kind":"phone","url":"https://anthropic.com","label":"optional"}  (same, framed in a phone)
- {"kind":"ascii","brand":"Claude","label":"optional"}  (logo/image dissolves into glowing ascii — 1 max, hero moment)
- {"kind":"terminal","title":"zsh","lines":["claude -p \\"ship it\\"","done in 4s"]}
- {"kind":"code","title":"agent.ts","lines":["const r = await claude.run(task)","// runs for hours"],"highlight":[1]}
- {"kind":"tweet","name":"a dev","handle":"handle","text":"realistic hot take","brand":"Anthropic"}
app ui (shadcn-grade product surfaces — great for "using the tool" beats):
- {"kind":"command","query":"deploy to prod","results":[{"title":"Deploy","sub":"ship it","brand":"Vercel"},{"title":"Rollback"}],"hint":"optional line under"}  (⌘K palette, query types itself)
- {"kind":"prompt","text":"build me a CRM. take your time.","app":"claude","sub":"optional"}  (THE-prompt-that-did-this beats; big input, types + sends)
- {"kind":"search","query":"is my job safe","suggestions":["is my job safe from ai","...as a dev"],"label":"optional"}  (search bar + suggestions)
- {"kind":"diff","title":"agent.ts","lines":[{"text":"const model = 'gpt-4'","type":"del"},{"text":"const model = 'sonnet-5'","type":"add"},{"text":"await run()","type":"ctx"}]}  (code before/after beats)
- {"kind":"pricing","tiers":[{"name":"Pro","price":"$20","per":"/month","features":["unlimited"],"hero":true},{"name":"API","price":"$3","per":"/M tokens"}]}  (cost/paywall beats, real prices only)
- {"kind":"leaderboard","title":"swe-bench","rows":[{"label":"Sonnet 5","value":"78%","brand":"Anthropic","hero":true},{"label":"GPT-5","value":"72%"}]}  (rankings/benchmarks — real numbers)
- {"kind":"progress","label":"training run","percent":87,"sub":"optional"}  (one big animated bar + counting %)
- {"kind":"toggles","title":"optional","items":[{"label":"agent mode","on":true},{"label":"guardrails","on":false}]}  (settings switches flip on)
- {"kind":"dashboard","cards":[{"label":"users","value":"2.4M","delta":"+18%","spark":[3,5,4,8,12]},{"label":"cost","value":"$0.02","delta":"-40%"}]}  (2-4 KPI cards w/ sparklines, real numbers)
- {"kind":"receipt","title":"YOUR API BILL","items":[{"label":"input tokens","value":"$12.40"},{"label":"thinking","value":"$88.00"}],"total":{"value":"$100.40"}}  (deadpan cost-breakdown humor)
- {"kind":"inbox","items":[{"from":"OpenAI","subject":"We need to talk","preview":"optional","unread":true,"brand":"OpenAI"}]}  (email-drop beats, up to 4)
- {"kind":"poll","question":"optional","options":[{"label":"ship it","percent":78,"hero":true},{"label":"add tests first","percent":22}]}  (community-verdict beats)
- {"kind":"ticker","rows":[{"symbol":"NVDA","label":"optional","value":"$1,240","delta":"+4.2%"},{"symbol":"GPU","value":"sold out","delta":"-100%"}]}  (market/price-moves beats)
- {"kind":"kanban","title":"optional","columns":[{"title":"todo","cards":["auth"]},{"title":"doing","cards":["tests"]},{"title":"done","cards":["everything else","shipped by the agent"]}]}  (agents-doing-work beats; last card of last column lands late with the glow)
- {"kind":"waveform","label":"optional kicker","sub":"optional"}  (voice/audio-AI beats — animated voice bars)
- {"kind":"rating","name":"Claude Code","rating":4.9,"count":"12,404 ratings","brand":"Anthropic","tagline":"optional"}  (app-store verdict card)
bespoke (use sparingly — it will be CODE-GENERATED for this video, then verified):
- {"kind":"custom","name":"PascalCaseName","spec":"one tight paragraph: exactly what to show and how it animates","props":{...any data it needs...}}
  ONLY when no kind above fits the beat. Max 1 per video. Great for topic-specific visuals
  (e.g. a token-price ticker, a model-router diagram, a fake app UI specific to the story).

ALSO CHOOSE the video's ACCENT color to fit the topic's vibe:
blue (trust/infra) · cyan (futuristic) · green (money/win) · orange (energy) · red (drama/ban)
· pink (fun/chaos) · violet (research/frontier).
${audioBlock}
${editNote ? `IMPORTANT change requested: ${editNote}` : ""}
${visualBlock()}
Return ONLY JSON: {"accent":"<color>","music":"<file from the list>","sfx":[{"file":"<sfx file>","atMs":12345}],"scenes":[...]}
("music"/"sfx" only if an audio library was given; "sfx" is optional — omit it rather than force it.)`;

  let accent: string | undefined;
  let music: string | undefined;
  let sfx: { file: string; atMs: number }[] = [];
  let scenes: Scene[] = [];
  const adopt = (plan: any) => {
    if (Array.isArray(plan)) { scenes = plan; return; } // tolerate old array shape
    if (plan && Array.isArray(plan.scenes) && plan.scenes.length) {
      scenes = plan.scenes;
      accent = typeof plan.accent === "string" ? plan.accent : accent;
      music = typeof plan.music === "string" ? plan.music : music;
      sfx = Array.isArray(plan.sfx) ? plan.sfx : sfx;
    }
  };
  for (let attempt = 1; attempt <= 2 && !scenes.length; attempt++) {
    try {
      adopt(await claudeJson<any>(prompt, { model: "opus" }));
    } catch (e) {
      console.error(`director attempt ${attempt} failed:`, (e as Error).message?.slice(0, 400));
    }
  }

  // ONE repair round: hand the director its own plan + the exact rule violations
  if (scenes.length) {
    const violations = lintPlan(scenes, totalMs);
    if (violations.length) {
      console.error(`plan lint: ${violations.length} violation(s) — asking the director to repair`);
      try {
        adopt(
          await claudeJson<any>(
            `${prompt}\n\nYou already returned this plan:\n${JSON.stringify({ accent, music, sfx, scenes })}\n\nA mechanical rules check found these violations:\n${violations.map((x) => `- ${x}`).join("\n")}\n\nReturn the FULL corrected JSON (same shape), changing only what's needed to fix every violation.`,
            { model: "opus" },
          ),
        );
      } catch (e) {
        console.error("director repair failed — keeping original plan:", (e as Error).message?.slice(0, 200));
      }
    }
  }

  scenes = sanitize(scenes, totalMs);
  if (!scenes.length) scenes = [{ kind: "headline", startMs: 200, endMs: 2600, text: topic.split(" ").slice(0, 6).join(" ") }];

  // validate audio picks against the library — a hallucinated file would 404 the render
  if (music && !audio?.music.some((m) => m.file === music)) music = undefined;
  sfx = sfx
    .filter((e) => e && typeof e.atMs === "number" && audio?.sfx.some((s) => s.file === e.file))
    .map((e) => ({ file: e.file, atMs: Math.max(0, Math.round(e.atMs)) }))
    .slice(0, 3);

  return { accent, music, sfx, scenes, beats };
}

function sanitize(scenes: Scene[], totalMs: number): Scene[] {
  const ok = scenes
    .filter((s) => s && typeof s.startMs === "number" && typeof s.endMs === "number" && s.endMs > s.startMs)
    .filter((s) => {
      // unknown kind or missing required props = blank/crashing scene. drop it, loudly.
      if (!KIND_FIELDS[s.kind] || missingFields(s).length) {
        console.error("dropping malformed scene:", JSON.stringify(s).slice(0, 200));
        return false;
      }
      return true;
    })
    .map((s) => ({ ...s, startMs: Math.max(0, Math.round(s.startMs)), endMs: Math.min(totalMs, Math.round(s.endMs)) }))
    .map((s) => (s.endMs - s.startMs > 3800 ? { ...s, endMs: s.startMs + 3800 } : s)) // hard cap
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
  // kill sub-beat face flashes: a tiny gap between two scenes -> close it so the cut goes
  // straight scene->scene. Gaps >= MIN_FACE_BEAT stay as real "face breathes" moments.
  const MIN_FACE_BEAT = 1400;
  for (let i = 0; i < out.length - 1; i++) {
    const gap = out[i + 1].startMs - out[i].endMs;
    if (gap > 0 && gap < MIN_FACE_BEAT) out[i].endMs = out[i + 1].startMs;
  }
  return out;
}
