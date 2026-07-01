import { chromium } from "playwright";

// Fetch a REAL screenshot of a URL (product site, repo, docs, a tweet) for a cutaway, so the
// reel shows the actual thing instead of a synthetic mock (per CLAUDE.md's asset philosophy).
// Portrait-ish, retina, best-effort cookie dismissal. Returns false on ANY failure so the
// caller can just drop that cutaway and still render.
export async function screenshot(url: string, outPath: string): Promise<boolean> {
  let browser;
  try {
    browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"] });
    const page = await browser.newPage({
      viewport: { width: 1280, height: 1600 },
      deviceScaleFactor: 2,
    });
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
    await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});

    // best-effort: dismiss a cookie/consent banner if there's an obvious accept button
    for (const sel of [
      "button:has-text('Accept all')",
      "button:has-text('Accept')",
      "button:has-text('I agree')",
      "button:has-text('Got it')",
      "[aria-label*='accept' i]",
    ]) {
      try {
        const el = page.locator(sel).first();
        if (await el.count()) {
          await el.click({ timeout: 1500 });
          break;
        }
      } catch {
        /* ignore */
      }
    }

    await page.waitForTimeout(1100); // let fonts/hero animations settle (+ give CF a beat to auto-pass)

    // bail on bot-wall / challenge / error pages — a screenshot of a Cloudflare "verify you are
    // human" page looks terrible, so treat it as a failed fetch and let the caller drop the scene.
    const title = (await page.title().catch(() => "")) || "";
    const body = await page.evaluate(() => (document.body?.innerText || "").slice(0, 500)).catch(() => "");
    const blocked = /just a moment|attention required|verify you are human|are you a robot|checking your browser|access denied|enable javascript and cookies|cloudflare/i;
    if (blocked.test(title) || blocked.test(body)) return false;

    await page.screenshot({ path: outPath, clip: { x: 0, y: 0, width: 1280, height: 1600 } });
    return true;
  } catch {
    return false;
  } finally {
    await browser?.close().catch(() => {});
  }
}
