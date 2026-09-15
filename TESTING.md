# TESTING — the full pipeline, end to end

Two passes: a **rehearsal** that touches nothing public, then a **real run** for each post type.
Everything happens in the Telegram chat except where noted. Run the bot on the runner.

## 0. Pre-flight (1 minute)

On the runner, in `bot/`:

```bash
npx tsx src/jobs/probe-ig-dm.ts        # read-only: token, media, comments all PASS
```

In Telegram: `/dm` — should say `last check: ok`. If it says FAILED, the token is missing a
scope (see BUILD.md → "If Instagram says…").

Keep the site open on the runner or your laptop: `cd web && npm run dev` → http://localhost:4321

---

## 1. Rehearsal — no Instagram post (do this first)

### Tool
1. `idea: ollama — run open models locally with one command`
2. Check the reply: header says **`[tool] https://ollama.com`**, script **starts with "so"**,
   last line is **`comment TOOL if you want access`**.
3. Record a short clip reading it, send it. Wait for the render.
4. Check the caption under the video: **line one is the comment-TOOL CTA**, then the hook,
   then 5 hashtags.
5. Send **`/dryrun`**. You should get: type `tool`, the tool url, a site link.
6. Refresh the site — a new block at the top titled **Ollama**, accent domain + ↗. Tap it →
   lands on ollama.com (on localhost it goes straight there; once the site's public it goes
   through `/go/…` and the click counts).

### News
1. `idea: <a real AI story from this week>` — e.g. a model release you actually saw.
2. Header says **`[news]`**, script starts with "so", **no CTA** at the end.
3. Clip → render. Caption has **no** CTA.
4. **`/dryrun`** — takes a minute or two longer (it writes the article). The article is
   echoed back to you in the chat. Read it: 350–500 words, no headings or bullets, doesn't
   start with "so", no invented numbers.
5. Refresh the site — a block with `Read · N min` + chevron. Tap it → `/p/test-…` article page.

### Also try
- `idea: some tool that doesn't exist` → it should say **"couldn't verify this"** and ask,
  instead of writing a script.
- While a script is up, ask it a fact question: *"is it actually free?"* → it should look it
  up rather than guess.

Clean up: **`/cleantest`** deletes every rehearsal row.

---

## 2. Real run — publishes to Instagram

Same flow, but tap **Post** instead of `/dryrun`.

1. The status message walks: uploading → processing → **Posted: <permalink>** → *adding it
   to the site* → **On the site: <url>**. If the site step fails it says so separately —
   the reel is still live.
2. Refresh the site — the post is there, no `test-` slug.

### The DM funnel (tool posts only)
You need a **second Instagram account** — Meta won't let you DM yourself, and the bot
ignores comments from your own account.

1. From the second account, comment **`TOOL`** on the tool reel.
2. Within ~2 minutes (the poll interval) that account gets a DM.
   - `DM_FOLLOW_GATE=strict` (default): *"…follow me and reply anything here and i'll send
     you the link."* It lands in **Message Requests** if the account doesn't follow you.
3. **Without following**, reply anything → you get the nudge: *"looks like you're not
   following yet…"*
4. **Follow**, reply again → the link arrives.
5. `/dm` in Telegram — counts should read 1 first DM · 1 link · 1 nudge.

To test the one-step version: set `DM_FOLLOW_GATE=off` in `.env`, restart, comment `TOOL`
from the second account on a **different** reel (Meta allows one private reply per comment,
ever) → the link comes in the first DM.

---

## If something breaks

| symptom | where to look |
|---|---|
| `Post failed: Error validating access token` | token expired → BUILD.md, regenerate |
| posted, but *site: couldn't add it* | `SUPABASE_URL` / `SUPABASE_SERVICE_KEY` in `.env`; the error text says which |
| `/dm` shows FAILED | token scopes — needs `instagram_business_manage_comments` + `_messages` |
| comment TOOL, no DM after 5 min | `/dm` last error; bot logs `dm#1 failed for comment …`; comment must be on a post the bot published (it only watches rows in `reel_posts`) |
| DM #1 arrives, reply, nothing | bot logs `dm: follow check` — consent can take a tick; wait one more poll |
