# EXPLAINER — the faceless series ("how it actually works")

The nightly job (`bot/src/jobs/explainer.ts`) reads this file twice: once to pick the topic and
write the script, once to build the scenes. sahil edits it by hand; it wins over defaults.

## The series

Two lanes, mixed:
- **How it actually works**: the engineering behind everyday or newsworthy tech (a fold screen,
  noise cancelling, Face ID, wireless charging, a chip, a satellite, the power grid).
- **How AI actually works**, for people who use AI but aren't developers (why chatbots make things
  up, how an image model turns noise into a picture, what a GPU does, why data centres need power
  plants, how voice cloning works).

Pick topics people are curious about THIS WEEK (a launch, a viral moment, a news story) that hide
a genuinely interesting mechanism. Not "model X beat model Y". Never a straight copy of a topic
@speedy_devv or @scroll.engineer just did unless the angle is new ("not how the fold works, but
why it's cracking").

## The script (40-50 seconds)

- 120-135 words, 8-10 lines. Every line becomes a scene beat, so one idea per line.
- **Line 1 is the hook**: stakes or a surprise in the first words ("Apple's two-thousand-dollar
  foldable iPhone just came out, and screens are already cracking."). No "have you ever wondered".
- **An investigation shape that holds people**: "three suspects", "four steps", "five layers",
  announced early and counted down on screen. The payoff comes at the end.
- **Plain words.** Say what it does, not what it's called. A number only if it's real.
- **Every fact traces to a source** you fetched (put the URLs in `sources`). If sources disagree
  or nobody knows, say so ("Apple hasn't said.").
- **The last line is share-bait, never a CTA**: "send this to the friend who pre-ordered",
  "send this to whoever still says…". No "follow for more".
- Mark 1-2 emphasis words per line with *asterisks* (they get the selection box in the captions).
- Voice: sahil's page tone (curious, plain-spoken, a little dry), narrated by a calm male voice.

## The look (build on `studio/src/explainer/kit.tsx`)

The reference implementation is the first video, `studio/src/explainer/duo/` ("Why the iPhone
Duo is already cracking"): read Duo.tsx, Phone.tsx, Stack.tsx, Hinge.tsx before building.

- A dark charcoal studio (`Backdrop`), semi-real 3D objects (react-three-fiber + drei inside
  `ThreeCanvas`), the invisible physics in warm gold (`X.gold`, `Glow`), internals in an x-ray
  blue (`X.xray`, translucent volumes + `Edges`).
- One 3D "set" per idea (2-4 sets per video), crossfading between them; the camera moves slowly
  between keyframes (`camAt(keys, f, 1)` adds drift), pushes in on the detail being talked about.
- Captions at the top (`Captions`), leader-line labels pinned to 3D points (`Leader` + `project`),
  a `Counter` for the investigation, honest `Note`s ("Magnified illustration · not to scale",
  "Sources: …" at the end).
- Every scene is timed off the narration: `timeLines(lines, words)` and the word-lookup pattern in
  Duo.tsx (`at(scene, wordPrefix)`), so the picture lands on the word.
- Objects sit in the middle band (y ≈ 450-1500 px); nothing under the captions (y < 420).
- ALL motion from `useCurrentFrame()`; never `useFrame`, never Math.random (use `rand(i)`).
- Remember the camera gotcha: build rotations with `camAt` (it uses a camera for lookAt).
- Cheap on the runner: no postprocessing, `Glow` sprites for bloom, ≤ a few thousand triangles.

## The caption

First line `comment NEWS for the full breakdown` (the DM autoresponder sends the site article),
then the hook with the real names in it, one plain "what it is" line, the share line, a blank line,
exactly 5 lowercase hashtags.
