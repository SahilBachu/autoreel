// @ts-check
import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";

// Everything is rendered on demand (output: "server") so a new row in
// `reel_posts` shows up on the next request — no rebuild, no webhook.
//
// The Cloudflare adapter also drives `astro dev` (it runs the site in a local
// workerd via wrangler), so what you see on localhost is what deploys.
export default defineConfig({
  output: "server",
  adapter: cloudflare({
    // The site has no images to transform; skip the Images binding.
    imageService: "compile",
  }),
  // No sessions → the adapter won't auto-provision a SESSION KV namespace on deploy.
  session: false,
  server: { port: 4321 },
  devToolbar: { enabled: false },
});
