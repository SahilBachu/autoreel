import { Bot, InlineKeyboard, InputFile } from "grammy";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { homedir } from "node:os";
import { config, REPO_ROOT } from "./config.js";
import { state } from "./state.js";
import { generateIdea, reviseScript } from "./jobs/idea.js";
import { buildDigest, formatDigest, loadDigest, markPicked } from "./jobs/discover.js";
import { renderReel } from "./jobs/render.js";
import { postReel } from "./jobs/post.js";
import { genPostCaption } from "./lib/caption.js";
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
    const { mp4, planSummary } = await renderReel({ clipPath: p.clipPath, script: p.script, topic: p.topic, editNote: note });
    const caption = await genPostCaption(p.topic, p.script);
    state.patch(chat, { mp4Path: mp4, caption, awaitingEdit: false, lastEditNote: note, lastPlan: planSummary });
    // show the generated IG caption under the reel; [Post] will publish with it.
    // width/height/supports_streaming are REQUIRED with the self-hosted local Bot API server:
    // without them Telegram picks a wrong-aspect player box and displays the reel stretched.
    await ctx.replyWithVideo(new InputFile(mp4), {
      caption: `caption:\n${caption}`,
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
  "/idea — random idea + script",
  "`idea: <your idea>` — writes a NEW script for a described idea (Claude writes it)",
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

// on-demand discovery (same machinery as the 3am digest)
bot.command("discover", async (ctx) => {
  await ctx.reply("researching what the AI world is talking about — takes a few minutes…");
  try {
    const digest = await buildDigest(3);
    await ctx.reply(formatDigest(digest));
  } catch (e: any) {
    await ctx.reply(`discovery failed: ${e.message}`);
  }
});

// random idea
bot.command("idea", async (ctx) => {
  await ctx.reply("thinking of something…");
  try {
    const { topic, script, sessionId } = await generateIdea();
    state.set(String(ctx.chat.id), { topic, script, stage: "script", scriptSessionId: sessionId });
    learnFromIdea(topic);
    await safeReply(ctx, `*${topic}*\n\n${script}\n\nsend the clip when it's right — or just tell me what to change.`, {
      parse_mode: "Markdown",
    });
  } catch (e: any) {
    await ctx.reply(`couldn't come up with one: ${e.message}`);
  }
});

// described idea:  "idea: claude code now runs in the browser" — Claude WRITES a script for
// this description. If you already have a finished script, use "script: <text>" instead —
// this command asks Claude to write something new "about" whatever text follows.
bot.hears(/^idea:\s*(.+)/is, async (ctx) => {
  const desc = ctx.match[1];
  await ctx.reply("writing that…");
  try {
    const { topic, script, sessionId } = await generateIdea(desc);
    state.set(String(ctx.chat.id), { topic, script, stage: "script", scriptSessionId: sessionId });
    learnFromIdea(topic);
    await safeReply(ctx, `*${topic}*\n\n${script}\n\nsend the clip when it's right — or just tell me what to change.`, {
      parse_mode: "Markdown",
    });
  } catch (e: any) {
    await ctx.reply(`couldn't write that: ${e.message}`);
  }
});

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
  const chat = String(ctx.chat!.id);
  const p = state.get(chat);
  if (!p?.mp4Path) return ctx.reply("Nothing to post yet — send a clip first.");
  if (p.posting) return ctx.reply("already posting that one — hang tight.");
  state.patch(chat, { posting: true });

  // one status message, edited in place so the user always knows where it's at
  const msg = await ctx.reply("*Posting…*\nuploading video to storage", { parse_mode: "Markdown" });
  const set = (t: string) =>
    ctx.api.editMessageText(chat, msg.message_id, t, { parse_mode: "Markdown" }).catch(() => {});

  try {
    const link = await postReel(p.mp4Path, p.caption ?? p.script.split("\n")[0], {
      onUploaded: () => set("*Posting…*\nuploaded — sending to Instagram"),
      onProcessing: () => set("*Posting…*\nuploaded, sent — Instagram is processing the reel (transcoding)…"),
      onPublishing: () => set("*Posting…*\nuploaded, sent, processed — publishing…"),
    });
    await set(`*Posted:*\n${link}`);
    learnFromPost(p.topic, p.script).catch(() => {}); // approved = strongest signal; learn in bg
    state.clear(chat);
  } catch (e: any) {
    state.patch(chat, { posting: false });
    await set(`*Post failed:* ${e.message}\nTap Post again to retry, or Redo.`);
  }
});

bot.callbackQuery("redo", async (ctx) => {
  await ctx.answerCallbackQuery();
  const chat = String(ctx.chat!.id);
  const p = state.get(chat);
  learnFromRedo(p?.topic ?? "", p?.lastPlan); // they rejected that take — log WHICH plan
  await makeAndSendReel(ctx, chat); // re-renders with the last edit note still applied
});

bot.callbackQuery("edit", async (ctx) => {
  await ctx.answerCallbackQuery();
  state.patch(String(ctx.chat!.id), { awaitingEdit: true });
  await ctx.reply("what should I change? (e.g. 'punchier hook', 'swap the title font')");
});

// free text = either a post-render reel edit ([Edit] tapped), or — while we're still on
// the script — a change request that revises the script in place. Keep going until a clip.
bot.on("message:text", async (ctx) => {
  const chat = String(ctx.chat.id);

  // digest pick: "1" / "2" / "3", optionally "2 but <change>" — activates that card's script
  // (and its live session), then the normal revise loop takes over.
  const pick = ctx.message.text.match(/^\s*([1-3])\b[\s.,:-]*(?:but\s+(.+))?\s*$/is);
  if (pick) {
    const digest = await loadDigest();
    const card = digest?.cards.find((c) => c.n === Number(pick[1]));
    if (card) {
      state.set(chat, { topic: card.topic, script: card.script, stage: "script", scriptSessionId: card.sessionId });
      learnFromIdea(card.topic);
      markPicked(card.topic).catch(() => {}); // future research treats this story as done
      try {
        if (pick[2]) {
          await ctx.reply("picked — reworking it…");
          const r = await reviseScript(card.topic, card.script, pick[2], card.sessionId);
          state.patch(chat, { script: r.script, scriptSessionId: r.sessionId ?? card.sessionId });
          await safeReply(ctx, `*${card.topic}*\n\n${r.script}\n\nsend the clip when it's right — or tell me another change.`, { parse_mode: "Markdown" });
        } else {
          await safeReply(ctx, `*${card.topic}*\n\n${card.script}\n\nsend the clip when it's right — or tell me what to change.`, { parse_mode: "Markdown" });
        }
      } catch (e: any) {
        await ctx.reply(`couldn't pull that one up: ${e.message}`);
      }
      return;
    }
  }

  const p = state.get(chat);
  if (!p) return;

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
bot.start({ onStart: (me) => console.log(`@${me.username} running`) });
