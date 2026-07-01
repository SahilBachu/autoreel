import { claude } from "./claude.js";
import { VOICE_RULES } from "./voice.js";

// The Instagram POST caption (the description under the reel), in the user's voice.
export async function genPostCaption(topic: string, script: string): Promise<string> {
  const prompt = `${VOICE_RULES}

Write a SHORT Instagram caption (the post description, NOT the on-screen captions) for a
reel about "${topic}". Context (the spoken script):
${script}

Rules: one short line in the same dry, unserious voice — no hype, no "follow/like/comment",
no emoji spam. Then a newline and 3-5 relevant lowercase hashtags. Output ONLY the caption.`;
  return (await claude(prompt)).trim();
}
