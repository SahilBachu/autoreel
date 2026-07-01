import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

// Geist (Vercel's typeface) — variable woff2s copied from the `geist` npm package
// into public/fonts by the setup step. Family names match theme.ts F2.
const safe = (family: string, file: string) =>
  loadFont({ family, url: staticFile(`fonts/${file}`) }).catch((e) => console.warn(`font ${family} failed`, e));

safe("Geist", "Geist-Variable.woff2");
safe("Geist Mono", "GeistMono-Variable.woff2");
