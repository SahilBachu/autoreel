## sound

A restrained UI-sound layer under a talking-head tech reel: Apple/Linear product-video
sounds, soft, airy and tactile, **felt more than heard**. The voice is king. The creator
asked for "very light and subtle … it's not that kind of video."

### The kit: `public/sfx/v3/`

Synthesised by `public/sfx/v3/make-kit.mjs` (plain Node, no dependencies, seeded, so it
rebuilds byte-identical files). Every file is 48 kHz stereo 16-bit WAV, starts and ends on
exact digital zero (raised-cosine fades, no clicks), has no DC offset and no lead silence,
peaks at or below −1.5 dBTP, and is **level-matched to −20 LUFS max-momentary**. The mix
level is set in `sound.ts`, not in the files.

| file | what it is | used for | hit |
|---|---|---|---|
| `whoosh-air-{right,left,down}` | pink noise through a wide band-pass that rides the envelope (brighter at the fastest point), a little brown-noise body, panned in from the travel direction (`down` is centred and darkens as it lands) | camera travel between objects | 260 ms |
| `tick-a` / `tick-b` | three inharmonic partials (1.87 / 3.05 / 1.19 kHz) with fast decays and a sub-ms contact transient. `b` is +2 semitones | checkmarks, steps, toggles, clicks | 0 |
| `pop-soft` | sine "bloop" gliding 400→600 Hz, 42 ms decay, air puff | an object landing with no camera move | 0 |
| `keys-3` / `key-1` | soft low-profile key: band-passed click, tiny bottom-out, 205/540 Hz body, plate resonance. 3 irregular taps / press+release | something starts typing / a shortcut | 0 |
| `confirm` | two FM "tine" notes, D5→A5, 85 ms apart; the index collapses so each note settles to a near-pure tone | the payoff (getit) | 0 |
| `thump-soft` | felt mallet on a box: 100→50 Hz sub, a saturated 225→180 Hz body, and a 470 Hz knock so phones hear it (a pure sub thump loses 25 dB on a phone speaker; this one loses 8.5) | a big number settling | 0 |
| `riser-soft` | 0.9 s of air rising 300 Hz→3.6 kHz that stops *on* the hit | into a reveal after a face beat | 900 ms |

Every sound gets a small convolution "room" (a synthetic decaying-noise impulse response,
wet at about −20 dB). It adds air without an audible effect.

The old stock files (`public/sfx/*.mp3`) are listed under `sfx_legacy` in
`audio-manifest.json`. They're kept only so older props still resolve. `thud.mp3` is
brick-walled (−0.8 LUFS).

### The policy: `soundCues(objs, fps, { totalFrames })` in `sound.ts`

Input: the world objects `{ kind, from, to }` in frames, plus optional `enter`
(`"travel"`/`"fresh"`, from camera.ts `planBeats`) and `scene` (GetIt's `url` refines the
confirm timing). Output: `{ file, frame, volume }[]`, sorted and deterministic.

1. **Candidates.** Each object can offer two:
   - **How the camera arrives.** A real travel gets the air whoosh, panned by the
     serpentine direction, peaking 80 ms after `from`. A fresh entrance only offers a
     quieter whoosh, as a low-priority fallback.
   - **Its own moment**, by kind family:
     - `typing` (terminal, code, prompt, json, command, search): keys-3 at +560 ms
     - `steps` (runlog, install, checklist, toggles, progress, flow): tick on the first
       check/flip, plus a lower-priority second tick
     - `stat` / `statrow`: thump at +400 ms, as the count-up settles
     - `result` (getit): confirm when the URL finishes typing
     - `reveal` (versus, beforeafter, split): riser into it, only on a fresh entrance
       with ≥0.9 s of face before it, max 1 per video
     - `keypress` (kbd): one key
     - `click` (cursor): one tick
     - `card` (everything that lands): pop
     - `text` (headline, decrypt, callout, quote, kinetic, highlight): nothing
2. **Unknown kinds** are guessed from the name (`NAME_RULES`, e.g. `metric-grid` → stat).
   No match means a quiet, lowest-priority pop.
3. **Selection** goes by priority: result > stat > typing > steps > reveal/keypress > travel/click
   > card > fresh whoosh > second tick > unknown. A candidate is dropped if it:
   - starts before 1 s (the hook);
   - is within 0.45 s of another hit;
   - is within 2.5 s of the same family (whoosh/whoosh, tick/tick);
   - lands in the last 0.3 s;
   - would put more than 2 hits in any 4 s, or more than 3 in any 12 s.

   The windows are local, so cues spread out instead of bunching.
4. Ticks within 6 s of each other step up (tick-a → tick-b). Each cue gets ±0.75 dB of
   seeded level jitter.

What it produced on the cf reel (41 s, 6 objects) was 6 cues, one per object, averaging
one every 6.9 s:

| time | sound | object |
|---|---|---|
| 8.1 s | pop | toolcard entry |
| 13.1 s | whoosh → | barchart |
| 25.8 s | keys | terminal |
| 32.5 s | tick | runlog |
| 35.8 s | tick-b | toggles |
| 39.2 s | confirm | getit |

A dense 15-object stress plan got 8 cues in 37 s, evenly spread. Run
`node --no-warnings out/s3/cues.mjs` from `studio/` to see the timelines.

### Levels

`volume = 10^((SFX_TARGET_LUFS − KIT_REF_LUFS + trimDb + SFX_MASTER_DB ± jitter) / 20)`,
which works out to about 0.25–0.52.

With the current mix (voice ×2.8, which lands at about −5.6 LUFS and clips; bed at 0.32,
about −33 LUFS), cues peak at −28 to −31 LUFS momentary:

- **20–26 dB under the voice** (median 24.7)
- **2.5–6 dB over the music bed**

The mix's integrated loudness is identical with or without them.

Preview: `out/s3/mix-preview.mp4` (and `mix-preview-nosfx.mp4` for A/B), built by
`node out/s3/mix-preview.mjs`. That needs a full ffmpeg on PATH; Remotion's bundled one has
no ebur128/astats/lavfi sources.

### Tuning

- **Everything louder or quieter:** `SFX_MASTER_DB` (±3 dB is a big move).
- **One sound:** its `trimDb` in `KIT`.
- **Voice level changes** (voiceBoost, normalisation): move `SFX_TARGET_LUFS` by the same
  number of dB, or the balance shifts. A voice normalised to −14 LUFS wants about −36.
- **Denser or sparser:** `DENSITY_WINDOWS` (the 12 s window sets the average), then
  `MIN_GAP_S` and `SAME_FAMILY_GAP_S`.
- **What a kind sounds like:** `KIND_FAMILY`. For timing, use `STEP_MS` and the `*_MS`
  offsets, which mirror the v2 components at 30 fps.
- **Camera sync:** `TRAVEL_HIT_MS` mirrors camera.ts (`LEAD` 9 / `TAIL` 13 plus the
  spring). If the travel changes, move it.
- **The sounds themselves:** edit a recipe in `make-kit.mjs`, then run
  `node public/sfx/v3/make-kit.mjs [outDir]`. Every file is re-matched to −20 LUFS
  automatically. Check with `node out/s3/measure.mjs`.
