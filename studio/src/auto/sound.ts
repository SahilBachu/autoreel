// SOUND POLICY — which subtle sound effects a reel gets, and exactly when.
//
// The renderer (world/WorldReel.tsx) knows when each object arrives and leaves; this module
// turns that into a short list of cues. Keeping the policy here, separate from the renderer,
// means the sound design can be tuned without touching motion code.
//
// Contract (the renderer depends on this shape):
//   objs  — the world objects in order: their scene kind and the frames they're on screen.
//           Optional extras sharpen it: `enter` (camera.ts planBeats: "travel" = the camera
//           flies in from the previous object, "fresh" = the world fades back in after a face
//           beat — guessed from the gap when absent) and `scene` (GetIt's url → exact timing).
//   fps   — composition fps
//   returns cues: a public/ path, the frame to start on, and a volume (0-1), sorted by frame
//
// The brief: basic, effective, never overpowering. A talking-head tech reel where the voice
// is king: roughly one cue every 4-5 s, never two on top of each other, nothing on the hook,
// cues ~11 dB under the voice. Kit + tuning guide: src/auto/SOUND.md. The kit is
// public/sfx/v4: real recorded sounds from Mixkit (free license, no attribution), trimmed and
// level-matched to KIT_REF_LUFS.
//
// Pure + deterministic (no Math.random, no clock): same objects in → same cues out.

export type SoundObject = {
  kind: string;
  from: number;
  to: number;
  enter?: "travel" | "fresh";
  scene?: { [k: string]: unknown };
};
export type SoundCue = { file: string; frame: number; volume: number; trimBefore?: number };

// ── the kit ──────────────────────────────────────────────────────────────────
// hitMs: where the sound "lands" inside the file (the whoosh swells to mid-travel, the
// riser ends on the reveal); the cue starts hitMs before the moment it serves.
// trimDb: this sound's level relative to SFX_TARGET_LUFS — the balance inside the kit. The
// files are level-matched full-band; the trims also even out phone speakers (≈300 Hz-8 kHz),
// where the keys lose ~2 dB and the thump ~8.5 dB (so the thump sits a touch hotter).
export type SoundId =
  | "whooshRight" | "whooshLeft" | "whooshDown"
  | "tickA" | "tickB" | "pop" | "keys" | "key" | "confirm" | "thump" | "riser" | "shutter";

export const KIT: { [id in SoundId]: { file: string; hitMs: number; trimDb: number } } = {
  whooshRight: { file: "sfx/v4/whoosh-sweep-a.wav", hitMs: 280, trimDb: -2 },
  whooshLeft: { file: "sfx/v4/whoosh-sweep-b.wav", hitMs: 280, trimDb: -2 },
  whooshDown: { file: "sfx/v4/whoosh-wind.wav", hitMs: 160, trimDb: -2.5 },
  tickA: { file: "sfx/v4/click-select.wav", hitMs: 0, trimDb: 0 },
  tickB: { file: "sfx/v4/click-soft.wav", hitMs: 0, trimDb: -1 },
  pop: { file: "sfx/v4/pop.wav", hitMs: 0, trimDb: 0 },
  keys: { file: "sfx/v4/typing.wav", hitMs: 40, trimDb: -1 },
  key: { file: "sfx/v4/key.wav", hitMs: 0, trimDb: 0 },
  confirm: { file: "sfx/v4/confirm.wav", hitMs: 0, trimDb: -1.5 },
  thump: { file: "sfx/v4/bass-hit.wav", hitMs: 30, trimDb: 0 },
  riser: { file: "sfx/v4/riser.wav", hitMs: 950, trimDb: -3 },
  shutter: { file: "sfx/v4/shutter.wav", hitMs: 50, trimDb: 1 }, // the file sits 1.5 LU under the ref (peak-limited)
};

// ── levels ───────────────────────────────────────────────────────────────────
// volume = 10^((SFX_TARGET_LUFS - KIT_REF_LUFS + trimDb + SFX_MASTER_DB ± jitter) / 20)
export const KIT_REF_LUFS = -20; // every kit file's max momentary loudness (normalised when the kit was built)
// Where a trim-0 cue peaks (momentary) in the final mix. The voice is normalised per clip
// (bot/src/lib/loudness.ts: ≈ -12.6 LUFS at its target, -13 short-term median), so -24 puts
// cues ~11 dB under his voice and several dB over the music bed (voice -16 LU): clearly there,
// never on top of him. When the voice can't reach its target (peak-limited), the bot passes
// sfxGainDb to move every cue down with it. Measured on the cf reel (voice -14.4 short-term):
// cues peaked 12-15 dB under the voice at -26, so -24 lands them at ~10-13.
export const SFX_TARGET_LUFS = -24;
export const SFX_MASTER_DB = 0; // the one knob: -3 = everything quieter
export const JITTER_DB = 0.75; // deterministic per-cue level variation (± dB), so repeats don't sound pasted

// ── density ──────────────────────────────────────────────────────────────────
export const HOOK_S = 1.0; // nothing audible before this (the hook is his voice alone)
export const MIN_GAP_S = 0.45; // between any two hits
export const SAME_FAMILY_GAP_S = 2.5; // the same kind of sound (whoosh/whoosh, tick/tick) never closer
// sliding windows: no `s`-second span may hold more than `max` hits. The short one allows a
// pair (whoosh → keys) but no bursts; the long one sets the average (3 per 12 s = one cue
// every 4 s at most) and, being local, spreads cues out instead of front-loading a budget.
export const DENSITY_WINDOWS: { s: number; max: number }[] = [
  { s: 4, max: 2 },
  { s: 12, max: 3 },
];
export const TAIL_GUARD_S = 0.3; // no hit in the last moments (it would be cut off)

// ── camera sync (mirrors world/camera.ts, motion v3) ─────────────────────────
// A travel runs LEAD=9 frames before the beat to TAIL=13 after (ease-in-out, then a spring
// follower that lags ~2 frames), so the camera is fastest ~2-4 frames after `from`. The
// whoosh's swell peaks a hair before that — sound leading picture reads as "tight".
export const TRAVEL_HIT_MS = 80;
// Without `enter`, an arrival closer than this to the previous object's `to` is taken as a
// camera travel. WorldReel passes to = beat.end: a travel beat ends AFTER the next arrival
// (negative gap), a release ends ≥ BRIDGE_S - EXIT ≈ 1.9 s before it — 1 s splits them.
export const BRIDGE_GUESS_S = 1.0;
export const FRESH_WHOOSH_DB = -3; // the world breathing back in after a face beat: quieter
export const TICK_STEP_S = 6; // a tick within this of the previous one steps up (tick-b) instead of repeating
export const MAX_RISERS = 1; // per video
export const MAX_CONFIRMS = 2;

// ── what each scene kind sounds like ─────────────────────────────────────────
// text     — words: the camera move is enough, no sound of their own
// card     — an object landing: soft pop (mostly loses to the travel whoosh; used on entry)
// typing   — something types: one short cluster of 3 soft key taps (never a typing track)
// keypress — a key/shortcut appears: one soft key
// click    — a cursor/tap: one tick
// steps    — checkmarks / steps / toggles: a tick on the first one, maybe a second
// stat     — a big number: the low soft thump as it settles
// result   — the payoff/CTA: the two-note confirm
// reveal   — a comparison reveal: soft riser into it (max 1 per video, only after a face beat)
// capture  — a real screenshot of a site lands: a camera shutter
export type Family = "text" | "card" | "typing" | "keypress" | "click" | "steps" | "stat" | "result" | "reveal" | "capture";

export const KIND_FAMILY: { [kind: string]: Family } = {
  headline: "text", decrypt: "text", callout: "text", quote: "text", kinetic: "text", highlight: "text",
  terminal: "typing", code: "typing", prompt: "typing", json: "typing", command: "typing", search: "typing",
  kbd: "keypress",
  cursor: "click",
  install: "steps", checklist: "steps", runlog: "steps", toggles: "steps", progress: "steps", flow: "steps",
  stat: "stat", statrow: "stat",
  getit: "result",
  versus: "reveal", beforeafter: "reveal", split: "reveal",
  // everything else that's a thing landing
  browser: "capture", screenshot: "capture",
  toolcard: "card", logo: "card", logowall: "card", tweet: "card",
  phone: "card", pricing: "card", receipt: "card", rating: "card", poll: "card", chat: "card",
  notifications: "card", inbox: "card", bento: "card", dashboard: "card", calendar: "card", table: "card",
  leaderboard: "card", kanban: "card", timeline: "card", waveform: "card", ascii: "card", custom: "card",
  stack: "card", catch: "card", clawd: "card", painted: "card", linechart: "card", barchart: "card", donut: "card", ticker: "card", diff: "card",
};

// kinds this module has never heard of: guess from the name, first match wins; no match →
// a quiet, low-priority arrival pop (or nothing, if anything else wants that moment)
export const NAME_RULES: [RegExp, Family][] = [
  [/getit|get-it|cta|result|success|done|confirm|payoff/, "result"],
  [/term|code|cli|shell|prompt|json|yaml|typ(e|ing)|command|cmd|query|search/, "typing"],
  [/check|list|step|todo|task|install|setup|runlog|toggle|flow|pipeline|progress/, "steps"],
  [/stat|number|count|metric|kpi|percent|figure/, "stat"],
  [/versus|compare|before|after|split|reveal/, "reveal"],
  [/kbd|key|shortcut|hotkey/, "keypress"],
  [/cursor|click|tap|pointer/, "click"],
  [/head|title|text|quote|kinetic|highlight|word|callout|decrypt/, "text"],
];

export function familyOf(kind: string): { family: Family; known: boolean } {
  const k = String(kind || "").toLowerCase();
  if (Object.prototype.hasOwnProperty.call(KIND_FAMILY, k)) return { family: KIND_FAMILY[k], known: true };
  for (const [re, fam] of NAME_RULES) if (re.test(k)) return { family: fam, known: false };
  return { family: "card", known: false };
}

// Beat timings (ms after the object's `from`) mirroring the v2 components at 30 fps.
// first = the first visible "event" (a check lands, a toggle flips); second = the next one.
export const STEP_MS: { [kind: string]: { first: number; second?: number } } = {
  runlog: { first: 700, second: 1100 }, // checks at frame 10 + i*12 + 11
  install: { first: 930, second: 1500 }, // first command typed, then its tick
  checklist: { first: 630, second: 930 }, // items land at 8 + i*9
  toggles: { first: 600, second: 900 }, // flips at 18 + i*9
  progress: { first: 1730 }, // bar completes 10f + 1.4 s
  flow: { first: 600, second: 1100 },
};
const STEP_DEFAULT = { first: 650, second: 1050 };
const TYPING_MS = 560; // clear of the travel whoosh (hit at +80 ms); anything that types is still typing
const KEYPRESS_MS = 150; // kbd keys pop at frame 4
const CLICK_MS = 600;
const CARD_MS = 70; // objects spring in ~2 frames after their start
const STAT_MS = 400; // the count-up (frames 4-30, ease-out) is ~80% there and settling
const RESULT_MS = 1000; // getit: URL finishes typing ≈ 10f + len/34 s (refined below if the url is known)

// priorities: who wins a moment when two cues want it
const PRIO: { [f in Family]: number } & { travel: number; fresh: number; step2: number; entry: number; unknown: number } = {
  // reveal (the riser) outranks the travel whoosh: when it's eligible it IS the move's sound
  result: 80, stat: 70, typing: 60, steps: 55, capture: 50, reveal: 45, keypress: 45, click: 40, card: 35, text: 0,
  travel: 40, fresh: 25, step2: 20, entry: 50, unknown: 15,
};

// camera direction between object i-1 and i — mirrors world/layout.ts's serpentine
// (columns [0,1,1,0] repeating): the new object arrives from the right, the left, or below.
const COLS = [0, 1, 1, 0];
function travelSound(i: number): SoundId {
  if (i <= 0) return "whooshDown";
  const d = COLS[i % 4] - COLS[(i - 1) % 4];
  return d > 0 ? "whooshRight" : d < 0 ? "whooshLeft" : "whooshDown";
}

type Cand = { id: SoundId; hit: number; prio: number; group: string; seed: string; db: number };

// tiny deterministic hash → [0,1)
function hash01(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h ^= h >>> 13;
  h = Math.imul(h, 0x5bd1e995);
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

/** the volume for one cue of `id` (extraDb on top of its kit trim; seed → deterministic jitter) */
export function cueVolume(id: SoundId, seed = "", extraDb = 0): number {
  const jitter = seed ? (hash01(seed) * 2 - 1) * JITTER_DB : 0;
  const dB = SFX_TARGET_LUFS - KIT_REF_LUFS + KIT[id].trimDb + SFX_MASTER_DB + extraDb + jitter;
  return Math.round(Math.pow(10, dB / 20) * 1000) / 1000;
}

function candidates(objs: SoundObject[], fps: number): Cand[] {
  const F = (ms: number) => Math.round((ms / 1000) * fps);
  const out: Cand[] = [];
  objs.forEach((o, i) => {
    if (!Number.isFinite(o.from) || !Number.isFinite(o.to)) return; // malformed: no sound, never a crash
    const len = o.to - o.from;
    const { family, known } = familyOf(o.kind);
    const inside = (ms: number) => F(ms) < len - F(200); // the event must happen while it's on screen
    const add = (id: SoundId, hit: number, prio: number, group: string, db = 0) =>
      out.push({ id, hit, prio, group, db, seed: `${i}:${o.kind}:${id}` });
    const prev = i > 0 ? objs[i - 1] : null;
    const enter = o.enter ?? (prev && o.from - prev.to < F(BRIDGE_GUESS_S * 1000) ? "travel" : "fresh");

    // 1. how the camera gets there: a real travel gets the air whoosh (panned by direction);
    //    a fresh entrance (first object, or back from a face beat) only a quiet fallback one
    if (enter === "travel" && i > 0) add(travelSound(i), o.from + F(TRAVEL_HIT_MS), PRIO.travel, "whoosh");
    else add(i > 0 ? travelSound(i) : "whooshDown", o.from + F(TRAVEL_HIT_MS), PRIO.fresh, "whoosh", FRESH_WHOOSH_DB);

    // 2. its own moment
    switch (family) {
      case "text":
        break;
      case "capture":
        add("shutter", o.from + F(CARD_MS + 150), PRIO.capture, "shutter");
        break;
      case "card":
        add("pop", o.from + F(CARD_MS), i === 0 ? PRIO.entry : known ? PRIO.card : PRIO.unknown, "pop");
        break;
      case "typing":
        if (inside(TYPING_MS)) add("keys", o.from + F(TYPING_MS), PRIO.typing, "keys");
        break;
      case "keypress":
        add("key", o.from + F(KEYPRESS_MS), PRIO.keypress, "keys");
        break;
      case "click":
        if (inside(CLICK_MS)) add("tickA", o.from + F(CLICK_MS), PRIO.click, "tick");
        break;
      case "steps": {
        const s = STEP_MS[String(o.kind || "").toLowerCase()] ?? STEP_DEFAULT;
        if (inside(s.first)) add("tickA", o.from + F(s.first), PRIO.steps, "tick");
        if (s.second !== undefined && inside(s.second)) add("tickB", o.from + F(s.second), PRIO.step2, "tick2");
        break;
      }
      case "stat":
        add("thump", o.from + F(STAT_MS), PRIO.stat, "thump");
        break;
      case "result": {
        const url = o.scene && typeof o.scene.url === "string" ? o.scene.url : "";
        const cps = url.length > 36 ? 46 : 34; // GetIt's typing speed
        const ms = url ? ((10 + (url.length / cps) * 30) / 30) * 1000 + 60 : RESULT_MS;
        add("confirm", o.from + F(Math.min(ms, Math.max(0, (len / fps) * 1000 - 300))), PRIO.result, "confirm");
        break;
      }
      case "reveal": {
        // only out of a face beat long enough to hold the whole riser — never over the world
        const room = prev ? o.from - prev.to : o.from;
        if (enter === "fresh" && room >= F(KIT.riser.hitMs)) add("riser", o.from, PRIO.reveal, "riser");
        add("pop", o.from + F(CARD_MS), i === 0 ? PRIO.entry : PRIO.card, "pop");
        break;
      }
    }
  });
  return out;
}

// would any `span`-frame window that contains `at` hold more than `max` of `hits` (sorted)?
function crowded(hits: number[], at: number, span: number, max: number): boolean {
  for (let j = 0; j < hits.length; j++) {
    if (hits[j] > at || at - hits[j] >= span) continue; // windows starting at hits[j] that can contain `at`
    let n = 0;
    for (let k = j; k < hits.length && hits[k] - hits[j] < span; k++) n++;
    if (n > max) return true;
  }
  return false;
}

export function soundCues(objs: SoundObject[], fps: number, opts: { totalFrames?: number } = {}): SoundCue[] {
  if (!objs.length || !(fps > 0)) return [];
  const F = (s: number) => Math.round(s * fps);
  const total = opts.totalFrames ?? Math.max(...objs.map((o) => o.to)) + F(1);
  const hook = F(HOOK_S), minGap = F(MIN_GAP_S), famGap = F(SAME_FAMILY_GAP_S);
  const windows = DENSITY_WINDOWS.map((w) => ({ span: F(w.s), max: w.max }));
  const family = (g: string) => (g === "tick2" ? "tick" : g); // tick + tick-b are one family for spacing

  const cands = candidates(objs, fps).sort((a, b) => b.prio - a.prio || a.hit - b.hit);
  const taken: Cand[] = [];
  const count = (g: string) => taken.filter((t) => t.group === g).length;

  for (const c of cands) {
    const start = c.hit - F(KIT[c.id].hitMs / 1000);
    if (start < hook || c.hit > total - F(TAIL_GUARD_S)) continue;
    if (taken.some((t) => Math.abs(t.hit - c.hit) < minGap)) continue;
    if (taken.some((t) => family(t.group) === family(c.group) && Math.abs(t.hit - c.hit) < famGap)) continue;
    if (c.group === "riser" && count("riser") >= MAX_RISERS) continue;
    if (c.group === "confirm" && count("confirm") >= MAX_CONFIRMS) continue;
    const hits = taken.map((t) => t.hit).concat(c.hit).sort((a, b) => a - b);
    if (windows.some((w) => crowded(hits, c.hit, w.span, w.max))) continue;
    taken.push(c);
  }

  // ticks close together step up in pitch rather than repeating the same sample; a lone
  // tick (or the first of a run) is always tick-a
  const ordered = taken.sort((a, b) => a.hit - b.hit);
  let last: Cand | null = null;
  for (const t of ordered) {
    if (t.id !== "tickA" && t.id !== "tickB") continue;
    t.id = last && last.id === "tickA" && t.hit - last.hit < F(TICK_STEP_S) ? "tickB" : "tickA";
    last = t;
  }

  return ordered.map((t) => ({
    file: KIT[t.id].file,
    frame: Math.max(0, t.hit - F(KIT[t.id].hitMs / 1000)),
    volume: cueVolume(t.id, t.seed, t.db),
  }));
}
