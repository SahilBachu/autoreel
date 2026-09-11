// ─────────────────────────────────────────────────────────────────────────────
// SITE IDENTITY — the one file to edit.
//
// Everything below is a PLACEHOLDER until Sahil fills it in. Nothing else in
// the site hardcodes a handle, a name, or an avatar path.
// ─────────────────────────────────────────────────────────────────────────────

export const site = {
  /** Instagram handle, without the @. */
  handle: "yourhandle",

  /** Display name shown under the handle. Leave "" to hide. */
  name: "Sahil",

  /** One quiet line under the name. Leave "" to hide. */
  tagline: "One AI tool a day. Tap to open.",

  /**
   * Profile picture. Drop a square image at web/public/avatar.jpg (or .png)
   * and point this at it: "/avatar.jpg". The default is a generated SVG
   * placeholder so nothing renders as a broken image.
   */
  avatar: "/avatar-placeholder.svg",

  /** Public URL of the site once deployed (used for canonical + og tags). */
  url: "https://example.com",

  /**
   * The ONE accent for the whole site. The videos randomise this per render;
   * the site commits to one for coherence. Pick from studio/src/auto/theme.ts:
   * blue #3B82F6 · cyan #22D3EE · green #4ADE80 · orange #FB923C
   * red #F43F5E · pink #EC4899 · violet #8B5CF6
   */
  accent: { hex: "#3B82F6", rgb: "59,130,246" },
} as const;

export const instagramUrl = `https://instagram.com/${site.handle}`;
