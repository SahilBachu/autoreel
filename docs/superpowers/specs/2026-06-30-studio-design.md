# autoreel — Studio design (Phase 1)

Date: 2026-06-30
Status: Approved (Part 1). Script-voice prompt (Part 2) deferred to the Robot phase.

The **Studio** is the creative Remotion template — the part with taste. It is built
and iterated by hand on the main machine with live preview, then locked. The
**Robot** (automation) is wrapped around it later. This doc captures the locked
look + the composition architecture.

## Locked visual tokens
- **Format:** vertical 1080×1920, 30fps.
- **Base:** near-black `#0A0A0B` with *restrained* depth — faint grain, one soft
  radial glow, frosted-glass cards only where a card actually appears. Restraint is
  the guardrail against "AI slop".
- **Accent:** electric blue / indigo `#4F7DFF`. Carries every highlight: active
  caption word, card hairline borders, intro/outro underline, small UI ticks.
- **Fonts:** Clash Display (titles/intro/outro) + Satoshi (captions & card body).
  Both from Fontshare.
- **Captions:** 2–3 word rolling window; active word blue + slightly scaled; bold;
  safe-zone positioned. Calm-premium, MKBHD — not meme-y.

## Data contract (drives everything; the Robot just emits this JSON)
```ts
type Word   = { text: string; startMs: number; endMs: number };
type Insert = {
  type: 'proof' | 'tweet' | 'broll';
  startMs: number; endMs: number;
  side: 'left' | 'right';          // which side the card enters / frame slides away from
  data: unknown;                    // shape depends on type
};
type ReelData = {
  topic: string;
  intro: { title: string; subtitle?: string };
  outro: { handle: string };
  videoSrc: string;                 // talking-head clip
  captions: Word[];                 // from faster-whisper (word-level)
  inserts: Insert[];
  audio: { musicSrc: string };
};
```
Rationale: the frame skeleton is fixed; captions and cards are pure data, so the
same composition renders any day's reel with zero code changes. This is the seam
between Studio and Robot.

## Components (each small, one job, independently testable)
- `Reel.tsx` — reads `ReelData`, lays out the 3-scene skeleton.
- `Frame.tsx` — animated rounded-rect holding the clip (`OffthreadVideo`). Centerpiece.
- `CaptionTrack.tsx` — rolling 2–3 word window from `captions`.
- `ProofCard.tsx` / `TweetCard.tsx` / `BrollCard.tsx` — the three insert renderers.
- `Intro.tsx` / `Outro.tsx` — bookends.
- `style/tokens.ts` — every font/color/spacing/motion/caption value in ONE file.
  This is the file we tune live.

## Scene skeleton + choreography
- **Intro** (~0–2s): Clash Display title springs in, blue underline wipes, soft tick.
- **Main** (full clip length): `Frame` centered & large by default. When an insert is
  active, the frame **springs down in scale and slides to the opposite side**; the
  card springs in on its side; on insert end the frame **springs back**. All
  `spring()`-driven, weighty, never linear, never snappy. Feel lives in `tokens.ts`.
- **Outro** (~last 2s): handle + blue underline, clean sign-off.

## Audio
- Background music `<Audio>`, auto-ducked under the voice (volume drops during caption
  regions).
- SFX fired at each insert enter/exit + intro tick. Subtle, not cartoonish.

## Dynamic duration
Composition length = intro + clip length + outro, via `calculateMetadata` (reads clip
+ captions). Any clip length just works.

## Iteration plan
1. Scaffold project + all components with mock `ReelData` so it renders immediately.
2. User sends one real ~15s test clip → becomes the Phase-1 input.
3. Open `remotion studio`, tune `tokens.ts` live until it hits the MKBHD bar, then lock
   the caption style.

## Deferred (Robot phase)
- Script-voice prompt (Part 2). Gold-standard few-shots are pinned in the brief; will
  be designed + tuned when the 3am research job is built.
