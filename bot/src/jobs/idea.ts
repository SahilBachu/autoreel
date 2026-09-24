import { claude, claudeSession } from "../lib/claude.js";
import { REVISE_TOOLS_LINE, revisePrompt, scriptPrompt, stripAiTells, type PostType } from "../lib/voice.js";
import { REPO_ROOT } from "../config.js";
import { WRITER_TOOLS, foundContext, logPitch, readPitchLog, research, verifyTopic, type Found } from "./discover.js";

export type Idea = {
  topic: string;
  script: string;
  sessionId?: string;
  type: PostType;
  toolUrl?: string;
  context?: string; // what research found — carried to post time for the site's article
  source?: string; // where discovery saw it moving
  // research found nothing for the user's description — no script was written; ask first
  unverified?: boolean;
  note?: string;
};

// Random idea (no description) or a described one -> topic + script (VOICE.md loaded).
// Both go through real research first: a random idea IS one morning-digest card; a
// described one is verified with verifyTopic() and, if nothing solid turns up, comes back
// `unverified` with NO script — the bot asks before writing from the description alone.
// The script call opens a SESSION (Opus, with web tools) so revisions resume with context.
export async function generateIdea(
  description?: string,
  opts: { fromDescriptionOnly?: boolean; forceType?: PostType } = {},
): Promise<Idea> {
  let found: Found;
  if (!description?.trim()) {
    // the morning researcher, one card at a time: lens-driven, deduped against what's been
    // pitched, and real — instead of a topic pulled from training data
    const [f] = await research(1, await readPitchLog());
    if (!f?.topic) throw new Error("research came back empty");
    found = f;
    await logPitch([f.topic], "pitched");
  } else if (opts.fromDescriptionOnly) {
    // the user said "write it anyway" — description is the only source, and the writer is
    // told exactly that
    found = { topic: description.trim(), type: "news", whyNow: "", links: [] }; // no verified URL = can't be a tool
  } else {
    const v = await verifyTopic(description, opts.forceType);
    if (!v.found) return { topic: description.trim(), script: "", type: opts.forceType ?? "news", unverified: true, note: v.note };
    found = v.card;
  }

  const { text, sessionId } = await claudeSession(
    scriptPrompt(found.topic, {
      angle: found.angle,
      type: found.type,
      toolUrl: found.toolUrl,
      context: opts.fromDescriptionOnly ? undefined : foundContext(found),
      fromDescriptionOnly: opts.fromDescriptionOnly,
    }),
    { tools: WRITER_TOOLS, cwd: REPO_ROOT },
  );
  return {
    topic: found.topic,
    script: stripAiTells(text.trim()),
    sessionId,
    type: found.type,
    toolUrl: found.toolUrl,
    context: opts.fromDescriptionOnly ? undefined : foundContext(found),
    source: found.source,
  };
}

// Revise by RESUMING the original session (remembers the whole back-and-forth).
// Falls back to a fresh voice-loaded call if the session is gone. Both get web tools —
// "is it actually free?" mid-revision is a question the writer has to be able to check.
export async function reviseScript(
  topic: string,
  currentScript: string,
  feedback: string,
  sessionId?: string,
): Promise<{ script: string; sessionId?: string }> {
  if (sessionId) {
    try {
      const { text, sessionId: sid } = await claudeSession(
        `Revise the current script. Change requested: ${feedback}\n${REVISE_TOOLS_LINE}\nOutput ONLY the revised script lines — no preamble, no 'Sources:' block.`,
        { resume: sessionId, tools: WRITER_TOOLS, cwd: REPO_ROOT },
      );
      if (text) return { script: stripAiTells(text.trim()), sessionId: sid ?? sessionId };
    } catch {
      /* fall through to cold revision */
    }
  }
  const script = stripAiTells((await claude(revisePrompt(topic, currentScript, feedback), { tools: WRITER_TOOLS, cwd: REPO_ROOT })).trim());
  return { script };
}
