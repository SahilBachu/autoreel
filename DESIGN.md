# DESIGN — how every video looks and sounds

The visual brain. The director reads this (plus COMPONENTS.md) before planning any video;
the learning pass appends to the learned section. Edit anything — next render obeys.

## the look (brand v2 — locked 2026-07-01)

Dark, minimal, product-grade. Linear / Notion / Vercel energy — glassy panels, hairline
borders (rgba white 9%), generous negative space, Geist type everywhere, soft glows, film
grain + vignette. Nothing decorative without a job.

- **Base:** near-black `#050507`, surfaces are translucent white (4.5–8%), text `#FAFAFA`.
- **Accent:** ONE saturated color per video, picked at random at render time
  (blue / cyan / green / orange / red / pink / violet). It drives: background haze + blobs,
  glow shadows, emphasized words, hero bars/rows, checkmarks, prompts, rings. Components
  read it from context — nothing hardcodes a color.
- **Type:** Geist (sans) for everything human; Geist Mono for kickers, terminals, code,
  decrypt effects, tiny labels. Tight tracking on big sizes (-0.03em and tighter).
- **Backgrounds:** three variants — plain (accent haze top), grid (hairline grid, masked),
  shader (drifting blurred accent blobs — the liquid look). Components pick their own.
- **Signature effects:** decrypt/scramble text reveal · image/logo dissolving into glowing
  ASCII (max once per video) · glow pulses on hero elements.

## motion rules

- Everything drives off `useCurrentFrame` — springs (damping ~18-22), never wall-clock,
  never Math.random (use remotion `random(seed)`). Third-party animation libs (framer-motion
  etc.) are banned inside compositions: they break deterministic rendering.
- One strong entrance per scene; staggers 4-10 frames apart; hard cuts between scenes with
  a 4-frame fade at scene edges (handled by AutoReel).
- Numbers count up (Easing.out(cubic), ~26-40 frames). Typing effects ~30-42 chars/sec.

## composition & captions

- 1080×1920, 30fps. The talking head is the base layer; scenes are full-screen covers over
  it (~70% of the timeline, 1.2–2.2s head gaps between).
- Scene content sits inside `<Scene>` (fx.tsx) which reserves the bottom ~400px — captions
  live there and nothing may collide with them.
- Captions: exact whisper transcript, 3-word window, Geist 700 on a dark hairline pill.

## audio

- Music: ONE lofi bed per video, picked at random from `studio/public/music/*.mp3`
  (drop new mp3s in — auto-included). Bed volume 0.32 under a voice boosted 2.8x.
- SFX from `studio/public/sfx/` (see `public/audio-manifest.json` for tags): at most 3 quiet
  whooshes (0.16) per video, ≥5s apart, on scene starts, never on the hook.
- Want different vibes? Add music files and describe them in audio-manifest.json — the
  studio step will read this section for mood rules.

## learned (auto-updated from sahil's video edits — safe to edit or delete)

