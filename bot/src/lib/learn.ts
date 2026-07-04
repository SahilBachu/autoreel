import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { REPO_ROOT } from "../config.js";
import { claudeJson } from "./claude.js";

// The learning loop. Every interaction is logged; Claude periodically DISTILLS the log into
// the human-editable brand files — VOICE.md (## learned / ## learned topics / ## learned
// captions / ## approved & posted) and DESIGN.md (## learned). Sahil can edit or delete any
// learned line by hand; prompts read the files, so edits take effect immediately.

const DIR = resolve(REPO_ROOT, "bot/data");
const LOG = resolve(DIR, "interactions.jsonl");
const VOICE = resolve(REPO_ROOT, "VOICE.md");
const DESIGN = resolve(REPO_ROOT, "DESIGN.md");

export type Event = {
  ts: string;
  type: "idea" | "revise" | "redo" | "edit" | "post";
  topic?: string;
  instruction?: string;
  before?: string;
  after?: string;
  plan?: string; // compact scene-plan summary (redo: which plan got rejected)
};

// ---- markdown section read/write ----
function readDoc(file: string): string {
  try {
    return readFileSync(file, "utf8");
  } catch {
    return "";
  }
}

function sectionBounds(lines: string[], headingPrefix: string): { start: number; end: number } | null {
  const start = lines.findIndex((l) => l.startsWith(headingPrefix));
  if (start < 0) return null;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i].startsWith("## ")) { end = i; break; }
  }
  return { start, end };
}

function readSection(file: string, headingPrefix: string): string[] {
  const lines = readDoc(file).split("\n");
  const b = sectionBounds(lines, headingPrefix);
  if (!b) return [];
  return lines
    .slice(b.start + 1, b.end)
    .map((l) => l.replace(/^-\s*/, "").trim())
    .filter(Boolean);
}

function writeSection(file: string, headingPrefix: string, bullets: string[]): void {
  const doc = readDoc(file);
  if (!doc) return;
  const lines = doc.split("\n");
  const b = sectionBounds(lines, headingPrefix);
  if (!b) return;
  const body = bullets.length ? bullets.map((x) => `- ${x}`) : [];
  const next = [...lines.slice(0, b.start + 1), "", ...body, "", ...lines.slice(b.end)];
  writeFileSync(file, next.join("\n").replace(/\n{3,}/g, "\n\n"));
}

// the four learned homes
const H = {
  voice: { file: VOICE, h: "## learned (" },
  topics: { file: VOICE, h: "## learned topics" },
  captions: { file: VOICE, h: "## learned captions" },
  visuals: { file: DESIGN, h: "## learned (" },
};

// ---- interaction log ----
export function logInteraction(e: Omit<Event, "ts">): void {
  try {
    if (!existsSync(DIR)) mkdirSync(DIR, { recursive: true });
    appendFileSync(LOG, JSON.stringify({ ts: new Date().toISOString(), ...e }) + "\n");
  } catch {
    /* best-effort */
  }
}

function readEvents(limit = 60): Event[] {
  try {
    return readFileSync(LOG, "utf8").trim().split("\n").filter(Boolean).slice(-limit).map((l) => JSON.parse(l) as Event);
  } catch {
    return [];
  }
}

// ---- prompt injection (for prompts that don't embed the whole doc) ----
export function visualBlock(): string {
  const items = readSection(H.visuals.file, H.visuals.h);
  if (!items.length) return "";
  return "\nLEARNED VISUAL PREFERENCES (from sahil's edits — honor these):\n" + items.map((i) => `- ${i}`).join("\n") + "\n";
}
export function topicBlock(): string {
  const items = readSection(H.topics.file, H.topics.h);
  if (!items.length) return "";
  return "\nTOPICS THIS CREATOR GRAVITATES TO:\n" + items.map((i) => `- ${i}`).join("\n") + "\n";
}
export function captionBlock(): string {
  const items = readSection(H.captions.file, H.captions.h);
  if (!items.length) return "";
  return "\nLEARNED CAPTION PREFERENCES:\n" + items.map((i) => `- ${i}`).join("\n") + "\n";
}

// ---- signal capture ----
let sinceDistill = 0;
function maybeDistill(): void {
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
export function learnFromRedo(topic: string, plan?: string): void {
  logInteraction({ type: "redo", topic, plan });
}
export async function learnFromPost(topic: string, script: string): Promise<void> {
  logInteraction({ type: "post", topic, after: script });
  // posted = approved: append to VOICE.md's approved-examples section (keep the last 8)
  try {
    const doc = readDoc(VOICE);
    const lines = doc.split("\n");
    const b = sectionBounds(lines, "## approved & posted");
    if (b) {
      const section = lines.slice(b.start + 1, b.end).join("\n");
      const blocks = section.split(/\n(?=Example \()/).filter((s) => s.trim());
      blocks.push(`Example (${topic}):\n${script.trim()}\n`);
      const kept = blocks.slice(-8).join("\n").trim();
      const next = [...lines.slice(0, b.start + 1), "", kept, "", ...lines.slice(b.end)];
      writeFileSync(VOICE, next.join("\n").replace(/\n{3,}/g, "\n\n"));
    }
  } catch {
    /* best-effort */
  }
  await distill();
}

// ---- the distillation ----
function oneline(s?: string): string {
  return (s || "").replace(/\s+/g, " ").trim().slice(0, 320);
}
function fmtEvent(e: Event): string {
  switch (e.type) {
    case "revise":
      return `[revise] topic="${e.topic}" asked="${e.instruction}"\n  BEFORE: ${oneline(e.before)}\n  AFTER:  ${oneline(e.after)}`;
    case "edit":
      return `[video edit] topic="${e.topic}" asked="${e.instruction}"`;
    case "redo":
      return `[rejected/redo] topic="${e.topic}"${e.plan ? ` rejected plan: ${oneline(e.plan)}` : ""}`;
    case "post":
      return `[APPROVED & POSTED] topic="${e.topic}" script: ${oneline(e.after)}`;
    default:
      return `[idea requested] topic="${e.topic}"`;
  }
}

export async function distill(): Promise<void> {
  const events = readEvents(60);
  if (!events.length) return;
  const current = {
    voice: readSection(H.voice.file, H.voice.h),
    visuals: readSection(H.visuals.file, H.visuals.h),
    topics: readSection(H.topics.file, H.topics.h),
    captions: readSection(H.captions.file, H.captions.h),
  };
  const prompt = `You maintain a compact PREFERENCE PROFILE for ONE Instagram tech-reel creator,
learned from how they edit scripts, request video changes, pick topics, and what they post.

CURRENT PROFILE (JSON):
${JSON.stringify(current, null, 2)}

RECENT INTERACTIONS (oldest first):
${events.map(fmtEvent).join("\n")}

Update the profile. Rules:
- Every bullet concrete and actionable ("open with the punchline", "prefer bento over plain
  lists", "avoid crypto topics"). Drop vague ones ("be engaging").
- Learn from REPEATED signals; don't overfit one edit. 'revise' BEFORE→AFTER = script voice.
  'video edit' = visuals. 'redo' = weak negative. 'post' = strong positive.
- Merge with current; drop anything contradicted by newer signals. Max 8 bullets/category.
Return ONLY JSON: {"voice":[...],"visuals":[...],"topics":[...],"captions":[...]}`;
  try {
    const next = await claudeJson<Partial<Record<keyof typeof H, string[]>>>(prompt, { model: "opus" });
    (Object.keys(H) as (keyof typeof H)[]).forEach((k) => {
      if (Array.isArray(next[k])) writeSection(H[k].file, H[k].h, next[k]!);
    });
  } catch {
    /* keep current */
  }
}

// human-readable summary for /prefs
export function prefsSummary(): string {
  const sec = (t: string, a: string[]) => (a.length ? `*${t}*\n` + a.map((x) => `- ${x}`).join("\n") : `*${t}*\n_nothing yet_`);
  return [
    sec("Script / voice", readSection(H.voice.file, H.voice.h)),
    sec("Visuals", readSection(H.visuals.file, H.visuals.h)),
    sec("Topics", readSection(H.topics.file, H.topics.h)),
    sec("Captions", readSection(H.captions.file, H.captions.h)),
    "_edit VOICE.md / DESIGN.md directly to change any of this._",
  ].join("\n\n");
}

export function forgetPrefs(): void {
  (Object.keys(H) as (keyof typeof H)[]).forEach((k) => writeSection(H[k].file, H[k].h, []));
}
