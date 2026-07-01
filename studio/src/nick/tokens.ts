// Nick Saraev style system — reverse-engineered from the reference reel.
// Two worlds hard-cut against each other: a warm CREAM world (title cards, chips,
// skill lists, composer) and a DARK world (logo cutaways, screenshots, leaderboard,
// terminals framed on terracotta).

export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;

export const C = {
  // cream world
  cream: "#F3EDE3",
  creamCard: "#FFFFFF",
  cardBorder: "rgba(32,29,26,0.10)",
  ink: "#201D1A",
  inkSoft: "rgba(32,29,26,0.62)",
  inkFaint: "rgba(32,29,26,0.38)",

  // accent (rust / terracotta)
  rust: "#C0532F",
  rustSoft: "rgba(192,83,47,0.12)",
  orangeBg: "#BE5A3A", // solid bg used to frame screen recordings

  // dark world
  black: "#0B0B0C",
  darkPanel: "#111114",
  darkCard: "#17171B",
  darkBorder: "rgba(255,255,255,0.09)",
  white: "#FFFFFF",
  whiteDim: "rgba(255,255,255,0.60)",

  // github-ish dark for file views
  ghBg: "#0D1117",
  ghText: "#C9D1D9",
  ghMuted: "#8B949E",
  ghLink: "#58A6FF",

  green: "#3E9B57",

  // caption pill
  capPill: "rgba(12,12,14,0.82)",
};

export const F = {
  display: '"General Sans", system-ui, sans-serif',
  body: '"Satoshi", system-ui, sans-serif',
  mono: '"JetBrains Mono", ui-monospace, monospace',
};

export const msToFrames = (ms: number) => Math.round((ms / 1000) * FPS);
