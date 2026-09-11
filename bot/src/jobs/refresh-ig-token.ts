import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { REPO_ROOT, config } from "../config.js";
import { sendToChat } from "./discover.js";

// Instagram long-lived tokens last 60 days and must be refreshed before they expire (an
// expired token can't be refreshed — only re-auth from scratch fixes that). Run this well
// inside the window, e.g. every 45 days via cron on the runner: `npm run refresh-ig-token`.
const ENV_PATH = resolve(REPO_ROOT, ".env");

async function main() {
  if (!config.ig.token) throw new Error("IG_ACCESS_TOKEN not set");

  const url = new URL(`${config.ig.base}/refresh_access_token`);
  url.searchParams.set("grant_type", "ig_refresh_token");
  url.searchParams.set("access_token", config.ig.token);

  const r = await fetch(url);
  const j = (await r.json()) as { access_token?: string; expires_in?: number; error?: unknown };
  if (!r.ok || !j.access_token) throw new Error(`IG refresh failed: ${JSON.stringify(j)}`);

  const env = await readFile(ENV_PATH, "utf8");
  if (!/^IG_ACCESS_TOKEN=.*$/m.test(env)) throw new Error("IG_ACCESS_TOKEN= line not found in .env");
  await writeFile(ENV_PATH, env.replace(/^IG_ACCESS_TOKEN=.*$/m, `IG_ACCESS_TOKEN=${j.access_token}`));

  const days = Math.round((j.expires_in ?? 0) / 86400);
  const nextBy = new Date(Date.now() + (j.expires_in ?? 0) * 1000 - 15 * 86400_000);
  console.log(`IG access token refreshed, valid ~${days}d, refresh again by ${nextBy.toDateString()}`);
}

main().catch(async (err) => {
  console.error(err);
  await sendToChat(`⚠️ Instagram token refresh FAILED: ${err.message}\nRe-auth needed before the current token expires.`);
  process.exit(1);
});
