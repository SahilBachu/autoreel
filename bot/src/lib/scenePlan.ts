import { claudeJson } from "./claude.js";
import { visualBlock } from "./learn.js";
import type { Word } from "./whisper.js";

// Mirrors studio/src/auto/AutoReel.tsx Scene type. Every scene is PARAMETRIC — the director
// fills it with the reel's ACTUAL content (real numbers/names). Nothing hardcoded to a topic.
export type Bg = "paper" | "cream" | "dark" | "warm";
export type Scene =
  | { kind: "headline"; startMs: number; endMs: number; text: string; emphasis?: string; bg?: Bg }
  | { kind: "stat"; startMs: number; endMs: number; value: string; sub?: string; kicker?: string; bg?: Bg }
  | { kind: "compare"; startMs: number; endMs: number; title?: string; unit?: string; rows: { label: string; value: number; note?: string; highlight?: boolean }[]; bg?: Bg }
  | { kind: "terminal"; startMs: number; endMs: number; title?: string; lines: string[]; bg?: Bg }
  | { kind: "logo"; startMs: number; endMs: number; name: string; tagline?: string; url?: string; src?: string; bg?: Bg }
  | { kind: "points"; startMs: number; endMs: number; title?: string; items: string[]; bg?: Bg }
  | { kind: "quote"; startMs: number; endMs: number; pre: string; boxed: string; post?: string; bg?: Bg }
  | { kind: "callout"; startMs: number; endMs: number; text: string; bg?: Bg }
  | { kind: "screenshot"; startMs: number; endMs: number; url: string; src?: string; label?: string };

// The art director: given the word-timestamped transcript, design a DENSE sequence of
// full-screen motion-graphic scenes (~70% of the timeline) that reinforce each beat, timed to
// the words, filled with the real content, with visual variety. Claude decides; safe fallback.
export async function planCutaways(args: { topic: string; words: Word[]; editNote?: string }): Promise<Scene[]> {
  const { topic, words, editNote } = args;
  if (!words.length) return [];
  const totalMs = words[words.length - 1].endMs;
  const transcript = words.map((w) => `[${w.startMs}] ${w.text}`).join(" ");

  const prompt = `You are the ART DIRECTOR for a short vertical (1080x1920) tech reel in a
premium, motion-graphics-heavy style (think Nick Saraev x MKBHD). TOPIC: "${topic}".
The reel is ${totalMs} ms long. Word-timestamped TRANSCRIPT (ms in brackets):
${transcript}

Design a DENSE sequence of full-screen SCENES that cut over the talking head. Requirements:
- COVER ~70% of the 0–${totalMs}ms timeline. The talking head should only show ~30% of the
  time, in short 1.2–2.2s gaps between scenes. Do NOT leave long stretches with no scene.
- Each scene 1.8–3.5s, timed so startMs/endMs land on word boundaries from the transcript.
  Scenes must NOT overlap. Order them by startMs.
- Fill every scene with the REAL content of THIS reel — actual product names, and only REAL
  numbers (a price, %, ×-faster, token count) that are true / stated in the script. If you
  don't have a real number, DON'T use stat/compare — use headline/quote/callout/points/etc.
- VARY the scene kind AND the background across the reel (never the same bg twice in a row).
  Backgrounds: "paper" (cream dot-grid), "cream", "dark", "warm" (terracotta). Terracotta is
  the signature accent.

Scene kinds (pick the best fit per beat, use a good mix):
- {"kind":"headline","text":"3-6 word hook","emphasis":"ONE word to box in terracotta","bg":"paper"}  (opener / big idea)
- {"kind":"stat","value":"90%","sub":"as good as Opus","kicker":"ON BENCHMARKS","bg":"dark"}  (value can be "90%","3×","$3","128k" — a giant counting number)
- {"kind":"compare","title":"price / M tokens","unit":"$","rows":[{"label":"Opus","value":15},{"label":"Sonnet 5","value":3,"highlight":true}],"bg":"paper"}  (2-3 real rows, highlight the hero)
- {"kind":"terminal","title":"zsh","lines":["command here","output line"],"bg":"warm"}  (a real command / code — types itself out; line 0 is the command)
- {"kind":"logo","name":"Sonnet 5","tagline":"by Anthropic","bg":"dark"}  (a product/name drop)
- {"kind":"points","title":"what changed","items":["faster","cheaper","better at code"],"bg":"cream"}  (2-4 short bullets)
- {"kind":"quote","pre":"my Opus sub is now","boxed":"emotional support","bg":"paper"}  (dry aside, one word boxed)
- {"kind":"callout","text":"anyway. moving on.","bg":"warm"}  (a punchy full-screen line)
- {"kind":"screenshot","url":"https://REAL-url.com","label":"cursor.com","bg":"dark"}  (show the ACTUAL product site/repo — use the real official URL; at most 1-2 per reel)

Open on a strong "headline" or "logo" for the hook. Keep all text SHORT and punchy.
${editNote ? `IMPORTANT change requested: ${editNote}` : ""}
${visualBlock()}
Return ONLY a JSON array of scene objects.`;

  let scenes: Scene[] = [];
  try {
    const plan = await claudeJson<Scene[]>(prompt);
    if (Array.isArray(plan)) scenes = plan;
  } catch {
    /* fall through to fallback */
  }
  scenes = sanitize(scenes, totalMs);
  if (!scenes.length) {
    // minimal but real fallback: a hook headline + a dry callout
    scenes = [
      { kind: "headline", startMs: 200, endMs: 2600, text: topic.split(" ").slice(0, 6).join(" "), bg: "paper" },
    ];
  }
  return scenes;
}

// keep scenes in-bounds, ordered, non-overlapping, sanely sized
function sanitize(scenes: Scene[], totalMs: number): Scene[] {
  const ok = scenes
    .filter((s) => s && typeof (s as any).startMs === "number" && typeof (s as any).endMs === "number" && (s as any).endMs > (s as any).startMs)
    .map((s) => ({ ...s, startMs: Math.max(0, Math.round(s.startMs)), endMs: Math.min(totalMs, Math.round(s.endMs)) }))
    .filter((s) => s.endMs - s.startMs >= 800)
    .sort((a, b) => a.startMs - b.startMs);
  const out: Scene[] = [];
  let lastEnd = -1;
  for (const s of ok) {
    if (s.startMs < lastEnd) s.startMs = lastEnd; // push past previous
    if (s.endMs - s.startMs < 800) continue; // dropped by the shove
    out.push(s);
    lastEnd = s.endMs;
  }
  return out;
}
