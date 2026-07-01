import { claudeJson } from "./claude.js";
import type { Word } from "./whisper.js";

// Mirrors studio/src/auto/AutoReel.tsx Cutaway type.
export type Cutaway =
  | { kind: "title"; startMs: number; endMs: number; lines: { text: string; boxed?: boolean }[] }
  | { kind: "statement"; startMs: number; endMs: number; pre: string; boxed: string; post?: string };

// The director: read the word-timestamped transcript + topic and plan full-screen cutaways
// timed to the words (Nick-style hard cuts). Claude decides; heuristic fallback if it fails.
// TODO (next): extend cutaway kinds (logo, browser-window, screenshot) + fetch REAL assets
// via the Playwright MCP, per CLAUDE.md's component philosophy.
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

Plan 3-6 full-screen CUTAWAYS that reinforce specific moments, each timed to the words
(startMs/endMs from the transcript, 1.5-3s each, non-overlapping, leaving the talking head
visible between them). Use ONLY these shapes:
- {"kind":"title","startMs":N,"endMs":N,"lines":[{"text":"...","boxed":true|false}]}
- {"kind":"statement","startMs":N,"endMs":N,"pre":"...","boxed":"...","post":"..."}
Keep text short and punchy (a title is 1-3 words; a statement is one short line).
${editNote ? `IMPORTANT change requested: ${editNote}` : ""}
Return ONLY a JSON array.`;

  try {
    const plan = await claudeJson<Cutaway[]>(prompt);
    if (Array.isArray(plan) && plan.length) return plan;
  } catch {
    /* fall through */
  }
  // fallback: an opening title from the topic
  return [{ kind: "title", startMs: 0, endMs: 2400, lines: [{ text: topic, boxed: true }] }];
}
