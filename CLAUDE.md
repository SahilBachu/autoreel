# autoreel — project memory (CLAUDE.md)

Daily, mostly-automated Instagram Reels pipeline for a tech page. **One Telegram chat is
the whole interface.** Two layers:

- **STUDIO** = the Remotion video look + the script "voice". Has taste. Built by hand
  with live preview. **Locked for now** (see "Design system" below).
- **ROBOT** = the deterministic automation (Telegram bot, 3am research/script, whisper →
  render, Instagram poster). **This is what we're building next** — full spec in
  [`BUILD.md`](./BUILD.md).

Machines: **main machine** (this repo's dev box) designs the Studio. **Runner** = an old
Windows laptop in WSL2 Ubuntu, always-on, where the Robot lives 24/7 (Docker, self-hosted
Telegram Bot API server, whisper, cron all installed). Move the repo to the runner via git.

## Daily loop (target)
1. (optional) user texts the bot `tomorrow: <idea>`, or asks on demand (`/idea`, or
   `idea: <describe>`, or a random one).
2. 3am: pick a queued topic or research last ~30 days of AI/ML news → write a script **in
   the user's voice** → Telegram it.
3. User reads it, records a talking-head clip, sends it to the bot.
4. System transcribes (faster-whisper, word-level) → builds the reel (their clip in the
   face slots + captions synced to audio + motion-graphic cutaways + SFX/music) → sends it
   back with **[Post] / [Redo] / [Edit]** buttons.
5. **[Post]** → Supabase upload → Instagram Graph API publish. Default = approve-before-post.

## Design system (BRAND V2 — replaced the old Nick/terracotta look, 2026-07-01)
**Canonical docs: [`DESIGN.md`](./DESIGN.md) (look/motion/audio rules) + [`COMPONENTS.md`](./COMPONENTS.md)
(the full scene catalog) + [`PIPELINE.md`](./PIPELINE.md) (the build plan). Read those, not this summary.**
- Dark minimal, Linear/Notion/Vercel-grade: near-black base, glassy panels, hairline borders,
  Geist type, glows, grain. ONE bright accent per video, randomized at render time
  (blue/cyan/green/orange/red/pink/violet), threaded via AccentProvider (`studio/src/auto/theme.ts`).
- Scene kit: `studio/src/auto/` — fx.tsx (backgrounds, DecryptText, AsciiImage, Caption2) +
  v2-text / v2-data / v2-ui / v2-media (25 scene kinds). Catalog stills in `studio/catalog/`.
- The old cream/terracotta kit (`nick/`, `reel_cursor/`) remains only as reference compositions.

### Component philosophy (IMPORTANT)
Compose from the v2 catalog and **modify freely per video**; bespoke one-off components are
encouraged for hero moments — put them in `studio/src/auto/generated/<videoId>/`, drive ALL
motion from `useCurrentFrame` (never wall-clock/framer-motion/Math.random — use remotion's
`random(seed)`), read colors from `useAccent()` + `T` tokens, wrap in `<Scene>` from fx.tsx,
and verify with a rendered still before use. Real assets (logos via simple-icons, site
screenshots via Playwright) — never faked.

## Studio (Remotion) — current state
`studio/` is a Remotion 4 project (React 19). Run: `cd studio && npx remotion studio`.
Compositions:
- **`CursorReel`** — a from-scratch "Cursor 2.0" reel in the Nick style (serif skin). The
  reference implementation of "generate a new video from a script." Files in
  `studio/src/reel_cursor/`.
- **`NickReel`** — faithful recreation of his find-skills reel. `studio/src/nick/`.
- `Reel` / `Showcase` — earlier pre-Nick experiments (kept for reference).

Reusable primitives worth knowing: `nick/components.tsx` (Chip, LetterBadge, GreenCheck,
Window/terminal, FacePlaceholder), `nick/Caption.tsx` (caption pill), `reel_cursor/parts.tsx`
(DotGrid, CursorLogo, TitleSerif, AgentGrid, SpeedBars, Statement).

Fonts are local woff2 in `studio/public/fonts/` (General Sans, Satoshi, JetBrains Mono,
Playfair Display italic, Clash Display), loaded via `@remotion/fonts`.

**Known Remotion gotcha we hit:** a full-screen background layer (`<AbsoluteFill>`) will
paint OVER sibling content once that content's `opacity` settles to 1 (it loses its stacking
context). Fix: put scene content inside its own `<AbsoluteFill>` layered above the bg, or
keep a `transform` on it. See `reel_cursor/CursorReel.tsx` scenes.

## The voice (script writer) — the soul
**Lives in [`VOICE.md`](./VOICE.md) at the repo root** — rules + gold few-shots + approved
posts + auto-learned sections. The bot loads it verbatim for every script; sahil edits it
directly and the learning pass (`bot/src/lib/learn.ts`) writes into its marked sections.
Script back-and-forth resumes ONE claude session (Opus) per script, stored in bot state.

## Audio
Handpicked library: SFX in `studio/public/sfx/`, music in `studio/public/music/`, described
in `studio/public/audio-manifest.json`. The render/director reads the manifest and places
the right sound at the right moment (SFX on cuts/emphasis; music bed ducked under the voice).

## Secrets — `.env` (gitignored)
Telegram (bot token, chat id, api id/hash) are filled. Instagram uses host
**`graph.instagram.com`** (not graph.facebook.com). Fill IG_ACCESS_TOKEN / IG_USER_ID /
IG_APP_ID / IG_APP_SECRET and SUPABASE_URL / SUPABASE_SERVICE_KEY. `.env.example` is the
template.

## MCP / tooling
Playwright MCP + Supabase MCP + Context7 are configured for the build. Remotion ships its
own ffmpeg — use `npx remotion ffmpeg …` (system ffmpeg not required on the main machine).

## Tooling conventions
- RTK: prefix shell commands with `rtk` (token-optimized) per the user's global CLAUDE.md.
- Verify visually: render stills with `npx remotion still <Comp> out/x.png --frame=N
  --scale=0.5` and actually look at them before claiming something works.

Next: build the ROBOT per [`BUILD.md`](./BUILD.md).
