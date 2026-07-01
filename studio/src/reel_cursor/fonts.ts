import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

// Playfair Display italic for the serif titles (other families load elsewhere).
export const cursorFontsReady = Promise.all([
  loadFont({ family: "Playfair Display", url: staticFile("fonts/playfair-italic-600.woff2"), weight: "600", style: "italic", format: "woff2" }),
  loadFont({ family: "Playfair Display", url: staticFile("fonts/playfair-italic-700.woff2"), weight: "700", style: "italic", format: "woff2" }),
]);
