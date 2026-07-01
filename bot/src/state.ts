// Per-chat working state for the current reel (in-memory; fine for a single-user bot).
export type Pending = {
  topic: string;
  script: string;
  clipPath?: string;
  mp4Path?: string;
  awaitingEdit?: boolean;
};

const store = new Map<string, Pending>();

export const state = {
  get: (chat: string) => store.get(chat),
  set: (chat: string, p: Pending) => store.set(chat, p),
  patch: (chat: string, p: Partial<Pending>) =>
    store.set(chat, { ...(store.get(chat) as Pending), ...p }),
  clear: (chat: string) => store.delete(chat),
};
