import "dotenv/config";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { config as loadEnv } from "dotenv";

// load the repo-root .env (one level above bot/)
const here = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = resolve(here, "../..");
loadEnv({ path: resolve(REPO_ROOT, ".env") });

function req(name: string): string {
  const v = process.env[name];
  if (!v || v.startsWith("<FILL")) throw new Error(`Missing env: ${name}`);
  return v;
}

export const config = {
  repoRoot: REPO_ROOT,
  studioDir: resolve(REPO_ROOT, "studio"),
  telegram: {
    token: req("TELEGRAM_BOT_TOKEN"),
    chatId: req("TELEGRAM_CHAT_ID"),
    apiRoot: process.env.TELEGRAM_BOT_API_BASE_URL || "http://localhost:8081",
  },
  ig: {
    base: process.env.IG_GRAPH_BASE_URL || "https://graph.instagram.com",
    token: process.env.IG_ACCESS_TOKEN || "",
    userId: process.env.IG_USER_ID || "",
  },
  supabase: {
    url: process.env.SUPABASE_URL || "",
    serviceKey: process.env.SUPABASE_SERVICE_KEY || "",
    bucket: process.env.SUPABASE_BUCKET || "reels",
  },
};
