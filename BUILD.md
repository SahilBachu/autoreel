# BUILD.md — building the ROBOT (autoreel automation)

Read `CLAUDE.md` first for the product + the LOCKED design system + the component
philosophy (generate bespoke, polished, topic-fitting components per video). This file is
the implementation plan for the automation. It runs on the **runner** (old Windows laptop,
WSL2 Ubuntu) where Docker, the self-hosted Telegram Bot API server, faster-whisper, node,
and cron are already installed.

## Architecture (data flows one way)

```
Telegram  ─┬─► /idea | idea:<desc> | tomorrow:<idea>  ─► jobs/idea  ─► script (voice.ts) ─► send script
           │
 user sends talking-head clip ─► jobs/render:
     1. faster-whisper (word timestamps)        scripts/whisper_transcribe.py
     2. director: transcript+topic -> scene plan  lib/scenePlan  (may call `claude -p`)
     3. generate/choose bespoke components        `claude -p` writes Remotion tsx if needed
     4. build ReelData (clip in face slots, captions synced, cutaways, sfx/music)
     5. remotion render -> mp4                    npx remotion render
   ─► send mp4 with [Post] [Redo] [Edit]
           │
 [Post] ─► jobs/post: supabase upload -> IG Graph API (graph.instagram.com) -> publish
 [Edit] ─► user texts change -> re-run render step 2+ with the edit note -> resend
 [Redo] ─► regenerate script or re-render fresh
```

Everything the user approves is per-action. Default = **approve-before-post**.

## Directory layout (scaffolded — flesh out the TODOs)
```
bot/
  package.json          # grammy + deps; scripts: dev, start
  tsconfig.json
  src/
    index.ts            # grammy bot: commands, buttons, wiring  (START HERE)
    config.ts           # loads ../.env, exports typed config
    state.ts            # in-memory per-chat job state (current reel, edit context)
    jobs/
      idea.ts           # random or described -> script (uses lib/voice + lib/claude)
      render.ts         # clip -> whisper -> scene plan -> ReelData -> remotion render
      post.ts           # supabase upload -> instagram publish
    lib/
      voice.ts          # THE voice prompt + few-shots (script generation)
      claude.ts         # call `claude -p` headless, return text / parsed JSON
      whisper.ts        # spawn scripts/whisper_transcribe.py -> Word[]
      scenePlan.ts      # transcript+topic -> ordered scene plan (cutaways + timings)
      ig.ts             # Instagram Graph API client (graph.instagram.com)
      supabase.ts       # upload mp4 -> public URL
scripts/
  whisper_transcribe.py # faster-whisper word-level -> JSON (stdout)
studio/                 # the Remotion project (renders happen here via CLI)
```

## Telegram bot — required flows (grammY, apiRoot = TELEGRAM_BOT_API_BASE_URL)
Point grammY at the self-hosted server so big clips download:
`new Bot(token, { client: { apiRoot: process.env.TELEGRAM_BOT_API_BASE_URL } })`.

Commands / messages to handle:
- `/idea` → generate a RANDOM on-brand idea + script now, send it.
- `idea: <description>` → generate a script for the described idea now.
- `tomorrow: <idea>` → append to `topics.md` queue, confirm.
- **video/document message** (the clip) → download via `getFile` (works >20MB on the
  self-hosted server), kick off `jobs/render`, reply "rendering…", then send the mp4 with
  an inline keyboard: **[✅ Post] [🔁 Redo] [✏️ Edit]**.
- **callback [Post]** → `jobs/post`, reply with the IG permalink.
- **callback [Redo]** → re-render (or regenerate script) and resend.
- **callback [Edit]** → reply "what should I change?", set state to await an edit note; the
  next text message is the edit → re-run render from the scene-plan step with that note
  passed into `claude -p`, resend for approval again.

Keep per-chat state in `state.ts` (which reel is pending, its files, edit mode).

## Render pipeline details (this is where quality lives)
1. **Transcribe** the user's clip with faster-whisper, WORD level. `whisper.ts` spawns
   `scripts/whisper_transcribe.py <audio.wav>` and parses `Word[] = {text,startMs,endMs}`.
   Extract audio first with `npx remotion ffmpeg -i clip.mp4 -ar 16000 -ac 1 audio.wav`.
2. **Captions match the audio**: feed those Word[] straight into the caption component —
   this is what makes subtitles line up with speech. Do NOT auto-space evenly (that was only
   for the placeholder demos).
3. **Scenes match the audio**: the director (`scenePlan.ts`) reads the transcript + topic,
   finds the beats/entities (products, repos, tools, numbers), and produces an ordered scene
   plan with **frame ranges tied to word timestamps** — e.g. when the user says "Vercel",
   schedule a logo cutaway at that word's start. The talking-head fills the non-cutaway time.
4. **Bespoke components**: per the philosophy, for each scene the director either reuses a
   matching existing component (studio/src/nick, studio/src/reel_cursor) or asks `claude -p`
   to WRITE a new polished Remotion component for this specific beat (save under
   `studio/src/generated/<reel-id>/`). Fetch REAL assets with Playwright (logos, repo/site
   screenshots) into `studio/public/generated/<reel-id>/`.
5. **Audio**: read `studio/public/audio-manifest.json`; place SFX at cut frames and pick a
   music bed, ducked under the voice (lower `<Audio>` volume during caption regions).
6. **Assemble ReelData + render**: write the reel's data/props to a JSON the composition
   reads, then `cd studio && npx remotion render <Comp> out/<id>.mp4 --props=<file>`.
   Validate H.264/AAC with `npx remotion ffmpeg -i out/<id>.mp4` before posting (IG needs
   H.264+AAC, ≤90s, a public URL).

The user's real clip replaces the `FacePlaceholder` — pass `videoSrc` (a `staticFile` path
under `studio/public/`) into the face slots.

## Instagram posting (`lib/ig.ts`) — host is graph.instagram.com
Two-step: (1) POST `/{IG_USER_ID}/media` with `media_type=REELS`, `video_url` (the Supabase
public URL), `caption`; (2) poll `/{container_id}?fields=status_code` until `FINISHED`;
(3) POST `/{IG_USER_ID}/media_publish` with `creation_id`. Containers expire in 24h — only
build at publish time. Dev-mode tester lets you publish to your own page without App Review.

## Script generation (`lib/voice.ts` + `lib/claude.ts`)
`voice.ts` holds the full voice prompt + the gold-standard few-shots (see CLAUDE.md "voice").
`claude.ts` shells out to `claude -p "<prompt>" --output-format text` (or json). This draws
from the Max subscription; keep prompts lean, schedule-driven, no 24/7 loops (brief §6).

## How to run / test on the runner
```bash
# 0. one-time
cp .env.example .env   # then fill IG + Supabase values (Telegram already filled)
cd studio && npm i && cd ..
cd bot && npm i && cd ..
pip install faster-whisper   # already done on the runner

# 1. make sure the self-hosted Telegram Bot API server is up (Docker, port 8081)
docker ps | grep telegram-bot-api    # if missing, see CLAUDE.md / step-0 docker run

# 2. run the bot
cd bot && npm run dev
```
Test order (smallest first): `/idea` returns a script → send a short clip → get an mp4 with
buttons → [Edit] a tweak → [Post] to IG. Verify each before moving on.

## Definition of done
- `/idea` (random) and `idea:<desc>` both return an on-voice script.
- Sending a clip returns a rendered vertical mp4 whose **captions and cutaways line up with
  the spoken words**, the user's face fills the face slots, SFX/music present.
- [Edit] applies a text change and re-renders; [Redo] regenerates; [Post] publishes to IG
  and returns the permalink.
- Components are freshly built + polished per topic (not a static template), real assets
  fetched via Playwright.
```
