import { claudeJson } from "./claude.js";
import { visualBlock } from "./learn.js";
import type { Word } from "./whisper.js";

// Mirrors studio/src/auto/AutoReel.tsx Cutaway type.
export type Cutaway =
  | { kind: "title"; startMs: number; endMs: number; lines: { text: string; boxed?: boolean }[] }
  | { kind: "statement"; startMs: number; endMs: number; pre: string; boxed: string; post?: string }
  | { kind: "agents"; startMs: number; endMs: number; kicker?: string }
  | { kind: "speed"; startMs: number; endMs: number; kicker?: string }
  | { kind: "terminal"; startMs: number; endMs: number; title?: string; lines: string[] }
  | { kind: "logo"; startMs: number; endMs: number }
  | { kind: "screenshot"; startMs: number; endMs: number; url: string; src?: string; label?: string };

// The director: read the word-timestamped transcript + topic and plan full-screen cutaways
// timed to the words (Nick-style hard cuts). Claude decides; heuristic fallback if it fails.
// NEXT: generate BESPOKE components per beat + fetch REAL assets (logos, repo/site
// screenshots) via the Playwright MCP, per CLAUDE.md's component philosophy.
export async function planCutaways(args: {
  topic: string;
  words: Word[];
  editNote?: string;
}): Promise<Cutaway[]> {
  const { topic, words, editNote } = args;
  const transcript = words.map((w) => `[${w.startMs}] ${w.text}`).join(" ");
  const prompt = `You are the art director for a short vertical tech reel in a hard-cut,
motion-graphics style (Nick Saraev). TOPIC: "${topic}".
Word-timestamped TRANSCRIPT (ms in brackets): ${transcript}

Plan 4-7 full-screen CUTAWAYS that reinforce specific moments, each timed to the words
(startMs/endMs from the transcript, 1.5-3s, non-overlapping, leaving the talking head
visible between them). Choose the cutaway 'kind' that best fits each beat:
- {"kind":"title","startMs","endMs","lines":[{"text":"...","boxed":true|false}]}  (opening / big idea)
- {"kind":"statement","startMs","endMs","pre":"...","boxed":"...","post":"..."}    (a punchy line)
- {"kind":"agents","startMs","endMs","kicker":"..."}      (parallelism / many things at once)
- {"kind":"speed","startMs","endMs","kicker":"..."}       (a speed / benchmark claim)
- {"kind":"terminal","startMs","endMs","title":"...","lines":["...","..."]}  (running a command / code)
- {"kind":"logo","startMs","endMs"}                        (a product name drop)
- {"kind":"screenshot","startMs","endMs","url":"https://REAL-url","label":"cursor.com"}  (show the ACTUAL product/site/repo — a real screenshot beats a mock)
For "screenshot", use the REAL official URL of the tool/company/repo in the topic (e.g.
https://cursor.com, https://claude.ai, https://openai.com, https://github.com/<org>/<repo>,
a real docs or pricing page). Only use it when there's a concrete product to show, at most
1-2 per reel, on the beat where you'd naturally cut to "here's the thing".
Keep text short and punchy. ${editNote ? `IMPORTANT change requested: ${editNote}` : ""}
${visualBlock()}
Return ONLY a JSON array.`;

  try {
    const plan = await claudeJson<Cutaway[]>(prompt);
    if (Array.isArray(plan) && plan.length) return plan;
  } catch {
    /* fall through */
  }
  return [{ kind: "title", startMs: 0, endMs: 2400, lines: [{ text: topic, boxed: true }] }];
}
