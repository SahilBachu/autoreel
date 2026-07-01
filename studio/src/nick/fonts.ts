import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

// Nick-style faces: General Sans (display), Satoshi (body/caption), JetBrains Mono (code).
export const nickFontsReady = Promise.all([
  loadFont({ family: "General Sans", url: staticFile("fonts/generalsans-500.woff2"), weight: "500", format: "woff2" }),
  loadFont({ family: "General Sans", url: staticFile("fonts/generalsans-600.woff2"), weight: "600", format: "woff2" }),
  loadFont({ family: "General Sans", url: staticFile("fonts/generalsans-700.woff2"), weight: "700", format: "woff2" }),
  loadFont({ family: "Satoshi", url: staticFile("fonts/satoshi-500.woff2"), weight: "500", format: "woff2" }),
  loadFont({ family: "Satoshi", url: staticFile("fonts/satoshi-700.woff2"), weight: "700", format: "woff2" }),
  loadFont({ family: "JetBrains Mono", url: staticFile("fonts/jetbrainsmono-400.woff2"), weight: "400", format: "woff2" }),
  loadFont({ family: "JetBrains Mono", url: staticFile("fonts/jetbrainsmono-700.woff2"), weight: "700", format: "woff2" }),
]);
