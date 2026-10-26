import { buildDigest, formatDigest, sendToChat } from "./discover.js";
import { ClaudeAuthError } from "../lib/claude.js";
import { chunkForTelegram, runAnalytics } from "./analytics.js";
import { sendProposal } from "../lib/proposals.js";

// The 3am job (systemd timer autoreel-digest.timer): analytics report, then research → 3 topic
// cards with scripts → Telegram. Run manually with: npm run digest
//
// It used to fail silently: one bad night meant no message at all and no idea why. Now a
// transient failure (network, a CLI hiccup) retries twice, five minutes apart — inside the
// unit's 30-minute TimeoutStartSec — and any final failure is told to sahil with the reason.
// A logged-out Claude isn't retried: nothing changes until a human logs back in.
const ATTEMPTS = 3;
const WAIT_MS = 5 * 60_000;

// The analytics report goes FIRST: it refreshes bot/data/performance.md, which the topic
// research reads — so this morning's ideas already know what performed yesterday. A failed
// report never blocks the ideas.
try {
  const { report, proposals } = await runAnalytics();
  for (const part of chunkForTelegram(`📊 daily report

${report}`)) await sendToChat(part);
  // each proposed change is its own message: Approve / Deny / reply to adjust / ignore
  for (const p of proposals) await sendProposal(p).catch((e) => console.error("proposal send failed:", e?.message));
  console.log(`analytics report sent (${proposals.length} proposal${proposals.length === 1 ? "" : "s"})`);
} catch (e: any) {
  console.error("analytics failed:", e?.message ?? e);
  if (e instanceof ClaudeAuthError) {
    await sendToChat(`⚠️ no ideas or report this morning: ${e.message}`).catch(() => {});
    process.exit(1);
  }
  await sendToChat(`(couldn't build today's analytics report: ${String(e?.message ?? e).slice(0, 200)})`).catch(() => {});
}

// Mondays: the standing reminder sahil asked for (Oct 2026). Meta's spam policy lists "requiring
// users to … follow … to gain access to content" as not allowed, which is what the strict DM gate
// does; he chose to keep it for now and be reminded weekly.
if (new Date().getDay() === 1 && (process.env.DM_FOLLOW_GATE || "strict") === "strict") {
  await sendToChat(
    "weekly reminder: the DM follow gate is still on strict. Meta's spam rules don't allow requiring a follow to get content, so it's a risk to the DM feature (usually a warning or a DM limit first, not an instant ban). Switching to soft = ask once, send the link either way. Set DM_FOLLOW_GATE=soft in .env when you're ready.",
  ).catch(() => {});
}

for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
  try {
    const digest = await buildDigest(3);
    await sendToChat(formatDigest(digest));
    console.log(`digest sent: ${digest.cards.map((c) => c.topic).join(" | ")}`);
    process.exit(0);
  } catch (e: any) {
    const msg = String(e?.message ?? e);
    console.error(`digest attempt ${attempt} failed: ${msg}`);
    if (e instanceof ClaudeAuthError) {
      await sendToChat(`⚠️ no ideas this morning: ${msg}`).catch(() => {});
      process.exit(1);
    }
    if (attempt === ATTEMPTS) {
      await sendToChat(`⚠️ no ideas this morning: research failed ${ATTEMPTS} times.\nlast error: ${msg.slice(0, 300)}\n\nsend /discover to try again.`).catch(() => {});
      process.exit(1);
    }
    await new Promise((r) => setTimeout(r, WAIT_MS));
  }
}
