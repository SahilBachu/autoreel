import { useEffect, useState } from "react";
import { continueRender, delayRender, staticFile } from "remotion";

// Geist (Vercel's typeface) — variable woff2s copied from the `geist` npm package into
// public/fonts by the setup step. Family names match theme.ts F2.
//
// Loaded from INSIDE a mounted composition, gated by delayRender. The previous version
// called @remotion/fonts loadFont() at module scope (from Root.tsx's side-effect import):
// in the render browser those faces never showed up in document.fonts (probed), so Geist
// Mono fell back to Courier and — on a Linux runner with no system Geist — the sans
// would fall back too. It also never passed a weight, so the variable file registered as
// 400-only. Loading in an effect with the full "100 900" range is verified to work
// (see the world experiment's fonts.ts, which this generalises).
const FACES: [string, string][] = [
  ["Geist", "fonts/Geist-Variable.woff2"],
  ["Geist Mono", "fonts/GeistMono-Variable.woff2"],
];

let loaded: Promise<void> | null = null;
const loadAll = () => {
  if (!loaded) {
    loaded = (async () => {
      for (const [family, file] of FACES) {
        try {
          const ff = new FontFace(family, `url('${staticFile(file)}') format('woff2')`, { weight: "100 900" });
          await ff.load();
          document.fonts.add(ff);
        } catch (e) {
          console.warn(`font ${family} failed`, e);
        }
      }
    })();
  }
  return loaded;
};

/** Call once at the top of any composition that uses the v2 kit (Geist + Geist Mono). */
export const useGeistFonts = () => {
  const [handle] = useState(() => delayRender("geist fonts"));
  useEffect(() => {
    loadAll().then(() => continueRender(handle));
  }, [handle]);
};
