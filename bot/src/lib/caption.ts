import { claude } from "./claude.js";
import { VOICE_RULES } from "./voice.js";
import { CAPTION_STRATEGY, KEYWORDS, hashtagPalette } from "./growth.js";

// The Instagram POST caption (the description under the reel): dry voice + SEO/keyword
// optimized for reach. First line = hook + real keyword; body weaves keywords; exactly 5
// hashtags (1 broad + 2 mid + 2 niche). See growth.ts for the strategy + banks.
export async function genPostCaption(topic: string, script: string): Promise<string> {
  const prompt = `${VOICE_RULES}

You are writing the Instagram POST caption (the description under the reel, NOT the on-screen
captions) for a reel about "${topic}".

The spoken script (for context — match its voice, don't repeat it verbatim):
${script}

${CAPTION_STRATEGY}

Keyword bank to weave from (use the ones that fit this topic; these are what people search):
${KEYWORDS.join(", ")}

Hashtag bank for THIS post (choose exactly 5 total = 1 broad + 2 mid + 2 niche):
${hashtagPalette()}

Output ONLY the finished caption (the dry lines, then a blank line, then the 5 hashtags). No
preamble, no quotes, no explanation.`;
  return (await claude(prompt)).trim();
}
