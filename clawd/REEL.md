# Clawd shots inside a reel

The kit here is [ClaudeAnimationBase](https://github.com/JohnHeibel/ClaudeAnimationBase) (MIT,
John Heibel), vendored with one change: `src/core.js` reads the canvas size from `PROJECT.w/h`.
`ANIMATION_GUIDE.md` is the kit's own guide and still applies. This file covers what's different
when a shot goes into one of sahil's reels (`bot/src/lib/clawd.ts` builds them).

## What a reel shot is

- **A short reaction or illustration of ONE spoken line**, 3–7 s, not a short film. The reel is a
  talking head; the shot is a square card (720×720) that floats over him for as long as he's on
  that line, then the camera moves on. The shot's job is the feeling or the joke of the line —
  Clawd shocked at a number, smug about a win, crushed by a ban, typing furiously, celebrating.
- **One shot, one event, one read or two.** Usually a single `shots([[0, fn]])`. Follow rule 4
  (timing): the event lands in the first ~1.5 s so it reads while he says the line, then the
  reaction holds and stays alive.
- **Fill the square.** The card is small on a phone, so frame it like a close-up: Clawd big
  (u ≈ 30–40 on the 720 canvas), the body's centre near the canvas centre, the ground line about
  70–75% of the way down, props beside or above Clawd rather than a big empty sky. Keep the action
  inside the middle ~85% — the card's corners are rounded.
- **Opening**: no hard first frame. Paint in quickly (an iris from Clawd, or a fast brush wipe)
  within the first ~0.35 s — the card is already arriving on screen.
- **Ending**: NO transition out. The last ~0.6 s is a held, still-alive pose (idle `feel()`
  motion, boil). The reel freezes the final frame if the camera lingers, so the last frame must be
  a good picture, not mid-wipe.
- **No text** (rule 2 applies even more here: the reel already has captions). Marks and emotes
  only. Props stand for things: a laptop, a bill, a padlock, a trophy, a rocket, a server rack.
- **Who Clawd is here**: the mascot of Claude Code. When the story is about Claude/Anthropic,
  Clawd is Claude. When it isn't, Clawd is "the AI" or the viewer's stand-in, reacting to the news.
  Other companies or people can appear as simple painted props or creatures — never logos, never
  likenesses of real people.

## Speed: the runner has no GPU

The reel renders on an old laptop with software WebGL. Measured there: flat `wash` + `inkLine`
shots at 720×720 run ~0.15–0.25 s/frame; anything with watercolour `fill` runs 30–50 s/frame.

- **Never use `fill`** (watercolour fills, `bleed`, `tex`, `border`). Use `wash` (with `washOp` for
  soft layers) and `ink`. `hatch` sparingly. `glow()` is fine.
- **Don't call `brushWipe()`** — it paints with `fill`. For a wipe, paint your own strokes with
  `wash` only (a few fat `ribbon()` strokes sweeping across).
- Keep shapes in the low hundreds per frame.

## Files

A job lives in `clawd/jobs/<videoId>-<n>/`: `config.js` (duration, bpm, w, h — written for you),
`studio.html` (written for you), and **`scene.js` — the only file you write**. From the job folder:

```bash
node ../../render.mjs --sheet=0.2,0.8,1.5,2.5,3.5 --cols=5 --w=240 --out=out/sheet.jpg   # look at it
node ../../render.mjs --strip=0:0.6 --cols=8 --w=180 --out=out/strip.jpg                 # the opening
```

Add `--soft-gl` on Linux. The bot renders the final MP4 itself.
