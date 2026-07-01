import { readFileSync, writeFileSync, appendFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { REPO_ROOT } from "../config.js";
import { claudeJson } from "./claude.js";

// The learning loop. Every meaningful interaction (idea/revise/redo/edit/post) is logged, and
// Claude periodically DISTILLS the log into a compact, actionable preference profile that gets
// injected back into the script / director / caption prompts. Approved (posted) scripts are
// kept as golden few-shots. Net effect: the more the creator uses it, the more it writes and
// designs like THEM. All data lives on the runner under bot/data (gitignored).

const DIR = resolve(REPO_ROOT, "bot/data");
const LOG = resolve(DIR, "interactions.jsonl");
const PREFS = resolve(DIR, "preferences.json");
const GOLDEN = resolve(DIR, "golden.json");

function ensure() {
  if (!existsSync(DIR)) mkdirSync(DIR, { recursive: true });
}

export type Event = {
  ts: string;
  type: "idea" | "revise" | "redo" | "edit" | "post";
  topic?: string;
  instruction?: string; // the creator's free-text (revise/edit)
  before?: string; // prior script (revise)
  after?: string; // resulting script (revise) or approved script (post)
};

export type Prefs = {
  voice: string[]; // how they want scripts written/edited
  visuals: string[]; // how they want the motion graphics / components
  topics: string[]; // subjects/angles they like or avoid
  captions: string[]; // caption preferences
  updatedAt?: string;
};

const EMPTY: Prefs = { voice: [], visuals: [], topics: [], captions: [] };
type Golden = { topic: string; script: string; ts: string };

function readJson<T>(f: string, fallback: T): T {
  try {
    return JSON.parse(readFileSync(f, "utf8")) as T;
  } catch {
    return fallback;
  }
}

export function logInteraction(e: Omit<Event, "ts">): void {
  try {
    ensure();
    appendFileSync(LOG, JSON.stringify({ ts: new Date().toISOString(), ...e }) + "\n");
  } catch {
    /* logging is best-effort */
  }
}

function readEvents(limit = 60): Event[] {
  try {
    const lines = readFileSync(LOG, "utf8").trim().split("\n").filter(Boolean);
    return lines.slice(-limit).map((l) => JSON.parse(l) as Event);
  } catch {
    return [];
  }
}

export function readPrefs(): Prefs {
  return { ...EMPTY, ...readJson<Prefs>(PREFS, EMPTY) };
}

export function readGolden(): Golden[] {
  return readJson<Golden[]>(GOLDEN, []);
}

export function goldenExamples(n = 3): string[] {
  return readGolden()
    .slice(-n)
    .map((g) => g.script);
}

// ---- prompt injection blocks (empty string until something is learned) ----
function block(title: string, items: string[]): string {
  if (!items.length) return "";
  return `\n${title}\n` + items.map((i) => `- ${i}`).join("\n") + "\n";
}
export function voiceBlock(): string {
  return block("LEARNED SCRIPT PREFERENCES (this creator's own taste, from past edits — follow these):", readPrefs().voice);
}
export function visualBlock(): string {
  return block("LEARNED VISUAL PREFERENCES (how this creator likes the motion graphics — honor these):", readPrefs().visuals);
}
export function topicBlock(): string {
  return block("LEARNED TOPIC PREFERENCES (what this creator gravitates to / avoids):", readPrefs().topics);
}
export function captionBlock(): string {
  return block("LEARNED CAPTION PREFERENCES:", readPrefs().captions);
}

// ---- signal capture ----
let sinceDistill = 0;
function maybeDistill(): void {
  // distill in the background every few edits so the profile stays fresh without cost per message
  if (++sinceDistill >= 3) {
    sinceDistill = 0;
    distill().catch(() => {});
  }
}

export function learnFromIdea(topic: string): void {
  logInteraction({ type: "idea", topic });
}
export function learnFromRevision(topic: string, before: string, after: string, instruction: string): void {
  logInteraction({ type: "revise", topic, instruction, before, after });
  maybeDistill();
}
export function learnFromEdit(topic: string, instruction: string): void {
  logInteraction({ type: "edit", topic, instruction });
  maybeDistill();
}
export function learnFromRedo(topic: string): void {
  logInteraction({ type: "redo", topic });
}
export async function learnFromPost(topic: string, script: string): Promise<void> {
  logInteraction({ type: "post", topic, after: script });
  try {
    ensure();
    const g = readGolden();
    g.push({ topic, script, ts: new Date().toISOString() });
    writeFileSync(GOLDEN, JSON.stringify(g.slice(-12), null, 2)); // keep the most recent 12
  } catch {
    /* best-effort */
  }
  await distill(); // a post is the strongest signal — always learn from it
}

// ---- the distillation (meta-learning) ----
function oneline(s?: string): string {
  return (s || "").replace(/\s+/g, " ").trim().slice(0, 320);
}
function fmtEvent(e: Event): string {
  switch (e.type) {
    case "revise":
      return `[revise] topic="${e.topic}" asked="${e.instruction}"\n  BEFORE: ${oneline(e.before)}\n  AFTER:  ${oneline(e.after)}`;
    case "edit":
      return `[motion-graphics edit] topic="${e.topic}" asked="${e.instruction}"`;
    case "redo":
      return `[rejected/redo] topic="${e.topic}"`;
    case "post":
      return `[APPROVED & POSTED] topic="${e.topic}" script: ${oneline(e.after)}`;
    case "idea":
      return `[idea requested] topic="${e.topic}"`;
    default:
      return JSON.stringify(e);
  }
}

export async function distill(): Promise<Prefs> {
  const events = readEvents(60);
  if (!events.length) return readPrefs();
  const current = readPrefs();
  const prompt = `You maintain a compact PREFERENCE PROFILE for ONE Instagram tech-reel creator,
learned from how they edit AI-generated scripts, request motion-graphic changes, choose topics,
and which reels they approve (post) vs reject (redo).

CURRENT PROFILE (JSON):
${JSON.stringify(current, null, 2)}

RECENT INTERACTIONS (oldest first, newest last):
${events.map(fmtEvent).join("\n")}

Update the profile to capture DURABLE, SPECIFIC, ACTIONABLE patterns a scriptwriter and art
director could directly follow. Rules:
- Every bullet must be concrete and usable. Good: "Open with the punchline, cut slow setups",
  "Prefer heavy grotesk titles over serif", "Keep scripts to ~4 lines", "Avoid crypto topics".
  Bad (drop these): "be engaging", "good pacing", vague adjectives.
- Learn from REPEATED signals; don't over-fit a single one-off edit.
- Signal meaning: 'revise' BEFORE→AFTER + the ask = how they want SCRIPTS (voice). 'edit' = how
  they want the MOTION GRAPHICS (visuals). 'redo' = they rejected that generation (weak negative).
  'post' = they APPROVED it (strong positive — do more of what those scripts do).
- Merge with the current profile; DROP anything contradicted by newer signals; keep it tight.
- Max 8 bullets per category, ranked best/most-general first.
Return ONLY JSON: {"voice":[...],"visuals":[...],"topics":[...],"captions":[...]}`;
  try {
    const next = await claudeJson<Partial<Prefs>>(prompt);
    const merged: Prefs = {
      voice: next.voice ?? current.voice,
      visuals: next.visuals ?? current.visuals,
      topics: next.topics ?? current.topics,
      captions: next.captions ?? current.captions,
      updatedAt: new Date().toISOString(),
    };
    ensure();
    writeFileSync(PREFS, JSON.stringify(merged, null, 2));
    return merged;
  } catch {
    return current;
  }
}

// human-readable summary for the /prefs command
export function prefsSummary(): string {
  const p = readPrefs();
  const sec = (t: string, a: string[]) => (a.length ? `*${t}*\n` + a.map((x) => `• ${x}`).join("\n") : `*${t}*\n_nothing yet_`);
  const golden = readGolden().length;
  return [
    sec("🎙️ Script / voice", p.voice),
    sec("🎬 Visuals", p.visuals),
    sec("💡 Topics", p.topics),
    sec("📝 Captions", p.captions),
    `_${golden} approved script(s) saved as style examples._${p.updatedAt ? `\n_updated ${p.updatedAt.slice(0, 16).replace("T", " ")}_` : ""}`,
  ].join("\n\n");
}

export function forgetPrefs(): void {
  try {
    ensure();
    writeFileSync(PREFS, JSON.stringify({ ...EMPTY, updatedAt: new Date().toISOString() }, null, 2));
  } catch {
    /* best-effort */
  }
}
