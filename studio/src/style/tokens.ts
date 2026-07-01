// ─────────────────────────────────────────────────────────────
// THE tuning file. Everything with taste lives here. We iterate this
// live in `remotion studio` until it hits the MKBHD bar.
// ─────────────────────────────────────────────────────────────

export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;

export const colors = {
  bg: "#0A0A0B",
  bgElevated: "#141417",
  text: "#F5F6F8",
  textDim: "rgba(245, 246, 248, 0.55)",
  textFaint: "rgba(245, 246, 248, 0.30)",
  accent: "#4F7DFF",
  accentSoft: "rgba(79, 125, 255, 0.14)",
  accentGlow: "rgba(79, 125, 255, 0.35)",
  hairline: "rgba(255, 255, 255, 0.08)",
  cardBg: "rgba(19, 19, 23, 0.92)",
  cardBorder: "rgba(79, 125, 255, 0.32)",
};

export const fonts = {
  // Fontshare faces (loaded in fonts.ts). Fallbacks keep it rendering pre-load.
  display: '"Clash Display", system-ui, sans-serif',
  body: '"Satoshi", system-ui, -apple-system, sans-serif',
};

export const layout = {
  safeTop: 190,
  safeBottom: 240,
  pad: 72,
  frameRadius: 46,
  cardRadius: 30,
  frameInsetX: 90, // horizontal inset of the talking-head frame from screen edges
};

// Spring physics — weighty, never snappy. (Brief §2.2: springs, not linear.)
export const motion = {
  frame: { damping: 26, stiffness: 85, mass: 1.15 },
  card: { damping: 20, stiffness: 130, mass: 0.85 },
  // OVERLAY choreography: cards float in the upper area; the frame subtly
  // recedes (small scale + dim) so the card pops. Captions stay pinned bottom.
  frameScaleWithCard: 0.965, // subtle recede
  frameDimWithCard: 0.72, // brightness multiplier when a card is up
  cardOffscreenY: 180, // px above rest position a card starts before springing down
  cardTopInset: 150, // distance from top safe zone to the card
};

export const captions = {
  windowSize: 3, // 2–3 words visible at once
  fontSize: 84,
  fontWeight: 800,
  lineHeight: 1.08,
  gap: 22,
  uppercase: true,
  activeColor: colors.accent,
  idleColor: colors.text,
  activeScale: 1.06,
  bottom: 200, // pinned near the bottom safe zone (always below cards)
  maxWidth: 960,
  letterSpacing: "0.005em",
  // legibility without the cartoon 4px stroke — thin stroke + soft shadow
  strokeColor: "rgba(0, 0, 0, 0.38)",
  strokeWidth: 1,
  shadow: "0 6px 26px rgba(0, 0, 0, 0.6)",
};

export const audioTokens = {
  musicVolume: 0.2,
  duckedVolume: 0.07,
};

export const scene = {
  // no intro/outro title cards — reel starts on the talking head.
  tailFrames: Math.round(0.4 * FPS), // small pad after last caption
};

export const msToFrames = (ms: number) => Math.round((ms / 1000) * FPS);
