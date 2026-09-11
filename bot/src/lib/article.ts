import { claudeJson } from "./claude.js";
import { voiceDoc, type PostType } from "./voice.js";
import { WRITER_TOOLS } from "../jobs/discover.js";
import { REPO_ROOT } from "../config.js";

// What the SITE shows for a post. Every post gets a title + one-line blurb for its block.
// A news post also gets a short read — written, not spoken, so it gets its own rules on top
// of VOICE.md. The reel script is the seed: the writer expands it with what it can verify.
// Nothing here is approved by hand: the script it grew from already was.

export type SiteCopy = { title: string; blurb: string; article?: string };

const LONG_FORM_RULES = `
LONG-FORM RULES (this is a short read on his website — NOT a reel script):
- 350-500 words. Shorter is fine if the point lands. Never pad to length.
- First person, same guy as the scripts, but WRITTEN not spoken: full sentences, room to explain
  the mechanism and why it matters to someone who builds with this stuff.
- The first sentence is the thing itself — the fact, the detail — not a scene-setter. The "so"
  opener is the reel's signature, not the article's. Don't use it here.
- 4-7 short paragraphs. No headings, no bullet lists, no bold, no emoji, no inline links.
- Cover: what it is, what actually happened / how it works, why it matters, and what he
  actually thinks. ONE real opinion, stated plainly.
- Every fact verified — you have web tools, use them. Real names, real numbers. Nothing invented.
  If the script leaned on a claim you can't verify, drop the claim, don't dress it up.
- Ends when the point lands. No summary paragraph, no "time will tell", no question to the reader.
- Everything in VOICE.md's "sounds like AI" list applies double here.`.trim();

export async function writeSiteCopy(args: {
  topic: string;
  script: string;
  type: PostType;
  toolUrl?: string;
  context?: string; // what research found (whyNow + links) — ground truth
}): Promise<SiteCopy> {
  const news = args.type === "news";
  const prompt = [
    voiceDoc(),
    "\n---",
    news ? LONG_FORM_RULES : "",
    `\nThe reel (already approved and posted) — topic: ${args.topic}`,
    `Post type: ${args.type}`,
    args.toolUrl ? `Tool homepage: ${args.toolUrl}` : "",
    args.context ? `What research found:\n${args.context}` : "",
    `The spoken script:\n${args.script}`,
    news
      ? `\nWrite the site copy for this news post:
- "title": a plain declarative headline, sentence case, under 70 characters. Says what happened.
  No colon-clickbait, no question, no "here's why".
- "blurb": ONE sentence, under 120 characters, what it is / what happened. No CTA, no hype.
- "article": the short read, per the long-form rules above. Plain text, paragraphs separated by
  a blank line.`
      : `\nWrite the site copy for this tool post:
- "title": the tool's actual name, as its makers write it (e.g. "Claude Code", "Ollama").
- "blurb": ONE sentence, under 120 characters, what it does for you. Concrete, no adjectives
  doing the work, no CTA.
No article for tool posts — the block links straight to the tool.`,
    `Return ONLY JSON: {"title":"...","blurb":"..."${news ? ',"article":"..."' : ""}}`,
  ]
    .filter(Boolean)
    .join("\n");

  const out = await claudeJson<SiteCopy>(prompt, { model: "opus", tools: WRITER_TOOLS, cwd: REPO_ROOT, timeoutMs: 8 * 60_000 });
  const title = (out.title || args.topic).trim().slice(0, 120);
  const blurb = (out.blurb || "").trim().slice(0, 200);
  const article = news ? (out.article || "").trim() : undefined;
  if (news && !article) throw new Error("article came back empty");
  return { title, blurb, article };
}
