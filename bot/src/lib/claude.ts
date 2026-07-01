import { spawn } from "node:child_process";

// Headless Claude Code call. Draws from the Max subscription — keep prompts lean,
// schedule-driven, no 24/7 loops (see brief §6).
export function claude(prompt: string, opts: { json?: boolean } = {}): Promise<string> {
  return new Promise((res, rej) => {
    const args = ["-p", prompt, "--output-format", opts.json ? "json" : "text"];
    const p = spawn("claude", args, { shell: false });
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
  const raw = await claude(prompt + "\n\nReturn ONLY valid JSON.", { json: false });
  const start = raw.indexOf("{");
  const startArr = raw.indexOf("[");
  const s = start === -1 ? startArr : startArr === -1 ? start : Math.min(start, startArr);
  return JSON.parse(raw.slice(s)) as T;
}
