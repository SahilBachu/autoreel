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
