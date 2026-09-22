import { spawn } from "node:child_process";

// Headless Claude Code calls. Draws from the Max subscription — keep prompts lean.
// Complex creative steps (script, director, discovery) run on Opus; cheap utility
// calls (captions etc.) stay on the default model.

type Opts = { model?: string; resume?: string; json?: boolean; tools?: string[]; cwd?: string; timeoutMs?: number };

// The runner's Claude login can expire. When it does EVERY writing step fails the same way, so
// it gets its own error type — callers tell sahil what to do instead of retrying something that
// can't succeed until a human logs back in.
const AUTH_FAILURE = /failed to authenticate|oauth session expired|please run \/login|invalid api key|not logged in|authentication_error/i;
export class ClaudeAuthError extends Error {
  constructor(detail: string) {
    super(`Claude is logged out on the runner (${detail.slice(0, 120)}). Fix: on the runner run \`claude setup-token\`, then put the token in .env as CLAUDE_CODE_OAUTH_TOKEN and restart the bot.`);
    this.name = "ClaudeAuthError";
  }
}

function run(args: string[], cwd?: string, timeoutMs?: number): Promise<string> {
  return new Promise((res, rej) => {
    // stdin: "ignore" -> the CLI won't stall 3s waiting for piped stdin (prompt is an arg).
    const p = spawn("claude", args, { shell: false, stdio: ["ignore", "pipe", "pipe"], cwd });
    let out = "";
    let err = "";
    // a hung CLI call (auth prompt, network) would otherwise block a render forever
    const timer = timeoutMs
      ? setTimeout(() => {
          p.kill("SIGKILL");
          rej(new Error(`claude timed out after ${Math.round(timeoutMs / 1000)}s`));
        }, timeoutMs)
      : undefined;
    p.stdout.on("data", (d) => (out += d));
    p.stderr.on("data", (d) => (err += d));
    p.on("error", rej);
    p.on("close", (code) => {
      if (timer) clearTimeout(timer);
      if (code === 0) return res(out.trim());
      // the CLI prints some of its failures (auth among them) to STDOUT, so an stderr-only
      // message came back blank — "claude exited 1: " — and hid the actual reason
      const why = (err.trim() || out.trim()).slice(-400);
      if (AUTH_FAILURE.test(why)) return rej(new ClaudeAuthError(why));
      rej(new Error(`claude exited ${code}: ${why}`));
    });
  });
}

function baseArgs(prompt: string, opts: Opts): string[] {
  const args = ["-p", prompt];
  if (opts.model) args.push("--model", opts.model);
  if (opts.resume) args.push("--resume", opts.resume);
  // agentic mode: grant specific tools (Write/Read/WebSearch/...) to a headless call
  if (opts.tools?.length) args.push("--allowedTools", opts.tools.join(","), "--permission-mode", "acceptEdits");
  return args;
}

export async function claude(prompt: string, opts: Opts = {}): Promise<string> {
  return run([...baseArgs(prompt, opts), "--output-format", "text"], opts.cwd, opts.timeoutMs);
}

// Start (or continue) a conversation and get the session id back, so revisions can
// RESUME the same session instead of starting cold each time.
export async function claudeSession(
  prompt: string,
  opts: Opts = {},
): Promise<{ text: string; sessionId?: string }> {
  const raw = await run([...baseArgs(prompt, opts), "--output-format", "json"], opts.cwd, opts.timeoutMs);
  try {
    const j = JSON.parse(raw);
    return { text: (j.result ?? "").trim(), sessionId: j.session_id };
  } catch {
    return { text: raw.trim() };
  }
}

// Convenience: ask for JSON and parse it (director/scene-plan/component generation).
export async function claudeJson<T>(prompt: string, opts: Opts = {}): Promise<T> {
  const raw = await claude(prompt + "\n\nReturn ONLY valid JSON — no markdown fences, no prose.", opts);
  return JSON.parse(extractJson(raw)) as T;
}

// Pull the first balanced JSON value out of a model response — tolerant of ```json fences,
// leading/trailing prose, etc. (a naive slice broke on any trailing characters).
function extractJson(raw: string): string {
  const s = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
  const candidates = [s.indexOf("["), s.indexOf("{")].filter((n) => n >= 0);
  if (!candidates.length) return s;
  const i = Math.min(...candidates);
  const open = s[i];
  const close = open === "[" ? "]" : "}";
  let depth = 0, inStr = false, esc = false;
  for (let j = i; j < s.length; j++) {
    const c = s[j];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
    } else if (c === '"') inStr = true;
    else if (c === open) depth++;
    else if (c === close && --depth === 0) return s.slice(i, j + 1);
  }
  return s.slice(i);
}
