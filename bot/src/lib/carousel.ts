import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { config, REPO_ROOT } from "../config.js";
import { claude, claudeJson } from "./claude.js";
import { screenshot } from "./shot.js";
import type { Card } from "../jobs/discover.js";

// THE DISPATCH — a news card as a swipeable carousel (design: studio/src/carousel/Dispatch.tsx).
// Opus writes the slides from the card's sources (and checks every quote against them), the
// primary source is screenshotted and cropped into the cover's "clipping", the strip renders as
// one wide still and is sliced into 1080×1350 JPEGs. A vision pass catches overflowing text.

const STATE = resolve(REPO_ROOT, "bot/data/dispatch.json");
const TOOLS = ["WebFetch", "WebSearch", "Read"];

export type DispatchSlide = Record<string, unknown> & { type: string };
export type DispatchProps = { issue: number; date: string; inks?: string; station?: string[]; slides: DispatchSlide[] };
export type Carousel = { id: string; issue: number; props: DispatchProps; propsPath: string; slides: string[]; text: string };

function run(cmd: string, args: string[], cwd = config.studioDir): Promise<{ ok: boolean; out: string }> {
  return new Promise((res) => {
    const p = spawn(cmd, args, { cwd, shell: process.platform === "win32" });
    let out = "";
    p.stdout.on("data", (d) => (out += d));
    p.stderr.on("data", (d) => (out += d));
    p.on("error", (e) => res({ ok: false, out: String(e) }));
    p.on("close", (code) => res({ ok: code === 0, out: out.slice(-800) }));
  });
}
// the full ffmpeg (crop/negate/eq) when it's installed, Remotion's bundled one otherwise
async function ffmpeg(args: string[]) {
  const sys = await run("ffmpeg", ["-hide_banner", "-loglevel", "error", ...args]);
  if (sys.ok) return sys;
  return run("npx", ["remotion", "ffmpeg", "-hide_banner", "-loglevel", "error", ...args]);
}

async function nextIssue(): Promise<number> {
  let s: { lastIssue?: number } = {};
  try {
    s = JSON.parse(await readFile(STATE, "utf8"));
  } catch {
    /* first issue */
  }
  // issue 1 was the hand-made Dessa sample
  const n = Math.max(1, s.lastIssue ?? 1) + 1;
  await mkdir(resolve(REPO_ROOT, "bot/data"), { recursive: true });
  await writeFile(STATE, JSON.stringify({ ...s, lastIssue: n }));
  return n;
}

const INKS = ["pinkblue", "redteal", "orangefederal", "greenpink", "yellowblue"];
const today = () => new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }).replace(",", "").toUpperCase();

const SCHEMA = `{
  "slides": [
    {"type":"cover","kicker":"2-3 WORD TOPIC TAG","headline":"4-7 words, the hook, mark ONE phrase as *emphasis*","deck":"one sentence, max 22 words, the plain-English what-happened"},
    {"type":"points","title":"What happened","points":["3 short sentences, max 22 words each"]},
    {"type":"diagram","title":"How it works (or Why it matters)","flows":[{"label":"the old way / before","steps":["2-5 one-or-two-word boxes"]},{"label":"the new thing","steps":["2-4 boxes"],"highlight":true}],"note":"one sentence"},
    {"type":"stat","label":"WHAT THE NUMBER IS","value":"the number, max 7 chars e.g. 72 GPUs → \\"1 rack\\"","sub":"one or two sentences of context"},
    {"type":"quote","text":"a REAL quote, verbatim from a source you fetched, max 160 chars","who":"who said it, and where"},
    {"type":"split","title":"The catch","left":{"label":"2 words","text":"max 20 words"},"right":{"label":"2 words","text":"max 20 words"}},
    {"type":"takeaways","title":"What it means for you","items":["3 practical lines, max 14 words each"]},
    {"type":"cta","handle":"@21stcentury.sahil","line":"The AI news that actually matters, explained like a human would.","keyword":"NEWS"}
  ],
  "station": ["one SHORT label per slide for the bottom wire, e.g. THE NEWS, HOW, SCALE, REACTION, THE CATCH, YOU, FOLLOW"],
  "clip": {"x": 0, "y": 0, "w": 0, "h": 0, "invert": false, "caption": "domain/path · what it is, short"}
}`;

/**
 * Write (or revise) the slides for a news card and render them. `prev` + `note` = an [Edit];
 * `prev` alone = a [Redo] (same issue number, fresh writing).
 */
export async function makeCarousel(card: Card, opts: { note?: string; prev?: Carousel } = {}): Promise<Carousel> {
  const id = `dispatch-${Date.now()}`;
  const issue = opts.prev?.issue ?? (await nextIssue());
  const gen = resolve(config.studioDir, "public/generated");
  await mkdir(gen, { recursive: true });
  await mkdir(resolve(config.studioDir, "out"), { recursive: true });

  // 1. the primary source, for the clipping: prefer the company/product page over a forum thread
  const links = card.links ?? [];
  const primary = links.find((l) => !/news\.ycombinator|reddit\.com|x\.com|twitter\.com|youtube\.com/.test(l)) ?? links[0];
  const shotRel = `generated/${id}-src.png`;
  const haveShot = primary ? await screenshot(primary, resolve(config.studioDir, "public", shotRel)) : false;

  const prompt = `You are writing a news CAROUSEL ("The Dispatch", a printed-zine style Instagram carousel)
for @21stcentury.sahil: AI news for people who use AI but aren't developers. Plain, human,
specific; no hype words; facts only.

The story (from this morning's research):
TOPIC: ${card.topic}
WHY NOW: ${card.whyNow}
WHERE IT'S MOVING: ${card.source ?? "?"}
SOURCES: ${links.join(" ")}
HIS REEL SCRIPT FOR IT (for tone, not to copy): ${card.script}
${opts.prev ? `\nTHE PREVIOUS VERSION OF THIS CAROUSEL:\n${JSON.stringify(opts.prev.props.slides)}\n${opts.note ? `CHANGE REQUESTED: ${opts.note}` : "Write a fresh, better version (a Redo)."}` : ""}

1. FETCH the sources (WebFetch) before writing. Every fact and number on a slide must come from
   them. The quote slide must be VERBATIM from a source (a person, a company page, a top comment),
   attributed honestly; if you can't find a real quote, use a "points" slide instead.
2. Slide 2 is a second hook (Instagram re-serves carousels from slide 2): make it strong.
3. Keep the order and types of the schema below, but you may drop the diagram, stat, quote or
   split slide when the story doesn't have that material (minimum 6 slides; cover first, cta last).
4. ${haveShot ? `The cover's clipping comes from a screenshot of the primary source: ${resolve(config.studioDir, "public", shotRel)}
   (2560 px wide). Read it and choose a crop box (pixels) around its most telling headline or
   claim, readable text, aspect between 3:1 and 6:1 (wide strip). "invert": true if that region is
   light text on a dark background. "caption": the domain + a few words.` : `There's no screenshot; set "clip" to null.`}

Return ONLY this JSON shape:
${SCHEMA}`;

  const out = await claudeJson<{ slides: DispatchSlide[]; station?: string[]; clip?: { x: number; y: number; w: number; h: number; invert?: boolean; caption?: string } | null }>(prompt, {
    tools: TOOLS,
    timeoutMs: 10 * 60_000,
  });
  if (!Array.isArray(out.slides) || out.slides.length < 4) throw new Error("the writer returned no usable slides");
  for (const s of out.slides) if (s.type === "cta") s.avatar = "carousel-avatar.jpg"; // his halftoned profile picture

  // 2. crop the clipping
  const cover = out.slides.find((s) => s.type === "cover");
  if (cover && haveShot && out.clip && out.clip.w > 50 && out.clip.h > 20) {
    const c = out.clip;
    const clipRel = `generated/${id}-clip.png`;
    const vf = [`crop=${Math.round(c.w)}:${Math.round(c.h)}:${Math.round(c.x)}:${Math.round(c.y)}`, "format=gray", ...(c.invert ? ["negate"] : []), "eq=contrast=1.6"].join(",");
    const r = await ffmpeg(["-y", "-i", resolve(config.studioDir, "public", shotRel), "-vf", vf, resolve(config.studioDir, "public", clipRel)]);
    if (r.ok && existsSync(resolve(config.studioDir, "public", clipRel))) {
      cover.image = clipRel;
      cover.imageAspect = c.w / c.h;
      if (c.caption) cover.imageCaption = c.caption;
    } else console.error("dispatch: clip crop failed:", r.out);
  }

  const props: DispatchProps = { issue, date: today(), inks: INKS[issue % INKS.length], station: out.station, slides: out.slides };
  let rendered = await renderStrip(id, props);

  // 3. one vision pass: overflowing / colliding / cut-off text → shorter copy, re-render
  try {
    const verdict = await claude(
      `These are the slides of an Instagram carousel, in order: ${rendered.slides.join(" ")}
Read each image. Look ONLY for layout problems: text running off the slide or into the bottom
line (the "wire"), text overlapping other text or a box, a word cut off, a headline wrapping into
more than 4 lines. If everything is clean reply exactly OK. Otherwise reply with the corrected
slides JSON (same shape as below, same facts, just SHORTER text where it breaks) and nothing else:
${JSON.stringify(props.slides)}`,
      { tools: ["Read"], timeoutMs: 6 * 60_000 },
    );
    if (!/^\s*OK\b/i.test(verdict)) {
      const m = verdict.match(/\[[\s\S]*\]/);
      if (m) {
        const fixed = JSON.parse(m[0]) as DispatchSlide[];
        if (Array.isArray(fixed) && fixed.length >= 4) {
          // keep the clipping the crop produced
          const c0 = props.slides.find((s) => s.type === "cover"), c1 = fixed.find((s) => s.type === "cover");
          if (c0 && c1) Object.assign(c1, { image: c0.image, imageAspect: c0.imageAspect, imageCaption: c0.imageCaption });
          props.slides = fixed;
          rendered = await renderStrip(id, props);
        }
      }
    }
  } catch (e: any) {
    console.error("dispatch: layout check skipped:", e?.message ?? e);
  }

  const text = props.slides
    .map((s) => [s.headline, s.deck, s.title, ...(Array.isArray(s.points) ? s.points : []), s.note, s.value, s.label, s.sub, s.text, s.who, ...(Array.isArray(s.items) ? s.items : [])].filter(Boolean).join("\n"))
    .join("\n\n");
  return { id, issue, props, propsPath: rendered.propsPath, slides: rendered.slides, text };
}

async function renderStrip(id: string, props: DispatchProps): Promise<{ propsPath: string; slides: string[] }> {
  const propsPath = resolve(config.studioDir, "out", `${id}.props.json`);
  await writeFile(propsPath, JSON.stringify(props));
  const strip = resolve(config.studioDir, "out", `${id}.png`);
  const r = await run("npx", ["remotion", "still", "Dispatch", strip, `--props=${propsPath}`, "--frame=0"]);
  if (!r.ok || !existsSync(strip)) throw new Error(`carousel render failed: ${r.out.slice(-300)}`);
  const slides: string[] = [];
  for (let i = 0; i < props.slides.length; i++) {
    const out = resolve(config.studioDir, "out", `${id}-${String(i + 1).padStart(2, "0")}.jpg`);
    const c = await ffmpeg(["-y", "-i", strip, "-vf", `crop=1080:1350:${i * 1080}:0`, "-q:v", "2", out]);
    if (!c.ok) throw new Error(`slicing slide ${i + 1} failed: ${c.out.slice(-200)}`);
    slides.push(out);
  }
  return { propsPath, slides };
}
