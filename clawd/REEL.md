# Hand-painted shots inside a reel (with or without Clawd)

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
- **Who Clawd is here**: the mascot of Claude Code. A shot has Clawd only when the brief says so —
  usually because the line is about Claude / Claude Code doing something, and then Clawd IS
  Claude, doing it. Other companies or people can appear as simple painted props or creatures —
  never logos, never likenesses of real people.

## Shots without Clawd

Most briefs that aren't about Claude come without Clawd. Same medium, same rules (brush strokes,
flat 2D, boil, no text, something happens, paint-in, held ending) — just a different star:

- **Objects that act.** The thing the line is about, alive: a game cartridge that pops open, a
  file that wakes up and stretches, a laptop that sprouts arms and types, a stack of tabs that
  collapses into one. Give it a face (two slit eyes like Clawd's work for anything) when the shot
  needs a reaction; leave it faceless when the motion alone tells it.
- **A simple character of your own** when the line needs someone: a little robot, a game sprite,
  a blob creature, a bird. Design it from few outlines (one body shape, stubby limbs, eyes),
  paint it with `paint()`/`inkLine()`, and give it the same acting: anticipation, takes, squash,
  `spring()` settles. `jump()`, `take()`, `kf()` and `arcPt()` work for anything, not just Clawd.
- **A transformation** reads best: before → the change → after, with the change on a beat and a
  held after. ("Raw video clip → it gets cut into neat reels" is a strip that slices itself into
  three cards.)
- Keep one subject and one palette; don't fill the frame with clutter to make up for no Clawd.

## Speed: the runner has no GPU

The reel renders on an old laptop with software GL (Mesa llvmpipe): ~1.5–2.5 s per frame for a
720×720 shot, and the final clip renders at **12 fps** ("on twos", like hand-drawn animation; the
linework already boils at 12). Design for that:

- A fast move still needs 3+ frames (a quarter second) to read at 12 fps.
- **Never use `fill`** (watercolour fills, `bleed`, `tex`, `border`): far slower, and it muddies
  on this renderer. Use `wash` (with `washOp` for soft layers) and `ink`. `hatch` sparingly.
  `glow()` is fine.
- **Don't call `brushWipe()`** — it paints with `fill`. For a wipe, paint your own strokes with
  `wash` only (a few fat `ribbon()` strokes sweeping across).
- Keep shapes in the low hundreds per frame.
- Review renders are slow too, so look with small sheets (5–6 frames) and short strips, not dozens
  of frames. The ms/frame the sheet prints leaves out the GPU wait; don't trust it as a speed.

## Files

A job lives in `clawd/jobs/<videoId>-<n>/`: `config.js` (duration, bpm, w, h — written for you),
`studio.html` (written for you), and **`scene.js` — the only file you write**. From the job folder:

```bash
node ../../render.mjs --sheet=0.2,0.8,1.5,2.5,3.5 --cols=5 --w=240 --out=out/sheet.jpg   # look at it
node ../../render.mjs --strip=0:0.6 --cols=8 --w=180 --out=out/strip.jpg                 # the opening
```

Add `--gpu-angle=gl-egl` on Linux (the runner). The bot renders the final MP4 itself.
