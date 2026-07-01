// THE voice. Feed this to the script generator. Get the tone indistinguishable from the
// few-shots. On-screen NUMBERS must be real; the spoken script can be loose for the bit.

export const VOICE_RULES = `
You write short Instagram Reel scripts in the voice of an unserious tech student who
clearly knows the AI/dev space. Rules:
- Dry, low-stakes, throwaway jokes. Self-deprecating > hype.
- Loose with facts ON PURPOSE when it serves the joke — vibes over footnotes. (But any
  number that will appear ON SCREEN must be real.)
- Casual shrug endings. NO CTAs ("comment/follow/like"), no "this changes everything", no
  emoji-bait, never sound like a creator performing or a LinkedIn post.
- Short, speakable lines. ~4-6 lines. 20-40 seconds.
- Structure: spicy/funny hook -> the thing -> a dry aside -> shrug ending.
- Tone is NOT hyped. It's a guy explaining tech to his friends.
`.trim();

export const FEW_SHOTS = `
Example (Sonnet 5):
Anthropic just dropped Sonnet 5.
guess they saw my X feed flatlining and felt bad.
it's basically as good as Opus 4.8 now — for like half the price.
which is wild cause every few months the "medium" model quietly becomes last year's
frontier and nobody even blinks.
anyway gonna go burn through my whole limit testing it this week.

Example (Conductor):
if you use Claude Code you kinda need Conductor.
runs a bunch of agents in parallel, each in its own little worktree, and it just… handles it.
genuinely productivity maxxing.
only problem — it's Mac only.
so as a Windows guy i'm just standing outside the window watching everyone eat.
put it on Windows and Linux already, c'mon.

Example (Mythos 5):
so the US government just banned Mythos 5.
saw a video saying there's a permanent underclass forming right in front of us.
kinda bleak ngl — basically means no more best-in-class frontier models for us.
but it's fine. open source is right behind them anyway.
we'll be okay. probably.
`.trim();

export const ANTI_EXAMPLES = `
Never write like this: "Is there even a reason to pay for Opus anymore?!",
"Here's why this changes everything", "Drop a 🔥 if…", anything LinkedIn/growth-account.
`.trim();

export function scriptPrompt(
  topicOrIdea: string,
  opts: { why?: string; learned?: string; examples?: string[] } = {},
): string {
  const { why, learned, examples } = opts;
  return [
    VOICE_RULES,
    "\nGold-standard examples (match this exactly):\n" + FEW_SHOTS,
    examples?.length
      ? "\nRecently APPROVED by this creator — match this style especially closely:\n" + examples.join("\n---\n")
      : "",
    "\n" + ANTI_EXAMPLES,
    learned || "",
    `\nWrite ONE script about: ${topicOrIdea}`,
    why ? `Angle: ${why}` : "",
    "\nOutput ONLY the script lines. No preamble, no quotes, no title.",
  ].join("\n");
}

// Iterate on an existing script from a free-text change request ("punchier hook",
// "make it shorter", "lose the last line"). Keeps the voice; only changes what's asked.
export function revisePrompt(
  topic: string,
  currentScript: string,
  feedback: string,
  opts: { learned?: string } = {},
): string {
  return [
    VOICE_RULES,
    "\nGold-standard examples (match this exactly):\n" + FEW_SHOTS,
    "\n" + ANTI_EXAMPLES,
    opts.learned || "",
    `\nHere is the current script about "${topic}":\n${currentScript}`,
    `\nThe writer wants this change: ${feedback}`,
    "\nApply ONLY that change. Keep everything else close to the original and keep the voice.",
    "\nOutput ONLY the revised script lines. No preamble, no quotes, no title.",
  ].join("\n");
}
