import { config } from "../config.js";

// PROBE — does comment→DM actually work on this account, without Meta App Review?
//
// Everything below is documented by Meta as Standard Access for accounts you own, so in
// theory none of it needs review. But Meta's docs contradict themselves in places (the
// "app must be set to Live" bullet vs Business-type apps having no mode toggle), and the
// consent mechanism is reported flakier than documented. So: test it, don't trust it.
//
// Run on the RUNNER (that's where the real .env lives):
//   npx tsx src/jobs/probe-ig-dm.ts                 read-only. token, scopes, recent comments
//   npx tsx src/jobs/probe-ig-dm.ts --send <cid>    ACTUALLY DMs that commenter. see warning
//   npx tsx src/jobs/probe-ig-dm.ts --profile <id>  follow-status read for an IGSID
//
// Suggested run order: comment on your own latest reel from a second account, run the
// read-only probe to get that comment's id, then --send against it.

const base = config.ig.base;
const token = config.ig.token;

type Res = { ok: boolean; status: number; body: any };

async function call(path: string, params: Record<string, string> = {}, post?: unknown): Promise<Res> {
  const u = new URL(`${base}/${path}`);
  for (const [k, v] of Object.entries({ ...params, access_token: token })) u.searchParams.set(k, v);
  const r = await fetch(u, post
    ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(post) }
    : { method: "GET" });
  let body: any;
  try { body = await r.json(); } catch { body = await r.text(); }
  return { ok: r.ok, status: r.status, body };
}

const show = (label: string, r: Res) =>
  console.log(`${r.ok ? "PASS" : "FAIL"}  ${label}${r.ok ? "" : `  [${r.status}] ${JSON.stringify(r.body)}`}`);

async function readOnly() {
  console.log("\n--- read-only checks -------------------------------------------------\n");

  const me = await call("me", { fields: "id,username,account_type" });
  show("token valid / account reachable", me);
  if (!me.ok) return console.log("\nstop: fix the token first (npm run refresh-ig-token).\n");
  console.log(`      @${me.body.username}  id=${me.body.id}  type=${me.body.account_type ?? "?"}`);

  // comment READ is the piece that lets us skip the `comments` webhook (which WOULD need
  // Advanced Access). If this passes, polling for comments is viable.
  const media = await call("me/media", { fields: "id,caption,permalink,timestamp", limit: "5" });
  show("list own media", media);
  if (!media.ok) return;

  let found = 0;
  for (const m of (media.body.data ?? []).slice(0, 5)) {
    const c = await call(`${m.id}/comments`, { fields: "id,text,timestamp,username,from" });
    if (!c.ok) { show(`read comments on ${m.id}`, c); continue; }
    for (const cm of c.body.data ?? []) {
      found++;
      console.log(`      comment_id=${cm.id}  @${cm.username ?? cm.from?.username ?? "?"}  "${String(cm.text).slice(0, 60)}"`);
    }
  }
  console.log(found
    ? `\nPASS  comment polling works — ${found} comment(s) readable. This is the path that avoids App Review.`
    : `\n----  no comments found on your last 5 posts. Comment on one from another account, then re-run.`);

  console.log(`\nnext: npx tsx src/jobs/probe-ig-dm.ts --send <comment_id>\n`);
}

async function sendPrivateReply(commentId: string) {
  console.log("\n--- private reply ----------------------------------------------------\n");
  console.log(`  This sends a REAL DM to whoever left comment ${commentId}.`);
  console.log(`  Meta allows exactly ONE private reply per comment, ever — no retries.`);
  console.log(`  Use a comment from your own test account.\n`);

  const r = await call("me/messages", {}, {
    recipient: { comment_id: commentId },
    message: { text: "hey — testing my automation, ignore this one 🙏" },
  });
  show("send private reply to commenter", r);

  if (r.ok) {
    console.log(`      recipient_id (IGSID) = ${r.body.recipient_id ?? "(not returned)"}`);
    console.log(`\n  This is the whole ballgame: DM #1 works with no App Review.`);
    console.log(`  Now reply to that DM from the test account, then run:`);
    console.log(`    npx tsx src/jobs/probe-ig-dm.ts --profile ${r.body.recipient_id ?? "<igsid>"}\n`);
  } else {
    console.log(`\n  Log the full error above. Known cases: comment older than 7 days,`);
    console.log(`  already private-replied, or the messaging scope isn't on the token.\n`);
  }
}

async function profile(igsid: string) {
  console.log("\n--- follow-status read -----------------------------------------------\n");

  // The gate. Only readable once that user has MESSAGED us — commenting alone doesn't
  // grant consent. If this fails with "User consent is required", they haven't replied yet.
  const r = await call(igsid, { fields: "name,username,is_user_follow_business,is_business_follow_user" });
  show("read is_user_follow_business", r);
  if (r.ok) {
    console.log(`      @${r.body.username}  follows_you=${r.body.is_user_follow_business}`);
    console.log(`\n  Follow gate is live. The full flow is buildable.\n`);
  } else {
    console.log(`\n  If this says "User consent is required to access user profile", that's`);
    console.log(`  expected until they reply to DM #1 — it is not a permissions problem.\n`);
  }

  const conv = await call("me/conversations", { user_id: igsid, platform: "instagram" });
  show("poll conversation for their reply (webhook fallback)", conv);
}

const [flag, arg] = process.argv.slice(2);
if (!token) console.log("IG_ACCESS_TOKEN not set — run this on the runner, where .env lives.");
else if (flag === "--send" && arg) await sendPrivateReply(arg);
else if (flag === "--profile" && arg) await profile(arg);
else await readOnly();
