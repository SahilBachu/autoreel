// The data contract that drives the whole Studio.
// The Robot just emits a ReelData object; the composition renders it.

// A word-level caption. Subset of @remotion/captions' Caption (which faster-whisper
// produces). We only need text + timing to render.
export type Word = {
  text: string;
  startMs: number;
  endMs: number;
};

export type InsertType = "proof" | "tweet" | "broll";

// A benchmark / stat card. Numbers shown here must be REAL (see brief §7).
export type ProofData = {
  label: string;
  rows: { name: string; value: string; highlight?: boolean }[];
};

export type TweetData = {
  name: string;
  handle: string;
  avatar?: string; // staticFile path or url; optional -> initials
  text: string;
};

export type BrollData = {
  src?: string; // staticFile path or url; optional -> placeholder
  caption?: string;
};

export type Insert =
  | { type: "proof"; startMs: number; endMs: number; side: "left" | "right"; data: ProofData }
  | { type: "tweet"; startMs: number; endMs: number; side: "left" | "right"; data: TweetData }
  | { type: "broll"; startMs: number; endMs: number; side: "left" | "right"; data: BrollData };

// The "engine" knobs. The Robot (or I) pick these per video from the transcript
// + topic. Named presets keep the brand consistent while varying the output.
export type CaptionStyle = "clean" | "punch";
export type BackgroundStyle = "spotlight" | "solid";

export type ReelData = {
  topic: string;
  handle: string; // persistent watermark; no intro/outro title cards
  // The talking-head clip (staticFile path or url). Empty string -> render a
  // placeholder box, so the composition works before a real clip exists.
  videoSrc: string;
  captions: Word[];
  inserts: Insert[];
  audio: { musicSrc: string }; // empty string -> no music
  style: { caption: CaptionStyle; background: BackgroundStyle };
};
