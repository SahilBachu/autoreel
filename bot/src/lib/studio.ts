import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { spawn } from "node:child_process";
import { claude } from "./claude.js";
import { config } from "../config.js";

// Builds the director's bespoke "custom" scenes at render time: an agentic Opus session
// writes the component into studio/src/auto/generated/ and registers it; we then typecheck.
// Any failure reverts the registry and drops the custom scenes — a render can never break.

function tsc(studio: string): Promise<{ ok: boolean; errors: string }> {
  return new Promise((res) => {
    const p = spawn("npx", ["tsc", "--noEmit"], { cwd: studio, shell: process.platform === "win32" });
    let out = "";
    p.stdout.on("data", (d) => (out += d));
    p.stderr.on("data", (d) => (out += d));
    p.on("error", () => res({ ok: false, errors: "tsc failed to run" }));
    p.on("close", (code) => res({ ok: code === 0, errors: out.slice(0, 2000) }));
  });
}

const AGENT_TOOLS = ["Read", "Write", "Edit", "Glob", "Grep"];

export async function buildCustomScenes(scenes: any[], videoId: string): Promise<any[]> {
  const customs = scenes.filter((s) => s.kind === "custom" && s.name && s.spec);
  if (!customs.length) return scenes.filter((s) => s.kind !== "custom");

  const studio = config.studioDir;
  const registry = resolve(studio, "src/auto/generated/index.ts");
  const registryBefore = await readFile(registry, "utf8").catch(() => "");

  const brief = customs
    .map((c) => `- name: ${c.name}\n  spec: ${c.spec}\n  props it will receive: ${JSON.stringify(c.props ?? {})}`)
    .join("\n");

  const prompt = `You are building bespoke Remotion scene components for ONE video (id ${videoId})
inside this studio project (cwd = studio root). Build these:
${brief}

REQUIREMENTS (all mandatory):
1. Read src/auto/theme.ts and src/auto/fx.tsx first — reuse their pieces.
2. For each component: create src/auto/generated/${videoId}-<Name>.tsx exporting a React.FC
   that takes the props above. Visual language: dark glassy panels, hairline borders (T tokens),
   Geist fonts (F2), the video accent via useAccent() — NEVER hardcode colors.
3. ALL motion frame-deterministic: useCurrentFrame + spring/interpolate. No wall-clock, no
   Math.random (use remotion's random(seed)), no external animation libs.
4. Wrap the content in <Scene bg="plain|grid|shader"> from fx.tsx (keeps clear of captions).
   Design for 1080x1920; content fits within ~950px width.
5. Register each in src/auto/generated/index.ts: import it and add to the GENERATED map under
   the key "<Name>" (exactly the name above, no video id in the key).
6. Keep it self-contained and type-safe (strict TS). No new npm dependencies.
Reply DONE when finished.`;

  try {
    await claude(prompt, { model: "opus", tools: AGENT_TOOLS, cwd: studio });
    const check = await tsc(studio);
    if (!check.ok) {
      // one repair attempt with the actual compiler output
      await claude(
        `Your generated scene components in src/auto/generated/ fail typecheck. Fix them (do not touch other files):\n${check.errors}\nReply DONE when fixed.`,
        { model: "opus", tools: AGENT_TOOLS, cwd: studio },
      );
      const again = await tsc(studio);
      if (!again.ok) throw new Error(`custom scenes failed typecheck: ${again.errors.slice(0, 300)}`);
    }
    // success: custom scenes stay in the plan (AutoReel resolves them via the registry)
    return scenes;
  } catch (e) {
    console.error("custom scene build failed — dropping customs:", (e as Error).message);
    await writeFile(registry, registryBefore).catch(() => {});
    return scenes.filter((s) => s.kind !== "custom");
  }
}
