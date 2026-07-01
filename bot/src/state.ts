import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { REPO_ROOT } from "./config.js";

// Per-chat working state for the current reel. Persisted to disk so a bot restart or WSL VM
// reboot doesn't lose an in-flight reel (which used to cause "Nothing to post" after a restart).
export type Pending = {
  topic: string;
  script: string;
  clipPath?: string;
  mp4Path?: string;
  caption?: string; // the generated Instagram post caption
  // "script" = we've sent a script and are taking free-text revisions until a clip arrives.
  // "reel"   = a clip was sent (script locked); free text is ignored unless [Edit] was tapped.
  stage?: "script" | "reel";
  awaitingEdit?: boolean;
  posting?: boolean; // a publish is in flight — guards against double-taps on [Post]
};

const FILE = resolve(REPO_ROOT, ".bot-state.json");
const store = new Map<string, Pending>();

// load any persisted state on boot
try {
  const raw = readFileSync(FILE, "utf8");
  for (const [k, v] of Object.entries(JSON.parse(raw) as Record<string, Pending>)) store.set(k, v);
} catch {
  /* no state file yet — fine */
}

function persist() {
  try {
    writeFileSync(FILE, JSON.stringify(Object.fromEntries(store)));
  } catch (e) {
    console.error("state persist failed", e);
  }
}

export const state = {
  get: (chat: string) => store.get(chat),
  set: (chat: string, p: Pending) => {
    store.set(chat, p);
    persist();
  },
  patch: (chat: string, p: Partial<Pending>) => {
    store.set(chat, { ...(store.get(chat) as Pending), ...p });
    persist();
  },
  clear: (chat: string) => {
    store.delete(chat);
    persist();
  },
};
