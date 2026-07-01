import { claude, claudeSession } from "../lib/claude.js";
import { revisePrompt, scriptPrompt } from "../lib/voice.js";
import { topicBlock } from "../lib/learn.js";

const RANDOM_TOPIC = `Suggest ONE fresh, specific, currently-relevant topic for a short-form
tech reel by a creator who covers AI apps, ML, frontier models, and dev tooling. Prefer
something with a fun angle. Output ONLY the topic in a few words, nothing else.`;

// Random idea (no description) or a described one -> topic + script (VOICE.md loaded).
// The script call opens a SESSION (Opus) so revisions resume with full context.
export async function generateIdea(
  description?: string,
): Promise<{ topic: string; script: string; sessionId?: string }> {
  const topic =
    description?.trim() || (await claude(RANDOM_TOPIC + topicBlock(), { model: "opus" })).split("\n")[0].trim();
  const { text, sessionId } = await claudeSession(scriptPrompt(topic), { model: "opus" });
  return { topic, script: text.trim(), sessionId };
}

// Revise by RESUMING the original session (remembers the whole back-and-forth).
// Falls back to a fresh voice-loaded call if the session is gone.
export async function reviseScript(
  topic: string,
  currentScript: string,
  feedback: string,
  sessionId?: string,
): Promise<{ script: string; sessionId?: string }> {
  if (sessionId) {
    try {
      const { text, sessionId: sid } = await claudeSession(
        `Revise the current script. Change requested: ${feedback}\nOutput ONLY the revised script lines — no preamble.`,
        { model: "opus", resume: sessionId },
      );
      if (text) return { script: text.trim(), sessionId: sid ?? sessionId };
    } catch {
      /* fall through to cold revision */
    }
  }
  const script = (await claude(revisePrompt(topic, currentScript, feedback), { model: "opus" })).trim();
  return { script };
}
