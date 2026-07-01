// Per-video SKIN for the "Cursor 2.0" reel. New skin (serif-italic titles, warm
// paper + dot grid) while keeping Nick's signature terracotta + terminal-on-orange.

export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;

export const S = {
  paper: "#F7F5F0",
  paperCard: "#FFFFFF",
  border: "rgba(26,25,23,0.10)",
  ink: "#1A1917",
  inkSoft: "rgba(26,25,23,0.60)",
  inkFaint: "rgba(26,25,23,0.34)",

  rust: "#C0532F",
  rustSoft: "rgba(192,83,47,0.12)",
  orangeBg: "#BE5A3A",

  black: "#0B0B0C",
  darkCard: "#17171B",
  darkBorder: "rgba(255,255,255,0.10)",
  white: "#FFFFFF",
  whiteDim: "rgba(255,255,255,0.60)",
  green: "#3E9B57",

  capPill: "rgba(26,25,23,0.82)",
};

export const SF = {
  serif: '"Playfair Display", Georgia, serif', // italic titles
  display: '"General Sans", system-ui, sans-serif',
  body: '"Satoshi", system-ui, sans-serif',
  mono: '"JetBrains Mono", ui-monospace, monospace',
};

export const msToFrames = (ms: number) => Math.round((ms / 1000) * FPS);
