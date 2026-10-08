import { sceneCatalog } from "./catalog.js";
import { claudeJson } from "./claude.js";
import { visualBlock } from "./learn.js";
import type { Word } from "./whisper.js";

// Mirrors studio/src/auto/AutoReel.tsx (brand v2). Every scene is PARAMETRIC — filled with the
// reel's REAL content. Full catalog with previews: COMPONENTS.md (repo root).
export type Scene = any;

export type Beat = { startMs: number; endMs: number; type: string; gist: string };
export type AudioLib = {
  music: { file: string; tags?: string[]; use?: string; lufs?: number }[];
  sfx: { file: string; tags?: string[]; use?: string }[];
};
export type Plan = {
  accent?: string;
  music?: string; // director-picked bed (validated against the library by the caller)
  sfx?: { file: string; atMs: number }[]; // director-placed emphasis sounds
  scenes: Scene[];
  beats?: Beat[]; // stage-1 narrative segmentation (kept for the plan audit file)
};

const TEXT_KINDS = ["headline", "decrypt", "callout", "quote", "kinetic"];

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
  ascii: [], custom: ["name", "spec"], clawd: ["brief"],
  // app-ui group (v2-apps.tsx)
  command: ["query", "results"], diff: ["lines"], pricing: ["tiers"],
  leaderboard: ["rows"], progress: ["label", "percent"], toggles: ["items"],
  dashboard: ["cards"], search: ["query"], receipt: ["items"], waveform: [],
  inbox: ["items"], poll: ["options"], ticker: ["rows"], kanban: ["columns"],
  prompt: ["text"], rating: ["name", "rating"],
  // tool-review arc (v2-tools.tsx): what it is → get it → watch it work → the catch → where
  toolcard: ["name"], install: ["steps"], runlog: ["steps"], beforeafter: ["rows"],
  catch: ["items"], getit: ["url"],
  // v3 (v3-*.tsx): the workflow graph, a cursor driving UI, a zoom into a real screenshot, an API
  // response, tools collapsing into one, kinetic type, a two-column compare, a hub, a repo card
  flow: ["nodes"], cursor: ["items"], highlight: ["url"], json: ["data"], stack: ["items", "into"],
  kinetic: ["text"], split: ["left", "right"], logoorbit: ["center", "brands"], repo: ["repo", "stars"],
};

const MAX_CUSTOM = 3; // bespoke components per video — a ceiling, not a quota

// Which renderer the plan is for. The rules differ because the geometry does:
//   v2    — every scene is a FULL-SCREEN cover over his face, so scenes stay short and the
//           face must get time back (2-3.6s each, ~50-60% coverage)
//   world — scenes are objects floating over the upper-middle of the frame while his face
//           stays visible, so a graphic can (and should) stay up for as long as he's talking
//           about it. The old 3.6s cap is exactly why graphics used to vanish mid-sentence.
export type PlanStyle = "v2" | "world";
const DUR: Record<PlanStyle, { min: number; max: number; cap: number }> = {
  v2: { min: 1600, max: 3800, cap: 3800 },
  world: { min: 2400, max: 10500, cap: 11000 },
};
const COVER: Record<PlanStyle, { min: number; max: number; label: string }> = {
  v2: { min: 0.4, max: 0.75, label: "~50-60%" },
  world: { min: 0.6, max: 0.97, label: "~70-90%" },
};
const COUNT: Record<PlanStyle, { min: number; max: number; label: string }> = {
  v2: { min: 4, max: 8, label: "~5-7" },
  world: { min: 4, max: 10, label: "~5-9" },
};

// Kinds the component library defines but this file has no required-field entry for yet (new
// kinds land in catalog.ts first). Accepted, with no required-field check, rather than being
// silently dropped as "unknown".
const CATALOG_KINDS = new Set([...sceneCatalog(MAX_CUSTOM).matchAll(/"kind":"([a-z0-9]+)"/g)].map((m) => m[1]));
const knownKind = (k: string) => Boolean(KIND_FIELDS[k]) || CATALOG_KINDS.has(k);

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
    const beats = await claudeJson<Beat[]>(prompt, {});
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
export function lintPlan(scenes: Scene[], totalMs: number, style: PlanStyle = "v2"): string[] {
  const D = DUR[style], C = COVER[style], N = COUNT[style];
  const v: string[] = [];
  if (!Array.isArray(scenes) || !scenes.length) return ["no scenes"];

  for (const s of scenes) {
    const at = `${s?.kind}@${s?.startMs}ms`;
    if (!s || !knownKind(s.kind)) { v.push(`unknown scene kind "${s?.kind}"`); continue; }
    if (typeof s.startMs !== "number" || typeof s.endMs !== "number" || s.endMs <= s.startMs) {
      v.push(`${at} has invalid startMs/endMs`);
      continue;
    }
    const miss = missingFields(s);
    if (miss.length) v.push(`${at} is missing required field(s): ${miss.join(", ")}`);
    const dur = s.endMs - s.startMs;
    const range = style === "world" ? "2500-10000ms, following the speech" : "2000-3600ms";
    if (dur < D.min) v.push(`${at} is only ${dur}ms — scenes must be ${range}`);
    if (dur > D.max) v.push(`${at} runs ${dur}ms — scenes must be ${range}${style === "world" ? " (split a long point into two objects that build on each other)" : ""}`);
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
  const what = style === "world" ? "visual objects" : "full-screen scenes";
  if (full.length && (full.length < N.min || full.length > N.max))
    v.push(`${full.length} ${what} — use ${N.label}`);
  const coverage = full.reduce((a, s) => a + (s.endMs - s.startMs), 0) / Math.max(1, totalMs);
  if (full.length && coverage < C.min)
    v.push(`${what} cover only ${Math.round(coverage * 100)}% of the reel — target ${C.label}${style === "world" ? " (they float over him, so they can stay up while he talks)" : ""}`);
  if (coverage > C.max)
    v.push(`${what} cover ${Math.round(coverage * 100)}% of the reel — target ${C.label}, the face must breathe`);

  const customs = sorted.filter((s) => s.kind === "custom");
  if (customs.length > MAX_CUSTOM) v.push(`${customs.length} custom scenes — up to ${MAX_CUSTOM} per video, and only where a beat genuinely needs one`);

  return v;
}

// ── STAGE 2: the art director ────────────────────────────────────────────────
// Designs the scene track, CHOOSES the accent + the music bed (+ optional emphasis SFX),
// and may commission bespoke components (kind "custom" — built + verified in lib/studio.ts).
const V2_RULES = (totalMs: number) => `Design the scene track that cuts over the talking head. The FACE is the anchor — let it breathe.

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
`;

const WORLD_RULES = (totalMs: number) => `Design the track of GRAPHIC OBJECTS for this reel. How they render: every scene is an object
in one connected world; a camera glides from one to the next; they float over the upper-middle
of the frame while his face stays visible beneath and around them. The creator LOVES graphics
interacting over him — so the world is on screen for most of the reel, as long as each object
is about what he is saying right now.

HARD RULES:
- TIMING FOLLOWS THE SPEECH (the most important rule). An object appears as he STARTS talking
  about its subject (startMs on, or up to ~300ms before, the first word of that idea) and stays
  until he MOVES ON (endMs = the first word of his next idea, or the end of the sentence that
  finishes this one). NEVER end an object mid-sentence or while he's still explaining it. The
  old failure was graphics vanishing before he finished talking about them — don't repeat it.
- Durations come from the speech: typically 3-8s, 2.5s minimum, ~10s maximum. If one point
  runs longer than ~10s, split it into two objects that build on each other (e.g. the tool's
  card, then the tool running).
- CONTIGUOUS BY DEFAULT: one object's endMs == the next's startMs, and the camera travels
  between them. Leave a bare-face gap (1.5s+) only where he makes a personal aside with nothing
  concrete to show. Never a sub-1.4s sliver of bare face.
- ~5-9 objects covering ~70-90% of 0–${totalMs}ms. startMs/endMs on word boundaries, NO
  overlaps, in order.
- OPEN with a "headline" (a 3-6 word hook, ONE emphasis word, a short kicker) from 0ms to about
  where his first sentence ends (~2500-3500ms). It is rendered as the animated intro hook over
  his face — write it like a thumbnail title, not a caption.
- After the hook, favour VISUAL kinds (data / ui / media / tool / the newer kinds) over text:
  at most ONE more text scene in the whole reel.
- Build a little story with the sequence: identity (what it is) → proof or mechanism (how it
  works, a real number, the real page) → payoff (what you get / where to get it). The camera
  travelling between related objects should feel like one continuous explanation.
- Bespoke "custom" objects are encouraged for the ONE moment that deserves something no
  catalog kind can show (the hero beat) — usually 1, up to ${MAX_CUSTOM} when several beats are
  genuinely unique. They're generated for this video from a pro component kit, so describe
  exactly what to show and how it animates.
`;

// the Clawd experiment (lib/clawd.ts): a hand-painted cartoon of the Claude Code mascot acting
// out a line, made per shot at render time with the ClaudeAnimationBase kit
const CLAWD_BLOCK = `
hand-painted cartoon (EXPERIMENT ON for this reel — use it):
- {"kind":"clawd","brief":"Clawd sees a bill fly in, it unrolls to the floor, Clawd's eyes go wide and it faints backwards"}
  (Clawd, Claude Code's little terracotta mascot, in a hand-painted watercolour-cartoon card,
  ACTING OUT the line he's saying: the event + Clawd's reaction, in one or two sentences. No text
  in it, so the brief is pure action: props, a take, an emotion change (shocked, smug, crushed,
  furious, celebrating, typing frantically, sweating, starstruck). When the story is about
  Claude/Anthropic, Clawd IS Claude; otherwise Clawd is "the AI" or the viewer reacting. Other
  companies/people only as simple painted props or creatures, never logos or real faces.)
  For THIS reel use 2-3 of them, spread out (one soon after the hook, one mid-video, one near
  the end), each 3-7 s on the line it illustrates, never two in a row. Put them on the funny or
  emotional beats (a shocking number, a ban, a win, a fail, "it just works"); keep the factual
  beats for screenshots/stats/data. Don't use one for the opening hook card or the final CTA.
`;

export async function planCutaways(args: {
  topic: string;
  words: Word[];
  editNote?: string;
  audio?: AudioLib;
  style?: PlanStyle;
  clawd?: boolean; // the Clawd cartoon experiment is on for this reel (lib/clawd.ts)
}): Promise<Plan> {
  const { topic, words, editNote, audio } = args;
  const style: PlanStyle = args.style ?? "v2";
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
${style === "world"
  ? "(Sound effects are placed automatically for this style — don't pick any.)"
  : `Optionally place up to 3 emphasis SFX at exact word moments (atMs) — punchlines, reveals, stat pops:
${audio.sfx.map(fmtAudio).join("\n") || "- (none available)"}`}\n`
    : "";

  const prompt = `You are the ART DIRECTOR for a premium vertical (1080x1920) tech reel. The look is
dark, minimal, Vercel/Linear-grade — glassy panels, hairline borders, ONE bright accent color
(applied automatically; you don't pick colors). The bar is a top tech creator, not lyric-video
text cards. TOPIC: "${topic}". Reel length: ${totalMs} ms.
Word-timestamped TRANSCRIPT (ms in brackets): ${transcript}
${beatsBlock}
${style === "world" ? WORLD_RULES(totalMs) : V2_RULES(totalMs)}- PREFER REAL SCREENSHOTS. Aim for at LEAST 1-2 "browser" (or "phone") scenes per video
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

${sceneCatalog(MAX_CUSTOM)}${args.clawd ? CLAWD_BLOCK : ""}
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
      adopt(await claudeJson<any>(prompt, {}));
    } catch (e) {
      console.error(`director attempt ${attempt} failed:`, (e as Error).message?.slice(0, 400));
    }
  }

  // ONE repair round: hand the director its own plan + the exact rule violations
  if (scenes.length) {
    const violations = lintPlan(scenes, totalMs, style);
    if (violations.length) {
      console.error(`plan lint: ${violations.length} violation(s) — asking the director to repair`);
      try {
        adopt(
          await claudeJson<any>(
            `${prompt}\n\nYou already returned this plan:\n${JSON.stringify({ accent, music, sfx, scenes })}\n\nA mechanical rules check found these violations:\n${violations.map((x) => `- ${x}`).join("\n")}\n\nReturn the FULL corrected JSON (same shape), changing only what's needed to fix every violation.`,
            {},
          ),
        );
      } catch (e) {
        console.error("director repair failed — keeping original plan:", (e as Error).message?.slice(0, 200));
      }
    }
  }

  scenes = sanitize(scenes, totalMs, style);
  if (style === "world") scenes = holdThroughSpeech(scenes, words, totalMs);
  if (!scenes.length) scenes = [{ kind: "headline", startMs: 200, endMs: 2600, text: topic.split(" ").slice(0, 6).join(" ") }];

  // validate audio picks against the library — a hallucinated file would 404 the render
  if (music && !audio?.music.some((m) => m.file === music)) music = undefined;
  sfx = sfx
    .filter((e) => e && typeof e.atMs === "number" && audio?.sfx.some((s) => s.file === e.file))
    .map((e) => ({ file: e.file, atMs: Math.max(0, Math.round(e.atMs)) }))
    .slice(0, 3);
  if (style === "world") sfx = []; // the renderer's sound policy owns SFX in this style

  return { accent, music, sfx, scenes, beats };
}

function sanitize(scenes: Scene[], totalMs: number, style: PlanStyle = "v2"): Scene[] {
  const cap = DUR[style].cap;
  const ok = scenes
    .filter((s) => s && typeof s.startMs === "number" && typeof s.endMs === "number" && s.endMs > s.startMs)
    .filter((s) => {
      // unknown kind or missing required props = blank/crashing scene. drop it, loudly.
      if (!knownKind(s.kind) || missingFields(s).length) {
        console.error("dropping malformed scene:", JSON.stringify(s).slice(0, 200));
        return false;
      }
      return true;
    })
    .map((s) => ({ ...s, startMs: Math.max(0, Math.round(s.startMs)), endMs: Math.min(totalMs, Math.round(s.endMs)) }))
    .map((s) => (s.endMs - s.startMs > cap ? { ...s, endMs: s.startMs + cap } : s)) // hard cap (per style)
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

// The mechanical guarantee behind "timing follows the speech". The director is told the rule,
// but a plan can still end an object mid-sentence — the old cf reel dropped its bar chart right
// as he said "cf covers over 3000", the number the chart existed to show. For each object:
//   • if the sentence being spoken at its endMs finishes within HOLD_MAX, hold to the end of it
//   • if it doesn't, but the next object starts within HOLD_MAX, hold until that object (he is
//     still mid-sentence, so bare face would be a flash in the middle of a thought)
// Never past the next object's start, never beyond the style's duration cap. The opening hook
// is left alone — its length is the intro's. Sentence ends come from caption punctuation.
const HOLD_MAX = 5000;
export function holdThroughSpeech(scenes: Scene[], words: Word[], totalMs: number): Scene[] {
  const out = scenes.map((s) => ({ ...s }));
  const endsSentence = (t: string) => /[.!?…]["')\]]*$/.test(t.trim());
  for (let i = 0; i < out.length; i++) {
    const s = out[i];
    if (i === 0 && TEXT_KINDS.includes(s.kind)) continue;
    const next = i + 1 < out.length ? out[i + 1].startMs : totalMs;
    const reach = Math.min(next, s.endMs + HOLD_MAX, s.startMs + DUR.world.cap);
    // the word being spoken at endMs (or the last one that started before it)
    let k = -1;
    for (let j = 0; j < words.length; j++) {
      if (words[j].startMs < s.endMs) k = j;
      else break;
    }
    if (k < 0 || endsSentence(words[k].text)) continue;
    let held = false;
    for (let j = k; j < words.length && words[j].endMs <= reach; j++) {
      if (endsSentence(words[j].text)) {
        s.endMs = Math.min(reach, words[j].endMs + 250); // a beat of air after the last word
        held = true;
        break;
      }
    }
    if (!held && next - s.endMs <= HOLD_MAX && next <= s.startMs + DUR.world.cap) s.endMs = next;
  }
  for (let i = 0; i < out.length - 1; i++) {
    const gap = out[i + 1].startMs - out[i].endMs;
    if (gap > 0 && gap < 1400) out[i].endMs = out[i + 1].startMs;
  }
  return out;
}
