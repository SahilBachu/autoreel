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

## Design system (LOCKED — Nick Saraev style)
Reverse-engineered from his reels (frames in `references/`, now gitignored). The look is a
**consistent flow with a per-video skin**:
- **Flow:** talking head in a warm room + rapid HARD-CUT cutaways synced to the VO. Each
  cutaway is a *specific, real* visual (product logo on black, real UI screen-recording in
  a rounded frame, a Claude Code terminal framed on **terracotta** = his signature, a clean
  UI mockup, a doc/screenshot with annotations, occasional stock B-roll with a title). Title
  cards between beats, often one word highlighted (orange box). Captions = short lowercase
  phrase, white heavy, on a dark/gray pill, centered low (NOT all-caps).
- **Skin (varies per video):** title font is either elegant serif italic (Playfair) OR
  heavy grotesk (General Sans). Backgrounds cream (dot grid) / white / black. Terracotta
  `#C0532F` is the through-line accent.

### Component philosophy (IMPORTANT)
**Generate NEW bespoke Remotion components for every video.** The user has Claude Max, so
per-video hand-crafted visuals are the norm — not a fixed template. Reuse a prior component
ONLY if it already exists AND genuinely matches (e.g. the terminal-on-terracotta window, the
caption pill). Otherwise build fresh, keep pushing them more unique and fitting to the topic.
Focus on **motion graphics**; a little stock B-roll is OK but shouldn't dominate. Real assets
(logos, repo/site screenshots) should be fetched, not faked — use the Playwright MCP.

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
Unserious tech student who clearly knows the space. Dry, low-stakes, self-deprecating,
throwaway jokes. Loose with facts for the bit (but on-screen NUMBERS must be real). Casual
shrug endings, NO CTAs/hype/emoji-bait. ~4–6 short speakable lines, 20–40s. Structure:
spicy/funny hook → the thing → a dry aside → shrug ending. Gold-standard few-shots + full
voice prompt live in `bot/src/lib/voice.ts`.

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
