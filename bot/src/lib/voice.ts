import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { REPO_ROOT } from "../config.js";

// THE voice lives in VOICE.md at the repo root — human-editable, learning writes into it.
// This module just loads it (mtime-cached) and builds prompts around it.

const VOICE_PATH = resolve(REPO_ROOT, "VOICE.md");
let cache = { mtime: 0, text: "" };

export function voiceDoc(): string {
  try {
    const m = statSync(VOICE_PATH).mtimeMs;
    if (m !== cache.mtime) cache = { mtime: m, text: readFileSync(VOICE_PATH, "utf8") };
    return cache.text;
  } catch {
    return "Write short, dry, unserious Instagram reel scripts about AI/dev tools. 4-6 speakable lines, no hype, no CTAs, shrug endings.";
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

export function scriptPrompt(topicOrIdea: string, opts: { angle?: string } = {}): string {
  return [
    voiceDoc(),
    "\n---",
    `Write ONE script about: ${topicOrIdea}`,
    opts.angle ? `Angle: ${opts.angle}` : "",
    "Output ONLY the script lines. No preamble, no quotes, no title.",
  ].join("\n");
}

// fallback revision prompt for when there's no live session to resume
export function revisePrompt(topic: string, currentScript: string, feedback: string): string {
  return [
    voiceDoc(),
    "\n---",
    `Current script about "${topic}":\n${currentScript}`,
    `\nThe writer wants this change: ${feedback}`,
    "Apply ONLY that change. Keep everything else close to the original and keep the voice.",
    "Output ONLY the revised script lines. No preamble, no quotes, no title.",
  ].join("\n");
}
