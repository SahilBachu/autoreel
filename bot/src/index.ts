import { Bot, GrammyError, InlineKeyboard, InputFile } from "grammy";
import { readFileSync, writeFileSync } from "node:fs";
import { mkdir, readdir, readFile, unlink, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { homedir } from "node:os";
import { config, REPO_ROOT } from "./config.js";
import { state } from "./state.js";
import { generateIdea, reviseScript, type Idea } from "./jobs/idea.js";
import { buildDigest, digestKeyboard, formatDigest, foundContext, loadDigest, markPicked, type Card, type Found } from "./jobs/discover.js";
import { makeCarousel } from "./lib/carousel.js";
import { renderReel } from "./jobs/render.js";
import { postCarousel, postReel } from "./jobs/post.js";
import { dmStatus, startDmLoop } from "./jobs/dm.js";
import { setStyleMode, styleStatus } from "./lib/style.js";
import { chunkForTelegram, runAnalytics } from "./jobs/analytics.js";
import { applyProposal, findByMessage, loadProposals, reviseProposal, sendProposal, updateProposal } from "./lib/proposals.js";
import { genPostCaption } from "./lib/caption.js";
import { drainSiteQueue, pendingSiteJobs, publishWithRetry, startSiteQueue } from "./jobs/site-queue.js";
import { claude, ClaudeAuthError } from "./lib/claude.js";
import type { Pending } from "./state.js";
import {
  learnFromIdea,
  learnFromRevision,
  learnFromEdit,
  learnFromRedo,
  learnFromPost,
  distill,
  prefsSummary,
  forgetPrefs,
} from "./lib/learn.js";

// self-hosted Bot API server = big-file support
const bot = new Bot(config.telegram.token, {
  client: { apiRoot: config.telegram.apiRoot },
});

// Never handle the same Telegram update twice. Telegram re-delivers an update until a later
// getUpdates confirms it, so a crash between handling and confirming replayed it on the next
// start — that's how he got the same reply twice. The last few hundred ids are kept on disk.
const SEEN_FILE = resolve(REPO_ROOT, "bot/data/seen-updates.json");
let seenUpdates: number[] = [];
try {
  seenUpdates = JSON.parse(readFileSync(SEEN_FILE, "utf8"));
} catch {
  /* first run */
}
bot.use(async (ctx, next) => {
  const id = ctx.update.update_id;
  if (seenUpdates.includes(id)) return console.log(`skipping update ${id}: already handled`);
  seenUpdates = [...seenUpdates.slice(-400), id];
  try {
    writeFileSync(SEEN_FILE, JSON.stringify(seenUpdates));
  } catch {
    /* data dir missing — dedupe stays in memory */
  }
  await next();
});

// The local Bot API server runs in Docker and writes received files under its container
// path (/var/lib/telegram-bot-api/...). We bind-mount that dir to a host folder so the
// renderer can read the clip. Translate the container prefix -> host prefix here.
const TG_CONTAINER_ROOT = process.env.TG_FILES_CONTAINER_ROOT || "/var/lib/telegram-bot-api";
const TG_HOST_ROOT = process.env.TG_FILES_HOST_ROOT || resolve(homedir(), "tg-files");
function toHostPath(filePath: string): string {
  if (filePath.startsWith(TG_CONTAINER_ROOT)) {
    return resolve(TG_HOST_ROOT, filePath.slice(TG_CONTAINER_ROOT.length).replace(/^[/\\]+/, ""));
  }
  return filePath; // already a host/relative path (e.g. non-local Bot API)
}

// only talk to the owner
bot.use(async (ctx, next) => {
  if (String(ctx.chat?.id) === config.telegram.chatId) return next();
});

const approveKeyboard = new InlineKeyboard()
  .text("Post", "post")
  .text("Redo", "redo")
  .text("Edit", "edit");

// Telegram's Markdown parser throws "can't parse entities" on any unmatched */_/`/[ in the
// text — and a script or topic (model output, or pasted by hand) almost always has one. That
// throw used to go uncaught in several handlers, so the reply (and the script it carried)
// just vanished with no error shown to the user. Never let formatting eat content.
async function safeReply(ctx: any, text: string, opts: any = {}) {
  try {
    return await ctx.reply(text, opts);
  } catch (e) {
    console.error("reply failed with parse_mode, retrying plain:", (e as Error).message);
    return ctx.reply(text);
  }
}

async function makeAndSendReel(ctx: any, chat: string, editNote?: string) {
  const p = state.get(chat);
  if (!p?.clipPath || !p.script) return ctx.reply("Send me a clip first (with a script).");
  await ctx.reply("rendering — this takes a bit.");
  try {
    // a Redo passes no editNote but must keep honoring the last [Edit] instruction
    const note = editNote ?? p.lastEditNote;
    const { mp4, planSummary, style, thumb } = await renderReel({ clipPath: p.clipPath, script: p.script, topic: p.topic, editNote: note });
    const caption = await genPostCaption(p.topic, p.script, p.postType); // tool posts lead with the comment CTA
    state.patch(chat, { mp4Path: mp4, thumbPath: thumb, caption, awaitingEdit: false, lastEditNote: note, lastPlan: planSummary });
    if (thumb) await ctx.replyWithPhoto(new InputFile(thumb), { caption: "cover" }).catch(() => {});
    // show the generated IG caption under the reel; [Post] will publish with it.
    // width/height/supports_streaming are REQUIRED with the self-hosted local Bot API server:
    // without them Telegram picks a wrong-aspect player box and displays the reel stretched.
    await ctx.replyWithVideo(new InputFile(mp4), {
      caption: `[${style} style]\n\ncaption:\n${caption}`,
      reply_markup: approveKeyboard,
      width: 1080,
      height: 1920,
      supports_streaming: true,
    });
  } catch (e: any) {
    await ctx.reply(`render not ready: ${e.message}`);
  }
}

const HELP = [
  "*commands*",
  "/idea — one researched idea (tool or news) + script",
  "`idea: <your idea>` — researches your idea, then writes a NEW script for it (asks first if it can't verify it)",
  "`news: <story>` / `tool: <tool>` — same, but forces the post type",
  "`script: <your script>` — use a script you already wrote, word for word, no rewrite",
  "/discover — research what AI world is talking about right now (3 cards + scripts)",
  "1 / 2 / 3 — pick from the morning digest (\"2 but shorter\" works too)",
  "`tomorrow: <idea>` — push onto the idea stack (newest first)",
  "any text — revises the current script (or the video, after Edit)",
  "send a video — confirms the script and renders the reel",
  "Post / Redo / Edit — buttons under every render",
  "/prefs — what it has learned about your taste",
  "/learn — run a learning pass now",
  "/forget — reset learned preferences",
  "/dm — comment→DM autoresponder status",
  "/stats — your Instagram numbers + what to do next (also every morning)",
  "/style — which renderer videos use (alternating by default; `/style v2` pins it)",
  "/retrysite — force the site retry now (it already retries on its own)",
  "/help — this list",
].join("\n");

bot.command(["start", "help"], (ctx) => safeReply(ctx, HELP, { parse_mode: "Markdown" }));

// what the system has learned about the creator's taste
bot.command("prefs", (ctx) => safeReply(ctx, prefsSummary(), { parse_mode: "Markdown" }));

// force a learning pass right now (normally happens automatically on posts/edits)
bot.command("learn", async (ctx) => {
  await ctx.reply("studying your recent edits and posts…");
  await distill();
  await safeReply(ctx, prefsSummary(), { parse_mode: "Markdown" });
});

// wipe the learned profile (keeps approved-script examples)
bot.command("forget", (ctx) => {
  forgetPrefs();
  ctx.reply("cleared the learned preferences. I'll relearn as you use it.");
});

// how the comment -> DM funnel is doing (and whether the token can even run it)
bot.command("dm", (ctx) => ctx.reply(dmStatus()));

// the analyst, on demand (it also runs every morning before the digest)
bot.command("stats", async (ctx) => {
  await ctx.reply("pulling your Instagram numbers and writing the report — takes a couple of minutes…");
  try {
    const { report, proposals } = await runAnalytics();
    for (const part of chunkForTelegram(report)) await ctx.reply(part);
    for (const p of proposals) await sendProposal(p).catch(() => {});
  } catch (e: any) {
    await ctx.reply(`couldn't build the report: ${String(e?.message ?? e).slice(0, 300)}`);
  }
});

// a proposal from the analyst: Approve applies it, Deny records it (never re-proposed)
bot.callbackQuery(/^prop:([ad]):(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const [, act, id] = ctx.match as RegExpMatchArray;
  const p = loadProposals().find((x) => x.id === id);
  if (!p || p.status !== "open") return ctx.reply(p ? `that one is already ${p.status}.` : "can't find that proposal.");
  const msgId = ctx.callbackQuery.message?.message_id;
  const strip = () => msgId && ctx.api.editMessageReplyMarkup(ctx.chat!.id, msgId, { reply_markup: { inline_keyboard: [] } }).catch(() => {});
  if (act === "d") {
    updateProposal(id, { status: "denied", decidedAt: new Date().toISOString() });
    await strip();
    return ctx.reply(`denied: ${p.title}. won't suggest it again.`);
  }
  await strip();
  await ctx.reply(`applying: ${p.title}…`);
  try {
    const result = await applyProposal(p);
    updateProposal(id, { status: "approved", decidedAt: new Date().toISOString(), result });
    await ctx.reply(`done. ${result}`);
  } catch (e: any) {
    updateProposal(id, { status: "failed", result: String(e?.message ?? e) });
    await ctx.reply(`couldn't apply it: ${String(e?.message ?? e).slice(0, 200)}`);
  }
});

// which renderer videos use — world by default, switch or alternate
bot.command("style", (ctx) => {
  const arg = ctx.match?.toString().trim().toLowerCase();
  if (arg && ["v2", "world", "alternate"].includes(arg)) {
    setStyleMode(arg as "v2" | "world" | "alternate");
    return ctx.reply(`${arg === "alternate" ? "alternating between both styles again" : `pinned to ${arg}`}.

${styleStatus()}`);
  }
  if (arg) return ctx.reply(`unknown style "${arg}".

${styleStatus()}`);
  return ctx.reply(styleStatus());
});

// After a post: "post another?" with the morning's other cards. No answer needed. A number picks
// one (the normal digest pick); a plain "yes" gets the list again with "which one?".
let anotherOffer: { at: number; lines: string[] } | null = null;
async function offerAnother(chat: string, postedTopic: string) {
  const digest = await loadDigest(24);
  const rest = (digest?.cards ?? []).filter((c) => c.topic !== postedTopic);
  if (!rest.length) return;
  const lines = rest.map((c) => `${c.n}) [${c.type ?? "news"}] ${c.topic}`);
  anotherOffer = { at: Date.now(), lines };
  // a button per card (the script), and for news cards a second one: as a Dispatch carousel
  const kb = new InlineKeyboard();
  for (const c of rest) {
    kb.text(`#${c.n}`, `pick:${c.n}`);
    if (c.type === "news" && !c.unverified) kb.text(`#${c.n} as a carousel`, `car:yes:${c.n}`);
    kb.row();
  }
  await bot.api.sendMessage(chat, `post another? no need to answer. tap a card for its script, or turn a news one into a carousel:\n\n${lines.join("\n")}`, { reply_markup: kb });
}

// ── The Dispatch: news cards as carousels ──────────────────────────────────────────
// The digest's [1] [2] [3] [skip] buttons. A number = the normal pick. Skip = "post the news card
// as a carousel instead?" (unless that story already went out as a reel).
bot.callbackQuery(/^pick:([1-3])$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageReplyMarkup({ reply_markup: { inline_keyboard: [] } }).catch(() => {});
  const chat = String(ctx.chat!.id);
  if (!(await pickCard(ctx, chat, Number(ctx.match[1])))) await ctx.reply("that card isn't in today's digest anymore.");
});

bot.callbackQuery("pick:skip", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageReplyMarkup({ reply_markup: { inline_keyboard: [] } }).catch(() => {});
  const d = await loadDigest(24);
  let postedTopic = "";
  try {
    const last: LastPost = JSON.parse(await readFile(LAST_POST, "utf8"));
    if (Date.now() - new Date(last.at).getTime() < 24 * 3600_000) postedTopic = last.p.topic;
  } catch {
    /* nothing posted yet */
  }
  const news = (d?.cards ?? []).filter((c) => c.type === "news" && !c.unverified && c.topic !== postedTopic);
  if (!news.length) return ctx.reply("skipped. (no news card left to turn into a carousel today)");
  const kb = new InlineKeyboard();
  for (const c of news) kb.text(news.length === 1 ? "yes, make it" : `#${c.n}`, `car:yes:${c.n}`);
  kb.text("no", "car:no");
  await ctx.reply(
    news.length === 1 ? `skipped. want to post the news one as a carousel instead?

#${news[0].n}: ${news[0].topic}` : `skipped. post one of the news cards as a carousel instead?

${news.map((c) => `#${c.n}: ${c.topic}`).join("\n")}`,
    { reply_markup: kb },
  );
});

bot.callbackQuery(/^car:yes:(\d)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageReplyMarkup({ reply_markup: { inline_keyboard: [] } }).catch(() => {});
  const chat = String(ctx.chat!.id);
  const card = (await loadDigest(36))?.cards.find((c) => c.n === Number(ctx.match[1]));
  if (!card) return ctx.reply("couldn't find that card anymore.");
  markPicked(card.topic).catch(() => {});
  await makeAndSendCarousel(ctx, chat, card);
});

bot.callbackQuery("car:no", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageReplyMarkup({ reply_markup: { inline_keyboard: [] } }).catch(() => {});
  await ctx.reply("ok, nothing today.");
});

/** write + render the carousel (or rework it: `note` = an [Edit]; a second call = a [Redo]) and preview it */
async function makeAndSendCarousel(ctx: any, chat: string, card: Card, note?: string) {
  const p = state.get(chat);
  const prev = p?.kind === "carousel" && p.carousel && p.carousel.card.topic === card.topic ? (p.carousel as any) : undefined;
  await ctx.reply(note ? "reworking the carousel…" : prev ? "writing a fresh version…" : "making the carousel. takes a few minutes.");
  try {
    const c = await makeCarousel(card, { note, prev });
    const caption = await genPostCaption(card.topic, c.text, "news"); // opens with "comment NEWS…"
    state.set(chat, { topic: card.topic, script: c.text, postType: "news", context: foundContext(card), kind: "carousel", carousel: { ...c, card }, caption, stage: "reel" });
    await ctx.replyWithMediaGroup(c.slides.slice(0, 10).map((s) => ({ type: "photo" as const, media: new InputFile(s) })));
    await ctx.reply(`The Dispatch № ${c.issue} · ${c.slides.length} slides\n\ncaption:\n${caption}`, { reply_markup: approveKeyboard });
  } catch (e: any) {
    await ctx.reply(`couldn't make the carousel: ${String(e?.message ?? e).slice(0, 300)}`);
  }
}

// [Post] for a carousel: upload the slides, publish, story the cover, site row + article
async function postCarouselPending(chat: string) {
  const p = state.get(chat);
  if (!p?.carousel) return bot.api.sendMessage(chat, "Nothing to post yet.");
  if (p.posting) return bot.api.sendMessage(chat, "already posting that one — hang tight.");
  state.patch(chat, { posting: true });
  const msg = await bot.api.sendMessage(chat, "*Posting…*\nuploading the slides", { parse_mode: "Markdown" });
  const set = (t: string) => bot.api.editMessageText(chat, msg.message_id, t, { parse_mode: "Markdown" }).catch(() => {});
  try {
    const { permalink, mediaId, story } = await postCarousel(p.carousel.slides, p.caption ?? p.topic, {
      onUploaded: () => set("*Posting…*\nslides uploaded, sending to Instagram"),
      onProcessing: () => set("*Posting…*\nInstagram is processing the slides…"),
      onPublishing: () => set("*Posting…*\npublishing…"),
    });
    await set(`*Posted:*\n${permalink}${story ? "\n(+ story)" : ""}\n\nadding it to the site, writing the article…`);
    await rememberPost({ p, mediaId, permalink, at: new Date().toISOString() });
    state.clear(chat);
    const r = await publishWithRetry(p, mediaId, permalink, (note) => set(`*Posted:*\n${permalink}\n\n_${note}_`));
    if (r.url) await set(`*Posted:*\n${permalink}${story ? "\n(+ story)" : ""}\n\n*On the site:*\n${r.url}`);
    else await set(`*Posted:*\n${permalink}\n\n_site: ${String(r.error).slice(0, 160)}${r.queued ? " (retrying in the background)" : ""}_`);
    await bot.api.sendMessage(chat, `share it to your story: open the post → ✈︎ → Add to story\n${permalink}`).catch(() => {});
  } catch (e: any) {
    state.patch(chat, { posting: false });
    await set(`*Post failed:* ${e.message}\nTap Post again to retry, or Redo.`);
  }
}

// the reel published but the site row didn't — rewrite the copy and insert it
bot.command("retrysite", (ctx) => retrySite(ctx));

async function retrySite(ctx: any) {
  const queued = pendingSiteJobs();
  if (queued.length) {
    await ctx.reply(`retrying ${queued.length} queued post${queued.length === 1 ? "" : "s"} now…`);
    await drainSiteQueue(true);
    const left = pendingSiteJobs();
    return ctx.reply(left.length ? `${left.length} still failing — last error: ${left[0].lastError?.slice(0, 200)}` : "all caught up.");
  }
  let last: LastPost;
  try {
    last = JSON.parse(await readFile(LAST_POST, "utf8"));
  } catch {
    return ctx.reply("nothing to retry — nothing queued and no recent post on file.");
  }
  await ctx.reply(`nothing queued. retrying the last post, "${last.p.topic}"${last.p.postType === "news" ? " — writing the article" : ""}…`);
  const r = await publishWithRetry(last.p, last.mediaId, last.permalink);
  await ctx.reply(r.url ? `on the site: ${r.url}` : `still failing: ${String(r.error).slice(0, 200)}`);
}

// on-demand discovery (same machinery as the 3am digest)
bot.command("discover", async (ctx) => {
  await ctx.reply("researching what the AI world is talking about — takes a few minutes…");
  try {
    const digest = await buildDigest(3);
    await ctx.reply(formatDigest(digest), { reply_markup: digestKeyboard(digest) });
  } catch (e: any) {
    await ctx.reply(`discovery failed: ${e.message}`);
  }
});

// Activate card n of the newest digest (with an optional change), replacing whatever script was
// open. Shared by the chat ("2 but shorter") and the trigger inbox ("pick 2 but shorter").
async function pickCard(ctx: any, chat: string, n: number, change?: string): Promise<boolean> {
  const digest = await loadDigest();
  const card = digest?.cards.find((c) => c.n === n);
  if (!card) return false;
  anotherOffer = null;
  markPicked(card.topic).catch(() => {}); // future research treats this story as done
  try {
    // an unverified queued topic has no script — picking it = "write it from my description anyway"
    let idea: Idea = card;
    if (card.unverified) {
      await ctx.reply("writing it from your description alone (nothing invented)…");
      idea = await generateIdea(card.topic, { fromDescriptionOnly: true });
    }
    if (change) {
      await ctx.reply(`picked #${n} — reworking it…`);
      const r = await reviseScript(idea.topic, idea.script, change, idea.sessionId);
      idea = { ...idea, script: r.script, sessionId: r.sessionId ?? idea.sessionId };
    }
    await activateIdea(ctx, chat, idea);
  } catch (e: any) {
    await ctx.reply(`couldn't pull that one up: ${e.message}`);
  }
  return true;
}

// a fresh script landed (idea / idea: / digest pick / "anyway") -> activate it + show it
async function activateIdea(ctx: any, chat: string, idea: Idea) {
  // a digest Card carries whyNow/links rather than a pre-built context string — same thing
  const context = idea.context ?? ("whyNow" in idea ? foundContext(idea as unknown as Found) : undefined);
  state.set(chat, {
    topic: idea.topic,
    script: idea.script,
    stage: "script",
    startedAt: Date.now(),
    scriptSessionId: idea.sessionId,
    postType: idea.type,
    toolUrl: idea.toolUrl,
    context,
  });
  learnFromIdea(idea.topic);
  const src = (idea as { source?: string }).source;
  const head = (idea.type === "tool" ? `*${idea.topic}*\n[tool] ${idea.toolUrl ?? "(no url)"}` : `*${idea.topic}*\n[news]`) + (src ? `\nseen: ${src}` : "");
  await safeReply(ctx, `${head}\n\n${idea.script}\n\nsend the clip when it's right — or just tell me what to change.`, {
    parse_mode: "Markdown",
  });
}

// research found nothing for what the user described: say so and ASK, don't make it up
async function askUnverified(ctx: any, chat: string, desc: string, note?: string) {
  state.set(chat, { topic: desc, script: "", stage: "script", unverifiedIdea: desc });
  await ctx.reply(
    `couldn't verify this — no sources found${note ? ` (${note})` : ""}.\nreply "anyway" and I'll write it from your description alone (nothing invented), or send a clearer idea:`,
  );
}

// random idea — one real, researched card (same machinery as the morning digest)
bot.command("idea", async (ctx) => {
  await ctx.reply("researching something…");
  try {
    await activateIdea(ctx, String(ctx.chat.id), await generateIdea());
  } catch (e: any) {
    await ctx.reply(`couldn't come up with one: ${e.message}`);
  }
});

// described idea:  "idea: claude code now runs in the browser" — the description is
// RESEARCHED first (is it real, what is it, the URL), then Claude WRITES a script for it. If
// nothing solid turns up it asks before writing. If you already have a finished script, use
// "script: <text>" instead — this command asks Claude to write something new "about" it.
bot.hears(/^idea:\s*(.+)/is, (ctx) => runIdea(ctx, String(ctx.chat.id), ctx.match[1]));
// same, but you decide the post type instead of the researcher
bot.hears(/^news:\s*(.+)/is, (ctx) => runIdea(ctx, String(ctx.chat.id), ctx.match[1], "news"));
bot.hears(/^tool:\s*(.+)/is, (ctx) => runIdea(ctx, String(ctx.chat.id), ctx.match[1], "tool"));

async function runIdea(ctx: any, chat: string, desc: string, forceType?: "tool" | "news") {
  await ctx.reply(`checking that out, then writing${forceType ? ` a ${forceType} post` : ""}…`);
  try {
    const idea = await generateIdea(desc, { forceType });
    if (idea.unverified) return askUnverified(ctx, chat, desc, idea.note);
    await activateIdea(ctx, chat, idea);
  } catch (e: any) {
    await ctx.reply(`couldn't write that: ${e.message}`);
  }
}

// a script you ALREADY WROTE — used word for word, no rewrite, straight to the clip stage.
// "idea:" instead asks Claude to write a new script "about" whatever follows it, which is
// the wrong tool for handing over a finished script.
bot.hears(/^script:\s*([\s\S]+)/i, async (ctx) => {
  const chat = String(ctx.chat.id);
  const script = ctx.match[1].trim();
  const topic = script.split("\n")[0].slice(0, 60).replace(/[*_`[\]]/g, "").trim() || "untitled";
  state.set(chat, { topic, script, stage: "script" });
  learnFromIdea(topic);
  await safeReply(ctx, `locked it in as-is:\n\n${script}\n\nsend the clip when it's ready — or tell me what to change.`);
});

// push onto the idea STACK — topics.md, newest at the top; discovery/idea pulls from the top
bot.hears(/^tomorrow:\s*(.+)/is, async (ctx) => {
  const file = resolve(REPO_ROOT, "topics.md");
  const existing = await readFile(file, "utf8").catch(() => "");
  await writeFile(file, `- ${ctx.match[1].trim()}\n${existing}`);
  await ctx.reply("pushed onto the idea stack.");
});

// the clip arrives -> render
bot.on(["message:video", "message:document"], async (ctx) => {
  const chat = String(ctx.chat.id);
  const file = await ctx.getFile(); // on the local Bot API server, file_path is a disk path
  const clipPath = toHostPath(file.file_path!); // container path -> host-mounted path
  const prev = state.get(chat) ?? { topic: "untitled", script: "" };
  // the clip confirms the script -> lock the script stage, render.
  state.set(chat, { ...prev, clipPath, stage: "reel", awaitingEdit: false });
  await makeAndSendReel(ctx, chat);
});

// approve / redo / edit
bot.callbackQuery("post", async (ctx) => {
  await ctx.answerCallbackQuery();
  await postPending(String(ctx.chat!.id));
});

// The whole publish, shared by the [Post] button and the trigger inbox ("post"), so both go
// through the same guards: nothing rendered -> say so; a publish already in flight -> refuse
// a double post.
async function postPending(chat: string) {
  const p = state.get(chat);
  if (p?.kind === "carousel") return postCarouselPending(chat);
  if (!p?.mp4Path) return bot.api.sendMessage(chat, "Nothing to post yet — send a clip first.");
  if (p.posting) return bot.api.sendMessage(chat, "already posting that one — hang tight.");
  state.patch(chat, { posting: true });

  // one status message, edited in place so the user always knows where it's at
  const msg = await bot.api.sendMessage(chat, "*Posting…*\nuploading video to storage", { parse_mode: "Markdown" });
  const set = (t: string) => bot.api.editMessageText(chat, msg.message_id, t, { parse_mode: "Markdown" }).catch(() => {});

  try {
    const { permalink, mediaId, story } = await postReel(p.mp4Path, p.caption ?? p.script.split("\n")[0], {
      onUploaded: () => set("*Posting…*\nuploaded — sending to Instagram"),
      onProcessing: () => set("*Posting…*\nuploaded, sent — Instagram is processing the reel (transcoding)…"),
      onPublishing: () => set("*Posting…*\nuploaded, sent, processed — publishing…"),
    }, p.thumbPath, { aiGenerated: p.aiGenerated });
    await set(`*Posted:*\n${permalink}\n\nadding it to the site${p.postType === "news" ? " — writing the article" : ""}…`);
    await rememberPost({ p, mediaId, permalink, at: new Date().toISOString() }); // so /retrysite has something to work from
    learnFromPost(p.topic, p.script).catch(() => {}); // approved = strongest signal; learn in bg
    state.clear(chat); // the reel is done regardless of what the site does next

    // the site row — a failure here must never read as a failed post, and it retries itself
    const r = await publishWithRetry(p, mediaId, permalink, (note) => set(`*Posted:*\n${permalink}\n\n_${note}_`));
    if (r.url) await set(`*Posted:*\n${permalink}${story ? "\n(+ story)" : ""}\n\n*On the site:*\n${r.url}`);
    else if (r.queued)
      await set(`*Posted:*\n${permalink}\n\n_site: couldn't add it yet (${String(r.error).slice(0, 120)}). I'll keep retrying in the background and tell you when it lands._`);
    else await set(`*Posted:*\n${permalink}\n\n_site: ${String(r.error).slice(0, 160)} — retrying won't fix that one. /retrysite once it's sorted._`);
    await bot.api.sendMessage(chat, `share it to your story: open the post → ✈︎ → Add to story\n${permalink}`).catch(() => {});
    await offerAnother(chat, p.topic).catch(() => {});
  } catch (e: any) {
    state.patch(chat, { posting: false });
    await set(`*Post failed:* ${e.message}\nTap Post again to retry, or Redo.`);
  }
}

// [Post] clears the chat state, so a site-step failure used to strand the reel: published on
// Instagram, missing from the site, with nothing left to retry from. Keep just enough on disk
// for /retrysite (the automatic retries use their own queue — see jobs/site-queue.ts).
const LAST_POST = resolve(REPO_ROOT, "bot/data/last-post.json");
type LastPost = { p: Pending; mediaId: string; permalink: string; at: string };
async function rememberPost(l: LastPost) {
  try {
    await mkdir(resolve(REPO_ROOT, "bot/data"), { recursive: true });
    await writeFile(LAST_POST, JSON.stringify(l));
  } catch (e) {
    console.error("couldn't remember the last post:", e);
  }
}

bot.callbackQuery("redo", async (ctx) => {
  await ctx.answerCallbackQuery();
  const chat = String(ctx.chat!.id);
  const p = state.get(chat);
  if (p?.kind === "carousel" && p.carousel) return makeAndSendCarousel(ctx, chat, p.carousel.card as Card);
  if (p?.kind === "explainer") return ctx.reply("explainers are built overnight, so there's no instant redo yet. tell me what's wrong with it and I'll fix it, or skip it and tomorrow's will be fresh.");
  learnFromRedo(p?.topic ?? "", p?.lastPlan); // they rejected that take — log WHICH plan
  await makeAndSendReel(ctx, chat); // re-renders with the last edit note still applied
});

bot.callbackQuery("edit", async (ctx) => {
  await ctx.answerCallbackQuery();
  if (state.get(String(ctx.chat!.id))?.kind === "explainer") return ctx.reply("explainers are built overnight, so edits aren't instant yet. tell me what to change and I'll redo it by hand.");
  state.patch(String(ctx.chat!.id), { awaitingEdit: true });
  await ctx.reply("what should I change? (e.g. 'punchier hook', 'swap the title font')");
});

// free text = either a post-render reel edit ([Edit] tapped), or — while we're still on
// the script — a change request that revises the script in place. Keep going until a clip.
bot.on("message:text", async (ctx) => {
  const chat = String(ctx.chat.id);

  // a reply to a proposal message = adjust that proposal, then decide again
  const repliedTo = ctx.message.reply_to_message?.message_id;
  const prop = repliedTo ? findByMessage(repliedTo) : undefined;
  if (prop && prop.status === "open") {
    await ctx.reply("adjusting it…");
    try {
      const next = await reviseProposal(prop, ctx.message.text);
      updateProposal(prop.id, { status: "revised", decidedAt: new Date().toISOString() });
      if (prop.messageId) await ctx.api.editMessageReplyMarkup(chat, prop.messageId, { reply_markup: { inline_keyboard: [] } }).catch(() => {});
      await sendProposal(next);
    } catch (e: any) {
      await ctx.reply(`couldn't adjust it: ${String(e?.message ?? e).slice(0, 200)}`);
    }
    return;
  }

  // "post another?" answered with a yes instead of a number: show the options again
  if (anotherOffer && Date.now() - anotherOffer.at < 18 * 3600_000 && !state.get(chat)?.script &&
      /^\s*(y|ya|yes|yeah|yep|yup|sure|ok|okay|another|go|let'?s go|do it)\b[\s!.]*$/i.test(ctx.message.text)) {
    return ctx.reply(`which one? reply the number:\n\n${anotherOffer.lines.join("\n")}`);
  }

  // digest pick: "1" / "2" / "3", optionally with a change ("2 but shorter", "1 slightly shorter").
  // A number followed by words used to need "but"; "1 slightly shorter" was read as a revision
  // of whatever script was still open, so yesterday's unfinished script got edited instead of
  // today's #1. Now a pick wins whenever the digest is newer than the open script; only while
  // he's working on a script he picked from THIS digest does "2 lines shorter" stay a revision.
  const pick = ctx.message.text.match(/^\s*([1-3])(?![\d%.,]\d)\b[\s.,:)-]*(?:but\s+)?(.*)$/is);
  if (pick) {
    const open = state.get(chat);
    const digest = await loadDigest();
    const digestAt = digest ? new Date(digest.ts).getTime() : 0;
    const openAt = open?.script ? open.startedAt ?? 0 : 0;
    const bare = !pick[2].trim();
    if (digest && (bare || !open?.script || digestAt > openAt)) {
      if (await pickCard(ctx, chat, Number(pick[1]), pick[2].trim() || undefined)) return;
    }
  }

  const p = state.get(chat);
  if (!p) return;

  // "anyway" after a couldn't-verify: write from the description, no research, no invention
  if (p.unverifiedIdea) {
    if (!/^\s*(anyway|yes|yeah|go|write it|do it)\b/i.test(ctx.message.text)) {
      return ctx.reply(`still waiting on that one — reply "anyway" to write it from your description, or send a new idea:`);
    }
    await ctx.reply("writing it from your description alone…");
    try {
      await activateIdea(ctx, chat, await generateIdea(p.unverifiedIdea, { fromDescriptionOnly: true }));
    } catch (e: any) {
      await ctx.reply(`couldn't write that: ${e.message}`);
    }
    return;
  }

  if (p.awaitingEdit && p.kind === "carousel" && p.carousel) {
    await makeAndSendCarousel(ctx, chat, p.carousel.card as Card, ctx.message.text);
    return;
  }
  if (p.awaitingEdit) {
    learnFromEdit(p.topic, ctx.message.text); // how they like the motion graphics
    await makeAndSendReel(ctx, chat, ctx.message.text); // reel-level edit, re-render
    return;
  }

  if (p.stage === "script" && p.script) {
    await ctx.reply("reworking it…");
    try {
      const before = p.script;
      const r = await reviseScript(p.topic, before, ctx.message.text, p.scriptSessionId);
      state.patch(chat, { script: r.script, scriptSessionId: r.sessionId ?? p.scriptSessionId });
      learnFromRevision(p.topic, before, r.script, ctx.message.text); // how they like scripts
      await safeReply(ctx, `*${p.topic}*\n\n${r.script}\n\nsend the clip when it's right — or tell me another change.`, {
        parse_mode: "Markdown",
      });
    } catch (e: any) {
      await ctx.reply(`couldn't revise: ${e.message}`);
    }
    return;
  }
  // otherwise ignore free text
});

bot.catch((err) => console.error("bot error", err));

// Long polling that survives a 409 Conflict ("terminated by other getUpdates request"). grammY
// treats it as fatal and the process died; systemd restarted it 5s later into the same
// conflict, ~18,000 times over 9 days (Oct 2026), and every restart dropped in-flight work: DM
// ticks cut short, replies sent twice. Now: wait out the other poll and carry on in-process.
async function startPolling() {
  // (Oct 2026: the other poller was a duplicate user-level systemd unit starting a second copy of
  // this bot at every boot. If the alert below fires, look for another copy first.)
  let conflicts = 0;
  let startedAt = 0;
  for (;;) {
    try {
      await bot.start({
        onStart: (me) => {
          console.log(`@${me.username} running`);
          startedAt = Date.now();
        },
      });
      return; // bot.stop() was called
    } catch (e) {
      if (!(e instanceof GrammyError) || e.error_code !== 409) throw e;
      if (Date.now() - startedAt > 10 * 60_000) conflicts = 0; // a lone conflict after a long clean run
      conflicts++;
      console.error(`getUpdates 409 conflict #${conflicts}: another poll is open; retrying in 35s`);
      if (conflicts === 20)
        await bot.api.sendMessage(config.telegram.chatId, "⚠️ something else keeps polling this bot's token (Telegram 409 Conflict, 20 times in a row). Replies may be slow until it stops. If it keeps happening, revoke the token in BotFather and put the new one in .env.").catch(() => {});
      await new Promise((r) => setTimeout(r, 35_000));
    }
  }
}
startPolling().catch((e) => {
  console.error("polling stopped:", e);
  process.exit(1);
});
startDmLoop(); // no-op unless DM_AUTORESPONDER=on
startSiteQueue(); // retries any site row that didn't make it, across restarts

// CLAUDE LOGIN WATCH — every writing step runs through the Claude CLI, and its login on the
// runner can expire. The first sign used to be a missing 3am digest. A tiny call every 6h
// catches it during the day instead: one message when it breaks, one when it's back.
let claudeWasOk = true;
async function checkClaudeLogin() {
  try {
    await claude("reply with just: ok", { timeoutMs: 90_000 });
    if (!claudeWasOk) await bot.api.sendMessage(config.telegram.chatId, "Claude is logged back in on the runner. all good.").catch(() => {});
    claudeWasOk = true;
  } catch (e: any) {
    if (!(e instanceof ClaudeAuthError)) return; // a timeout or blip isn't worth a message
    if (claudeWasOk) await bot.api.sendMessage(config.telegram.chatId, `⚠️ ${e.message}\n\nuntil then: no ideas, scripts, captions or renders.`).catch(() => {});
    claudeWasOk = false;
  }
}
setTimeout(checkClaudeLogin, 30_000);
setInterval(checkClaudeLogin, 6 * 3600_000);

// "stage <file.json>": load a finished video (a Pending: mp4Path, caption, topic, …) into the
// chat as if it had just rendered, and show it with [Post] / [Redo] / [Edit]. How faceless
// explainers (made outside the clip flow) reach the normal approve-and-post path.
async function stageFromFile(chat: string, file: string) {
  try {
    const p = JSON.parse(await readFile(file, "utf8")) as Pending;
    if (!p.mp4Path || !p.caption) throw new Error("needs mp4Path and caption");
    const cur = state.get(chat);
    if (cur?.script && !cur.mp4Path) await bot.api.sendMessage(chat, `(your open script "${cur.topic}" was set aside for this one)`);
    state.set(chat, { ...p, stage: "reel", kind: p.kind ?? "reel" });
    await bot.api.sendVideo(chat, new InputFile(p.mp4Path), { caption: `${p.topic}\n\ncaption:\n${p.caption}`.slice(0, 1000), reply_markup: approveKeyboard, width: 1080, height: 1920, supports_streaming: true });
  } catch (e: any) {
    await bot.api.sendMessage(chat, `couldn't stage ${file}: ${String(e?.message ?? e).slice(0, 200)}`);
  }
}

// TRIGGER INBOX — lets something outside the chat (a cron, a script, Claude over SSH) start
// an idea exactly as if sahil had typed it. `npm run trigger -- "idea: ..."` drops a file in
// bot/data/trigger/; the bot picks it up within a few seconds, deletes it, and runs it
// against the owner chat. The idea commands, "retrysite", and "post" — which publishes the
// pending render exactly as tapping [Post] would, same guards, same status message.
const TRIGGER_DIR = resolve(REPO_ROOT, "bot/data/trigger");
const chatCtx = (chat: string) => ({ reply: (text: string, opts?: any) => bot.api.sendMessage(chat, text, opts) });
setInterval(async () => {
  let files: string[];
  try {
    files = (await readdir(TRIGGER_DIR)).filter((f) => f.endsWith(".txt")).sort();
  } catch {
    return; // no inbox yet
  }
  for (const f of files) {
    const path = resolve(TRIGGER_DIR, f);
    const text = (await readFile(path, "utf8").catch(() => "")).trim();
    await unlink(path).catch(() => {});
    const chat = config.telegram.chatId;
    const ctx = chatCtx(chat);
    console.log(`trigger: ${text.slice(0, 80)}`);
    const m = text.match(/^(idea|news|tool):\s*([\s\S]+)/i);
    if (m) await runIdea(ctx, chat, m[2].trim(), m[1].toLowerCase() === "idea" ? undefined : (m[1].toLowerCase() as "tool" | "news"));
    else if (/^\/?idea$/i.test(text)) {
      await ctx.reply("researching something…");
      await generateIdea().then((i) => activateIdea(ctx, chat, i)).catch((e) => ctx.reply(`couldn't come up with one: ${e.message}`));
    } else if (/^\/?retrysite$/i.test(text)) await retrySite(ctx);
    else if (/^pick\s+[1-3]\b/i.test(text)) {
      const [, n, change] = text.match(/^pick\s+([1-3])\b\s*(?:but\s+)?(.*)$/is)!;
      if (!(await pickCard(ctx, chat, Number(n), change.trim() || undefined))) await ctx.reply(`no card ${n} in today's digest.`);
    }
    else if (/^\/?post$/i.test(text)) await postPending(chat);
    else if (/^stage\s+\S+\.json$/i.test(text)) await stageFromFile(chat, text.split(/\s+/)[1]);
    else console.error(`trigger: ignored "${text.slice(0, 60)}" (only "idea:/news:/tool: …", "idea", "pick N [change]", "retrysite" or "post")`);
  }
}, 5000);
