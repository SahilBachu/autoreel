import { buildDigest, formatDigest, sendToChat } from "./discover.js";
import { ClaudeAuthError } from "../lib/claude.js";

// The 3am job (systemd timer autoreel-digest.timer): research → 3 topic cards with scripts →
// Telegram. Run manually with: npm run digest
//
// It used to fail silently: one bad night meant no message at all and no idea why. Now a
// transient failure (network, a CLI hiccup) retries twice, five minutes apart — inside the
// unit's 30-minute TimeoutStartSec — and any final failure is told to sahil with the reason.
// A logged-out Claude isn't retried: nothing changes until a human logs back in.
const ATTEMPTS = 3;
const WAIT_MS = 5 * 60_000;

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
