import { renderReel } from "./src/jobs/render.js";

const mp4 = await renderReel({
  clipPath: "/mnt/c/Users/super/InstagramAutomation/autoreel/studio/public/clips/reel-1782913980247.mp4",
  script:
    "Anthropic dropped Sonnet 5. it's cracked. basically as good as Opus for a third of the price. runs agentic tasks for hours without wandering off. already my daily driver.",
  topic: "Sonnet 5 just dropped",
});
console.log("RENDERED:", mp4);
