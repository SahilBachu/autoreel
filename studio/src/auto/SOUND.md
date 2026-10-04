## sound

A UI-sound layer under a talking-head tech reel: basic, effective sounds you actually hear,
never on top of the voice. (The first version, a synthesised kit "felt more than heard", ended
up inaudible; he asked for "basic and effective sound effects" instead.)

### The kit: `public/sfx/v4/`

Real recorded sounds from mixkit.co (Mixkit License: free for commercial use, no
attribution). Each was trimmed (lead silence cut, short fade out), converted to 48 kHz stereo
16-bit WAV and **level-matched to −20 LUFS max-momentary**. The mix level is set in
`sound.ts`, not in the files.

| file | mixkit source | used for | hit |
|---|---|---|---|
| `whoosh-sweep-a` | #168 Fast air sweep transition | camera travel (from the right) | 280 ms |
| `whoosh-sweep-b` | #166 Fast small sweep transition | camera travel (from the left) | 280 ms |
| `whoosh-wind` | #1461 Short wind swoosh | camera travel (down) / fresh entrance | 160 ms |
| `click-select` | #3124 Modern technology select | checkmarks, steps, toggles, cursor clicks | 0 |
| `click-soft` | #1109 Select click | the next step right after one | 0 |
| `pop` | #2358 Long pop | an object landing | 0 |
| `typing` | #1376 Typing on an electronic device (first 0.85 s) | something starts typing | 40 ms |
| `key` | #1117 Classic click | a shortcut / kbd | 0 |
| `confirm` | #2867 Confirmation tone | the payoff (getit) | 0 |
| `bass-hit` | #2299 Short bass hit | a big number settling | 30 ms |
| `riser` | #2638 Magic transition sweep (from 0.4 s) | into a reveal after a face beat | 950 ms |
| `shutter` | #1432 Camera digital shutter | a real screenshot (browser/screenshot) landing | 50 ms |

The synthesised v3 kit (`public/sfx/v3/`, `make-kit.mjs`) and the old stock files are listed
under `sfx_legacy` in `audio-manifest.json`, kept only so older props still resolve.

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
     - `capture` (browser, screenshot): shutter
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
then × `10^(sfxGainDb/20)` from the bot (negative only when the voice was peak-limited below
its target, so the cues follow it down).

The voice is normalised per clip (≈ −12.6 LUFS at target, typically −14 after peak limiting).
`SFX_TARGET_LUFS = −24` puts cues ~10–13 dB under the voice's short-term loudness. The music
bed sits ~16 dB under the voice (`mixLevels` in `bot/src/lib/loudness.ts`, from each track's
manifest `lufs`), so cues land ~5–6 dB over it. Measured on the cf reel: voice −14.4 LUFS
short-term, bed −29.8, cue peaks −23 to −24.5.

### Tuning

- **Everything louder or quieter:** `SFX_MASTER_DB` (±3 dB is a big move).
- **One sound:** its `trimDb` in `KIT`.
- **Voice target changes** (`TARGET_RMS_DB` in loudness.ts): move `SFX_TARGET_LUFS` by the same
  number of dB. Per-clip differences are already handled by `sfxGainDb`.
- **Denser or sparser:** `DENSITY_WINDOWS` (the 12 s window sets the average), then
  `MIN_GAP_S` and `SAME_FAMILY_GAP_S`.
- **What a kind sounds like:** `KIND_FAMILY`. For timing, use `STEP_MS` and the `*_MS`
  offsets, which mirror the v2 components at 30 fps.
- **Camera sync:** `TRAVEL_HIT_MS` mirrors camera.ts (`LEAD` 9 / `TAIL` 13 plus the
  spring). If the travel changes, move it.
- **The sounds themselves:** swap a file in `public/sfx/v4/` for another one, trimmed to start
  on (or `hitMs` before) its hit and normalised to −20 LUFS max-momentary
  (`ffmpeg -i x.wav -af ebur128=metadata=1,...` to read it), then update `KIT` and the manifest.
