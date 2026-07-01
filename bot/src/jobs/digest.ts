import { buildDigest, formatDigest, sendToChat } from "./discover.js";

// The 3am job (systemd timer autoreel-digest.timer): research → 3 topic cards with scripts →
// Telegram. Run manually with: npm run digest
const digest = await buildDigest(3);
await sendToChat(formatDigest(digest));
console.log(`digest sent: ${digest.cards.map((c) => c.topic).join(" | ")}`);
