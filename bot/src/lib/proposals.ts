import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { config, REPO_ROOT } from "../config.js";
import { claude, claudeJson } from "./claude.js";
import { setStyleMode } from "./style.js";
import { stripAiTells } from "./voice.js";

// PROPOSALS — the analyst doesn't change the system on its own; it asks. Each proposal is one
// Telegram message with [Approve] [Deny]:
//   approve → the change is applied (to the one file it targets, or a setting) and confirmed
//   deny    → recorded, so it isn't proposed again
//   ignore  → nothing happens
//   reply to the message → the proposal is revised to his note and re-sent for a decision
// Targets are deliberately limited to the hand-edited brand docs and safe settings — never code.

export type Target = "voice" | "discovery" | "design" | "style";
export type Proposal = {
  id: string;
  title: string; // what changes, in a few words
  why: string; // the evidence, one line
  change: string; // exactly what will be changed
  target: Target;
  status: "open" | "approved" | "denied" | "revised" | "failed";
  messageId?: number;
  createdAt: string;
  decidedAt?: string;
  result?: string;
};

const FILE = resolve(REPO_ROOT, "bot/data/proposals.json");
export const TARGET_FILES: Record<Exclude<Target, "style">, string> = {
  voice: "VOICE.md", // how scripts are written
  discovery: "DISCOVERY.md", // where topics come from, what counts, what to skip, topic mix
  design: "DESIGN.md", // how videos look
};
export const TARGET_HELP = `voice = VOICE.md (script rules: hooks, length, tone, CTA) · discovery = DISCOVERY.md (topic sources, creators, subreddits, what counts / skip, tool vs news mix) · design = DESIGN.md (how the videos look) · style = the renderer setting ("world" | "v2" | "alternate" — put the value in "change")`;

export function loadProposals(): Proposal[] {
  try {
    return JSON.parse(readFileSync(FILE, "utf8"));
  } catch {
    return [];
  }
}
function save(ps: Proposal[]) {
  if (!existsSync(resolve(REPO_ROOT, "bot/data"))) mkdirSync(resolve(REPO_ROOT, "bot/data"), { recursive: true });
  writeFileSync(FILE, JSON.stringify(ps.slice(-200), null, 2));
}
export function updateProposal(id: string, patch: Partial<Proposal>): Proposal | undefined {
  const ps = loadProposals();
  const p = ps.find((x) => x.id === id);
  if (!p) return undefined;
  Object.assign(p, patch);
  save(ps);
  return p;
}
export const findByMessage = (messageId: number) => loadProposals().find((p) => p.messageId === messageId);

/** For the analyst's prompt: what it already asked, and what he said. */
export function proposalHistory(): string {
  const ps = loadProposals().slice(-25);
  if (!ps.length) return "";
  return ps.map((p) => `- [${p.status}] ${p.title}: ${p.change}`).join("\n");
}

export function formatProposal(p: Proposal): string {
  return `💡 proposal: ${p.title}\n\nwhy: ${p.why}\n\nchange: ${p.change}\n\n(${p.target === "style" ? "setting" : TARGET_FILES[p.target]} · reply to this to adjust it)`;
}

const keyboard = (id: string) => ({
  inline_keyboard: [[{ text: "Approve", callback_data: `prop:a:${id}` }, { text: "Deny", callback_data: `prop:d:${id}` }]],
});

// raw Bot API, so the 3am job (a separate process from the bot) can send these too
async function tg(method: string, body: Record<string, unknown>): Promise<any> {
  const r = await fetch(`${config.telegram.apiRoot}/bot${config.telegram.token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return r.json();
}

/** Store and send one proposal; returns it with its message id. */
export async function sendProposal(raw: Pick<Proposal, "title" | "why" | "change" | "target">): Promise<Proposal> {
  const p: Proposal = { ...raw, id: Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36), status: "open", createdAt: new Date().toISOString() };
  const res = await tg("sendMessage", { chat_id: config.telegram.chatId, text: formatProposal(p), reply_markup: keyboard(p.id) });
  p.messageId = res?.result?.message_id;
  save([...loadProposals(), p]);
  return p;
}

/** Approved: make the change. Doc targets get a minimal edit by the model, to that file only. */
export async function applyProposal(p: Proposal): Promise<string> {
  if (p.target === "style") {
    const v = /alternate/i.test(p.change) ? "alternate" : /\bv2\b/i.test(p.change) ? "v2" : "world";
    setStyleMode(v);
    return `renderer set to ${v}`;
  }
  const file = TARGET_FILES[p.target];
  if (!file) throw new Error(`unknown target ${p.target}`);
  const out = await claude(
    `Sahil approved this change to ${file} (his brand/strategy doc that the automation reads):
TITLE: ${p.title}
WHY: ${p.why}
CHANGE: ${p.change}

Read ${file}, then make exactly this change with a minimal, careful edit: keep the file's structure,
voice and formatting, put it in the section it belongs in, and remove or rewrite anything it now
contradicts. Edit ONLY ${file}. No em dashes or en dashes. Then reply with one short line saying what
you changed.`,
    { tools: ["Read", "Edit"], cwd: REPO_ROOT, timeoutMs: 5 * 60_000 },
  );
  return stripAiTells(out.trim().split("\n").filter(Boolean).pop() ?? "done");
}

/** He replied to a proposal: rewrite it to his note, keep the same target unless he says otherwise. */
export async function reviseProposal(p: Proposal, note: string): Promise<Pick<Proposal, "title" | "why" | "change" | "target">> {
  const r = await claudeJson<Pick<Proposal, "title" | "why" | "change" | "target">>(
    `A proposal you sent sahil:
${JSON.stringify({ title: p.title, why: p.why, change: p.change, target: p.target })}

He replied: "${note}"

Rewrite the proposal to do what he's asking (it may narrow it, widen it, or change its direction).
Keep it concrete and short. Targets: ${TARGET_HELP}
Return JSON {"title","why","change","target"}. No em dashes.`,
    { timeoutMs: 3 * 60_000 },
  );
  const target = (["voice", "discovery", "design", "style"].includes(r.target) ? r.target : p.target) as Target;
  return { title: stripAiTells(r.title || p.title), why: stripAiTells(r.why || p.why), change: stripAiTells(r.change || p.change), target };
}
