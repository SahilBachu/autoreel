import type { ReelData, Word } from "../types";

// Turn a script string into word-level captions with even spacing.
// Stand-in for faster-whisper output until we drop in a real transcribed clip.
function toWords(script: string, msPerWord = 340, startOffset = 300): Word[] {
  const tokens = script.split(/\s+/).filter(Boolean);
  return tokens.map((text, i) => {
    const startMs = startOffset + i * msPerWord;
    return { text, startMs, endMs: startMs + msPerWord - 40 };
  });
}

// The Sonnet 5 few-shot (brief §2.4) as our reference script.
const SCRIPT = `Anthropic just dropped Sonnet 5. guess they saw my X feed flatlining and felt bad. it's basically as good as Opus 4.8 now — for like half the price. which is wild cause every few months the medium model quietly becomes last year's frontier and nobody even blinks. anyway gonna go burn through my whole limit testing it this week.`;

export const mockReel: ReelData = {
  topic: "Sonnet 5",
  handle: "@autoreel",
  videoSrc: "", // empty -> placeholder box; real clip dropped in later
  captions: toWords(SCRIPT),
  inserts: [
    {
      type: "proof",
      startMs: 4200,
      endMs: 8200,
      side: "right",
      data: {
        label: "SWE-bench Verified",
        rows: [
          { name: "Opus 4.8", value: "77.2%" },
          { name: "Sonnet 5", value: "76.8%", highlight: true },
          { name: "Price", value: "½ the cost", highlight: true },
        ],
      },
    },
    {
      type: "tweet",
      startMs: 11800,
      endMs: 15600,
      side: "left",
      data: {
        name: "some dev",
        handle: "@buildooor",
        text: "the medium model quietly becoming last year's frontier every few months is insane and nobody blinks",
      },
    },
  ],
  audio: { musicSrc: "" }, // empty -> no music until we add a bed
  style: { caption: "clean", background: "spotlight" },
};
