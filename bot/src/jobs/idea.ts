import { claude } from "../lib/claude.js";
import { scriptPrompt, revisePrompt } from "../lib/voice.js";
import { voiceBlock, topicBlock, goldenExamples } from "../lib/learn.js";

const RANDOM_TOPIC = `Suggest ONE fresh, specific, currently-relevant topic for a short-form
tech reel by a creator who covers AI apps, ML, frontier models, and dev tooling. Prefer
something with a fun angle. Output ONLY the topic in a few words, nothing else.`;

// Random idea (no description) or a described one -> topic + script (in voice, informed by
// what this creator has approved/edited before).
export async function generateIdea(
  description?: string,
): Promise<{ topic: string; script: string }> {
  const topic =
    description?.trim() || (await claude(RANDOM_TOPIC + topicBlock())).split("\n")[0].trim();
  const script = await claude(
    scriptPrompt(topic, { learned: voiceBlock(), examples: goldenExamples(3) }),
  );
  return { topic, script };
}

// Revise the current script from a free-text change request; keeps the voice + learned taste.
export async function reviseScript(
  topic: string,
  currentScript: string,
  feedback: string,
): Promise<string> {
  return (await claude(revisePrompt(topic, currentScript, feedback, { learned: voiceBlock() }))).trim();
}
