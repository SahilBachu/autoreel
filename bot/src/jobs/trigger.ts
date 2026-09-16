import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { REPO_ROOT } from "../config.js";

// Drop an idea into the running bot's trigger inbox (see the bottom of index.ts). It shows up
// in the Telegram chat as if it had been typed there.
//   npm run trigger -- "idea: ollama lets you run models locally"
//   npm run trigger -- idea            (a random researched one)
const text = process.argv.slice(2).join(" ").trim();
if (!/^((idea|news|tool):\s*\S|\/?(idea|retrysite)$)/i.test(text)) {
  console.error('usage: npm run trigger -- "idea:|news:|tool: <what it is>"   |   npm run trigger -- idea|retrysite');
  process.exit(1);
}
const dir = resolve(REPO_ROOT, "bot/data/trigger");
await mkdir(dir, { recursive: true });
await writeFile(resolve(dir, `${Date.now()}.txt`), text);
console.log(`queued — the bot picks it up within ~5s: ${text}`);
