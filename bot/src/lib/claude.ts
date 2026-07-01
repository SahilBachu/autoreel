import { spawn } from "node:child_process";

// Headless Claude Code call. Draws from the Max subscription — keep prompts lean,
// schedule-driven, no 24/7 loops (see brief §6).
export function claude(prompt: string, opts: { json?: boolean } = {}): Promise<string> {
  return new Promise((res, rej) => {
    const args = ["-p", prompt, "--output-format", opts.json ? "json" : "text"];
    // stdin: "ignore" -> the CLI won't stall 3s waiting for piped stdin (prompt is an arg).
    const p = spawn("claude", args, { shell: false, stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    let err = "";
    p.stdout.on("data", (d) => (out += d));
    p.stderr.on("data", (d) => (err += d));
    p.on("error", rej);
    p.on("close", (code) =>
      code === 0 ? res(out.trim()) : rej(new Error(`claude exited ${code}: ${err}`)),
    );
  });
}

// Convenience: ask for JSON and parse it (director/scene-plan/component generation).
export async function claudeJson<T>(prompt: string): Promise<T> {
  const raw = await claude(prompt + "\n\nReturn ONLY valid JSON — no markdown fences, no prose.", { json: false });
  return JSON.parse(extractJson(raw)) as T;
}

// Pull the first balanced JSON value out of a model response — tolerant of ```json fences,
// leading/trailing prose, etc. (the old naive slice broke on any trailing characters).
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
