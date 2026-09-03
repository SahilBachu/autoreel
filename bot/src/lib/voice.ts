import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { REPO_ROOT } from "../config.js";

// THE voice lives in VOICE.md at the repo root — human-editable, learning writes into it.
// This module just loads it (mtime-cached) and builds prompts around it.

// Every post is one of two kinds. "tool" = something the viewer can go use today (ends with
// the comment CTA, carries a real homepage URL). "news" = a release/result/story (no CTA).
// The researcher decides; the writer, the caption and the digest all branch on it.
export type PostType = "tool" | "news";

const VOICE_PATH = resolve(REPO_ROOT, "VOICE.md");
let cache = { mtime: 0, text: "" };

export function voiceDoc(): string {
  try {
    const m = statSync(VOICE_PATH).mtimeMs;
    if (m !== cache.mtime) cache = { mtime: m, text: readFileSync(VOICE_PATH, "utf8") };
    return cache.text;
  } catch {
    return "Write short, human, professional Instagram reel scripts about AI tools and AI news. Every script opens with 'so'. 4-6 speakable lines, no hype. Tool posts end with 'comment TOOL if you want access'; news posts have no CTA.";
  }
}

// one section of VOICE.md ("## rules", "## learned captions", ...) for lighter prompts
export function voiceSection(headingPrefix: string): string {
  const doc = voiceDoc();
  const lines = doc.split("\n");
  const start = lines.findIndex((l) => l.startsWith(headingPrefix));
  if (start < 0) return "";
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i].startsWith("## ")) { end = i; break; }
  }
  return lines.slice(start + 1, end).join("\n").trim();
}

// The writer runs agentic (WebSearch/WebFetch/Bash) — this is how it knows that, and how it
// knows NOT to let the WebSearch tool's "append a Sources: section" nag leak into a script.
const WRITER_TOOLS_NOTE = `You have WebSearch, WebFetch and Bash. Look things up — pricing, whether it's actually
free, what a repo really does, the exact name — instead of guessing. Any fact, number or name
in the script must be one you verified or were given here. Never pad with invented detail.`;

export type ScriptOpts = {
  angle?: string;
  type?: PostType;
  toolUrl?: string;
  // what research actually found (whyNow + links) — the writer's ground truth for this topic
  context?: string;
  // research came back empty: write from the description ALONE, add nothing
  fromDescriptionOnly?: boolean;
};

export function scriptPrompt(topicOrIdea: string, opts: ScriptOpts = {}): string {
  return [
    voiceDoc(),
    "\n---",
    WRITER_TOOLS_NOTE,
    `\nWrite ONE script about: ${topicOrIdea}`,
    opts.type ? `Post type: ${opts.type}${opts.type === "tool" ? " (so it MUST end with the comment-TOOL line — see the CTA rule)" : " (no CTA)"}` : "",
    opts.toolUrl ? `Tool homepage (verified): ${opts.toolUrl}` : "",
    opts.context ? `What research found:\n${opts.context}` : "",
    opts.angle ? `Angle: ${opts.angle}` : "",
    opts.fromDescriptionOnly
      ? `Research found NO sources for this. Write it from the description above and nothing else —
no numbers, names, prices or claims that aren't in it. If the description is too thin for a
script, keep it short rather than filling the gap.`
      : "",
    "Output ONLY the script lines. No preamble, no quotes, no title, no 'Sources:' block.",
  ]
    .filter(Boolean)
    .join("\n");
}

// fallback revision prompt for when there's no live session to resume
export function revisePrompt(topic: string, currentScript: string, feedback: string): string {
  return [
    voiceDoc(),
    "\n---",
    WRITER_TOOLS_NOTE,
    `\nCurrent script about "${topic}":\n${currentScript}`,
    `\nThe writer wants this change: ${feedback}`,
    "If the change is a question about the facts ('is it actually free?'), go check, then fix the script.",
    "Apply ONLY that change. Keep everything else close to the original and keep the voice.",
    "Output ONLY the revised script lines. No preamble, no quotes, no title, no 'Sources:' block.",
  ].join("\n");
}

// the one-liner appended to a RESUMED-session revision (the session already has VOICE.md)
export const REVISE_TOOLS_LINE = `You still have WebSearch/WebFetch/Bash — if the change needs a fact checked, check it; don't guess.`;
