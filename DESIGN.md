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
- One strong entrance per scene, then secondary motion for the rest of the hold (kit.tsx
  `Float`, `PushIn`, `Beam`, typing, counters) — a world object can hold ~8s and must never
  look frozen. Staggers 4-10 frames apart. Components pace to their hold via `useBeat()`.
- Numbers count up (Easing.out(cubic), ~26-40 frames). Typing effects ~30-42 chars/sec.

## composition & captions

- 1080×1920, 30fps. The talking head is the base layer, and he records with the phone DOWN
  (static framing, himself centred), so the footage is steady and the graphics can be placed
  precisely.
- **Default renderer: WorldReel** (`studio/src/world/`). Every scene is an OBJECT in one
  connected world; a single camera holds on it, then glides to the next (22-frame travels,
  spring settle, speed-proportional motion blur). Objects float over him, parked top-centre
  (box centre at y≈660, inside a y190–1150 band), overlapping his face by design; his mouth
  usually stays visible. `/style v2` switches to AutoReel (full-screen covers, the old look).
- **Timing follows the speech.** An object stays up while he's talking about it (2.5–10s) and
  holds until the next one arrives when the gap is short; only a real pause releases to his
  face. Long holds stay alive (slow push, glide, the component's own secondary motion).
- **The hook** (first ~3–4.5s, both renderers): a dark-glass card top-centre with the
  subject's real logo, a mono kicker, and the title words lighting up as he says them.
- **Punch-ins** (`world/face.ts`): subtle eased zooms on his face (1.00–1.08) at the hook's
  exit, when the world releases, and at sentence starts. `FACE` there is his nose position.
- Captions: exact whisper transcript, 3-word window, Geist 700 on a dark hairline pill,
  ~y1265–1360. Nothing may collide with them.

## audio

- **Voice gain is measured per clip** (`bot/src/lib/loudness.ts`): speech to about -16 dBFS
  RMS (≈ -12.6 LUFS), peaks capped at -1 dBFS. The old fixed 2.8x boost hard-clipped his
  phone-down recordings.
- **Everything else is set relative to that voice** (`mixLevels`): the music bed ~16 dB under
  it, SFX peaks ~11 dB under it (so a few dB over the bed). Basic and effective: you hear
  them, they never compete with him.
- Music: ONE bed per video, chosen by the director by mood from the tagged tracks in
  `studio/public/audio-manifest.json` — lofi/chill, upbeat tech, dark/serious, hip-hop beats
  (mostly from mixkit.co, free license, no attribution). Each entry carries its measured
  `lufs`, which sets its level; `studio/src/auto/bed.ts` fades it in/out and lifts it ~4 dB in
  real pauses. New mp3s dropped in are auto-included (assumed -14 LUFS until measured).
- SFX (world renderer): real recorded sounds in `studio/public/sfx/v4/` (Mixkit), placed by
  the sound policy in `studio/src/auto/sound.ts` from the camera's real arrivals — whoosh on
  travel, typing when something types, clicks on steps, a camera shutter on a real
  screenshot, a bass hit on a big number, a confirm tone on the payoff. Nothing in the first
  second, ≤2 cues per 4s, ≤3 per 12s. Tuning: `SFX_MASTER_DB` in sound.ts; details in
  `studio/src/auto/SOUND.md`.

## learned (auto-updated from sahil's video edits — safe to edit or delete)

