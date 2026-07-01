# PIPELINE — the line today vs. the line we're building

Decisions locked 2026-07-01 (sahil + claude). This is the working blueprint: mark it up freely.

---

## Decisions (locked)

- **Digest:** generated ~3am, waiting in Telegram in the morning. **3 topic cards, each with a full draft script.** Reply `1` / `2` / `3` to pick, `2 but <change>` to pick-and-tweak, or anything else to go off-menu. Full freedom after picking.
- **Discovery grounding:** the `last30days` skill (Reddit/HN/X/YouTube/GitHub/Techmeme/arXiv, engagement-ranked, real links) + WebSearch verification. No more from-memory topic guessing. `agent-search` rejected (dormant project, hosted-key dependency, redundant).
- **Brand v2: REPLACE the cream/terracotta look.** Dark, minimal, modern-SaaS (Linear / Notion / Mobbin energy). Glows. **One bright accent color per video, randomized** (electric blue, red, orange, green, cyan, pink…). Seed components: the LiquidMetal shader background (tintable per video), the neon ASCII-matrix image effect (image → dissolves into ASCII), a decrypt/scramble text reveal, the glow-CTA treatment, and shadcn components wherever they fit.
- **Models:** Opus, high effort, for the complex calls (discovery, script writing, studio/director agent). Cheap calls (IG captions, small utilities) stay on Sonnet.
- **Voice + design live in editable markdown** (`VOICE.md`, `DESIGN.md`) — sahil can open and edit them directly; learning writes into marked sections of the same files.
- **Funnel (comment→DM→website): parked** until the content is professional. No CTA infrastructure yet; voice stays CTA-free except future carve-out for own-product reels.
- **No emojis** anywhere in bot messages. `tomorrow:` is a **stack** (newest first, top of `topics.md`).

---

## THE LINE TODAY

```
1. you: /idea  (or idea: <desc>)
2. bare claude call invents a topic          ← no tools, no grounding → hallucinations
3. second call writes the script             ← voice.ts (code) + learned prefs (hidden JSON)
4. you ↔ revise via free text                ← each revision = fresh call, no memory of the back-and-forth
5. you record + send the clip                = approval
6. render.ts assembly line:
      normalize clip → whisper words → captions(=transcript)
      → director: ONE blind claude call → JSON scene list (~70% coverage)
      → playwright screenshots → random lofi + 3 quiet whooshes
      → props.json → remotion render (~10 min)
7. reel + caption in Telegram  [Post] [Redo] [Edit]
8. Post → upload (supabase → tmpfiles fallback) → IG publish → permalink
9. learn.ts logs everything, distills prefs into bot/data/*.json (opaque)
```

**What's weak:** step 2 (invented topics), step 3–4 (voice buried in code + JSON, sessions forget), step 6's director (one-shot, text-heavy taste, Claude-brand cream/terracotta look), and `topics.md` has no consumer.

---

## THE TARGET LINE

```
STATION 0 · DISCOVERY (new)                                    ~2:45am, systemd timer
   0.1  pop the tomorrow: stack — anything you queued outranks discovery
   0.2  discovery agent (Opus·high, last30days skill + WebSearch):
        what did the AI world actually talk about in the last 24–48h?
   0.3  pick 3 → for each: verify it's real, gather receipts (links),
        write a full draft script in your voice (VOICE.md loaded)
   0.4  3:00am → Telegram digest: 3 numbered cards
        [headline · why-now · 2-3 source links · full script]

STATION 1 · PICK + SHAPE (morning, you)
   1.1  reply "1" / "2" / "3"            → that script becomes active
        reply "2 but shorter hook"       → picked + revised in one move
        reply anything else              → fresh topic, same machinery
        /idea and idea: still work anytime
   1.2  revision = SAME resumed claude session (remembers the whole back-and-forth)
   1.3  every accepted change is distilled into VOICE.md ## learned

STATION 2 · RECORD (you)
   2.1  send the clip = approval of the current script

STATION 3 · STUDIO (rebuilt)                                   the big upgrade
   3.1  transcribe clip → word-timed captions (unchanged, already solid)
   3.2  STUDIO AGENT (Opus·high) — a real Claude Code session inside studio/:
        reads DESIGN.md + COMPONENTS.md + audio manifest + transcript
   3.3  picks this video's ACCENT (random bright color) → threads it through
        the dark base theme (shader bg tint, glows, chart color, text accents)
   3.4  composes scenes from PACK V2, tweaks variants per video,
        and may WRITE 1-2 bespoke components → studio/src/auto/generated/<id>/
   3.5  VERIFY LOOP: typecheck → render stills of new/changed scenes → look →
        fix → retry (max 3) → any failure falls back to the pack. renders never break.
   3.6  audio: picks the lofi bed by mood (documented in DESIGN.md), sparse SFX
   3.7  props.json → remotion render → reel + caption in Telegram

STATION 4 · SHIP (unchanged — already solid)
   4.1  [Post] [Redo] [Edit] → upload → IG publish → permalink

STATION 5 · LEARN (relocated into your files)
   5.1  script edits → VOICE.md ## learned      (human-readable, you can edit/delete)
   5.2  visual edits → DESIGN.md ## learned
   5.3  posted scripts → gold examples in VOICE.md
```

---

## What gets built, station by station

| Station | Today | Target | Work |
|---|---|---|---|
| Discovery | none (bare LLM guess) | last30days + WebSearch agent, 3 cards + scripts at 3am, digest reply routing, stack consumption | new `jobs/discover.ts`, systemd timer, digest state in bot |
| Script | voice.ts + hidden JSON, stateless revisions | `VOICE.md` (rules + gold + learned), resumed sessions, Opus·high | refactor `voice.ts`/`learn.ts`, session ids in state |
| Studio | one-shot JSON director, cream/terracotta pack | dark+accent **PACK V2**, `DESIGN.md` + `COMPONENTS.md`, agentic director w/ verify loop, per-video accent skin, bespoke generated scenes | new design system, component rebuilds (approval stills), `jobs/studio.ts` agent runner |
| Ship | supabase→tmpfiles, IG publish, progress msgs | unchanged | — |
| Learn | opaque JSON in bot/data | marked sections inside VOICE.md / DESIGN.md | rework `learn.ts` output target |
| Funnel | — | parked (phase 5) | — |

---

## Brand v2 — the design system (seed)

- **Base:** near-black backgrounds, high-contrast white type, generous negative space, hairline borders, soft glows. Linear/Notion/Mobbin restraint — nothing decorative without a job.
- **Accent:** ONE saturated color per video, chosen at studio time (blue `#3B82F6` / red / orange / green / cyan / pink — final palette in DESIGN.md). Drives: shader tint, glow color, boxed words, chart hero, caption highlights.
- **Seed components (rebuild one-by-one, approval stills for each):**
  1. LiquidMetal shader background (`@paper-design/shaders-react`) — tintable, blurred, behind any scene. ⚠ must be made frame-deterministic for Remotion (drive its time from `useCurrentFrame`; if the lib won't allow it, rebuild the look with a deterministic canvas shader).
  2. ASCII-matrix image effect — real image (logo/screenshot/face) that dissolves into neon ASCII. Frame-driven rebuild.
  3. Decrypt/scramble text reveal — for headlines and stat labels. (Component TBD — re-paste if you have a specific one, else built from scratch.)
  4. Glow CTA/headline card (badge + big type + glow) — from PROMPT2.
  5. Restyled: charts (bar/line/donut), stat grid, tweet card, terminal, logo drops/walls, browser + phone screenshot frames — all onto the dark+accent system.
  6. shadcn primitives (cards, badges, tables) wherever they fit.
- **Motion rules:** Remotion springs only (no wall-clock/framer-motion animation — breaks deterministic rendering), one strong entrance per scene, glow pulses subtle, hard cuts between scenes.

---

## Build phases

**Phase 1 — Control (fast):** VOICE.md + DESIGN.md extracted from code/JSON; learn.ts writes into them; resumed script sessions; Opus·high on complex calls. *Done when: you can edit VOICE.md in VS Code and the next script obeys it.*

**Phase 2 — Discovery:** discover.ts (last30days + WebSearch, Opus), 3am systemd timer, digest with 3 cards + scripts, `1/2/3/other` reply routing, tomorrow-stack consumption. Optional unlocks: X via your browser cookies (AUTH_TOKEN + CT0), ScrapeCreators free tier for TikTok/IG signal. *Done when: you wake up to 3 real, verifiable topics with scripts.*

**Phase 3 — Brand v2:** design tokens; rebuild the pack component-by-component with an approval still for each; COMPONENTS.md catalog auto-maintained. *Done when: a full test render looks like a Linear-grade product video and contains zero cream/terracotta.*

**Phase 4 — Studio agent:** agentic director in studio/ with skills (remotion, frontend-design, shadcn), per-video accent, variant tweaks, bespoke generated scenes, verify loop with still-render self-review, pack fallback. *Done when: two consecutive videos render with zero manual fixes and at least one bespoke scene each.*

**Phase 5 — Funnel (parked):** website, comment→DM (ManyChat vs native webhooks), CTA carve-out for own-product reels, link tracking.

---

## Risks / notes

- Shader/ASCII/decrypt effects must be frame-deterministic (Remotion renders frames in parallel; wall-clock animations flicker). Every seed component gets a determinism pass + verified via rendered stills before entering the pack.
- Studio agent adds minutes + Opus quota per video (accepted). Laptop render is already ~10 min; budget ~15 total.
- X coverage needs your cookies once (free) — do it whenever; everything else works without it.
- Discovery quality is rate-limited by sources, not the model — tomorrow-stack always wins over discovery.
