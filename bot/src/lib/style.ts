import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { config, REPO_ROOT } from "../config.js";

// Two renderers, one director. The plan is identical either way:
//   v2    — AutoReel: scenes hard-cut over the talking head, the established look
//   world — WorldReel: the same scenes are objects in one world, a camera travels
//           between them, and they overlap him instead of covering him
// Videos alternate by default so the feed doesn't settle into one rhythm. VIDEO_STYLE
// (or /style in Telegram) pins it to one renderer when that's not wanted.
//
// Alternation is keyed to the TOPIC, not to each render: a Redo or an Edit of the same
// reel keeps the style it already had, and only the next topic flips.

export type RenderStyle = "v2" | "world";
export type StyleMode = "alternate" | RenderStyle;

type StyleState = { last?: RenderStyle; current?: { topic: string; style: RenderStyle }; force?: StyleMode };

const FILE = resolve(REPO_ROOT, "bot/data/style.json");

function load(): StyleState {
  try {
    return JSON.parse(readFileSync(FILE, "utf8")) as StyleState;
  } catch {
    return {};
  }
}
function save(s: StyleState) {
  try {
    if (!existsSync(resolve(REPO_ROOT, "bot/data"))) mkdirSync(resolve(REPO_ROOT, "bot/data"), { recursive: true });
    writeFileSync(FILE, JSON.stringify(s, null, 2));
  } catch (e) {
    console.error("style persist failed", e);
  }
}

/** What /style set, else what .env says. */
export function styleMode(): StyleMode {
  return load().force ?? config.style.mode;
}

/** Pin the renderer (or resume alternating). Returns the mode now in force. */
export function setStyleMode(mode: StyleMode): StyleMode {
  const s = load();
  s.force = mode;
  save(s);
  return mode;
}

/** The style this topic renders in — stable across Redo/Edit, flipped for a new topic. */
export function pickStyle(topic: string): RenderStyle {
  const mode = styleMode();
  if (mode !== "alternate") return mode;
  const s = load();
  if (s.current?.topic === topic) return s.current.style;
  const style: RenderStyle = s.last === "world" ? "v2" : "world";
  save({ ...s, last: style, current: { topic, style } });
  return style;
}

export const compositionFor = (style: RenderStyle) => (style === "world" ? "WorldReel" : "AutoReel");

export function styleStatus(): string {
  const s = load();
  const mode = styleMode();
  return [
    `style: ${mode === "alternate" ? "alternating between both" : `pinned to ${mode}`}`,
    s.current ? `this reel: ${s.current.style}` : "",
    mode === "alternate" ? `next new topic: ${s.last === "world" ? "v2" : "world"}` : "",
    "",
    "v2 = the original look (scenes cut full-screen over you)",
    "world = one connected world, camera pans between the cards, they overlap you",
    "",
    "/style v2 · /style world · /style alternate",
  ]
    .filter((l) => l !== undefined)
    .join("\n");
}
