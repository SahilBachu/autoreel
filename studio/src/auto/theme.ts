import { createContext, useContext } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// BRAND V2 — dark, minimal, Vercel/Linear-grade. ONE bright accent per video,
// chosen at render time and threaded through every scene via <AccentProvider>.
// Canonical doc: ../../../DESIGN.md
// ─────────────────────────────────────────────────────────────────────────────

export type Accent = {
  name: string;
  hex: string; // the pure accent
  soft: string; // translucent fill (chips, bars, fills)
  glow: string; // for box/text shadows
  dim: string; // desaturated companion for secondary strokes
};

const mk = (name: string, hex: string, r: number, g: number, b: number): Accent => ({
  name,
  hex,
  soft: `rgba(${r},${g},${b},0.16)`,
  glow: `rgba(${r},${g},${b},0.50)`,
  dim: `rgba(${r},${g},${b},0.65)`,
});

export const ACCENTS: Record<string, Accent> = {
  blue: mk("blue", "#3B82F6", 59, 130, 246),
  cyan: mk("cyan", "#22D3EE", 34, 211, 238),
  green: mk("green", "#4ADE80", 74, 222, 128),
  orange: mk("orange", "#FB923C", 251, 146, 60),
  red: mk("red", "#F43F5E", 244, 63, 94),
  pink: mk("pink", "#EC4899", 236, 72, 153),
  violet: mk("violet", "#8B5CF6", 139, 92, 246),
};
export const ACCENT_NAMES = Object.keys(ACCENTS);

export function resolveAccent(name?: string): Accent {
  return ACCENTS[(name || "").toLowerCase()] ?? ACCENTS.blue;
}

// dark base — near-black, hairline borders, glassy surfaces
export const T = {
  bg: "#050507",
  bg2: "#0B0B0E",
  surface: "rgba(255,255,255,0.045)",
  surface2: "rgba(255,255,255,0.08)",
  border: "rgba(255,255,255,0.09)",
  borderBright: "rgba(255,255,255,0.18)",
  text: "#FAFAFA",
  dim: "rgba(250,250,250,0.62)",
  faint: "rgba(250,250,250,0.34)",
};

// Vercel-style type system (Geist). Loaded in fonts2.ts.
export const F2 = {
  sans: '"Geist", system-ui, -apple-system, sans-serif',
  mono: '"Geist Mono", ui-monospace, "JetBrains Mono", monospace',
};

const AccentCtx = createContext<Accent>(ACCENTS.blue);
export const AccentProvider = AccentCtx.Provider;
export const useAccent = () => useContext(AccentCtx);
