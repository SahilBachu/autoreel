import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

// Fontshare faces, loaded from public/fonts. Family names must match tokens.ts.
export const fontsReady = Promise.all([
  loadFont({
    family: "Clash Display",
    url: staticFile("fonts/clashdisplay-600.woff2"),
    weight: "600",
    format: "woff2",
  }),
  loadFont({
    family: "Clash Display",
    url: staticFile("fonts/clashdisplay-700.woff2"),
    weight: "700",
    format: "woff2",
  }),
  loadFont({
    family: "Satoshi",
    url: staticFile("fonts/satoshi-500.woff2"),
    weight: "500",
    format: "woff2",
  }),
  loadFont({
    family: "Satoshi",
    url: staticFile("fonts/satoshi-700.woff2"),
    weight: "700",
    format: "woff2",
  }),
]);
