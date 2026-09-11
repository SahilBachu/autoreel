import { claude } from "./claude.js";
import { voiceSection, type PostType } from "./voice.js";
import { captionStrategy, KEYWORDS, hashtagPalette } from "./growth.js";
import { captionBlock } from "./learn.js";

// The Instagram POST caption (the description under the reel): dry voice + SEO/keyword
// optimized for reach. First line = hook + real keyword (tool posts: the comment-TOOL CTA
// comes first); body weaves keywords; exactly 5 hashtags (1 broad + 2 mid + 2 niche). See
// growth.ts for the strategy + banks. Type defaults to news = the old no-CTA behaviour.
export async function genPostCaption(topic: string, script: string, type: PostType = "news"): Promise<string> {
  const prompt = `${voiceSection("## rules")}

You are writing the Instagram POST caption (the description under the reel, NOT the on-screen
captions) for a ${type} reel about "${topic}".

The spoken script (for context — match its voice, don't repeat it verbatim):
${script}

${captionStrategy(type)}

Keyword bank to weave from (use the ones that fit this topic; these are what people search):
${KEYWORDS.join(", ")}

Hashtag bank for THIS post (choose exactly 5 total = 1 broad + 2 mid + 2 niche):
${hashtagPalette()}
${captionBlock()}
Output ONLY the finished caption (the lines, then a blank line, then the 5 hashtags). No
preamble, no quotes, no explanation.`;
  return (await claude(prompt)).trim();
}
