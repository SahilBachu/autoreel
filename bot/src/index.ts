import { Bot, InlineKeyboard, InputFile } from "grammy";
import { appendFile } from "node:fs/promises";
import { resolve } from "node:path";
import { config, REPO_ROOT } from "./config.js";
import { state } from "./state.js";
import { generateIdea } from "./jobs/idea.js";
import { renderReel } from "./jobs/render.js";
import { postReel } from "./jobs/post.js";

// self-hosted Bot API server = big-file support
const bot = new Bot(config.telegram.token, {
  client: { apiRoot: config.telegram.apiRoot },
});

// only talk to the owner
bot.use(async (ctx, next) => {
  if (String(ctx.chat?.id) === config.telegram.chatId) return next();
});

const approveKeyboard = new InlineKeyboard()
  .text("✅ Post", "post")
  .text("🔁 Redo", "redo")
  .text("✏️ Edit", "edit");

async function makeAndSendReel(ctx: any, chat: string) {
  const p = state.get(chat);
  if (!p?.clipPath || !p.script) return ctx.reply("Send me a clip first (with a script).");
  await ctx.reply("🎬 rendering… this takes a bit.");
  try {
    const mp4 = await renderReel({
      clipPath: p.clipPath,
      script: p.script,
      topic: p.topic,
      editNote: p.awaitingEdit ? undefined : undefined,
    });
    state.patch(chat, { mp4Path: mp4, awaitingEdit: false });
    await ctx.replyWithVideo(new InputFile(mp4), { reply_markup: approveKeyboard });
  } catch (e: any) {
    await ctx.reply(`⚠️ render not ready: ${e.message}`);
  }
}

bot.command("start", (ctx) =>
  ctx.reply("autoreel ready. /idea for a random one, or `idea: <your idea>`. Then send a clip."),
);

// random idea
bot.command("idea", async (ctx) => {
  await ctx.reply("💡 thinking of something…");
  const { topic, script } = await generateIdea();
  state.set(String(ctx.chat.id), { topic, script });
  await ctx.reply(`*${topic}*\n\n${script}\n\n🎥 record it and send the clip.`, {
    parse_mode: "Markdown",
  });
});

// described idea:  "idea: claude code now runs in the browser"
bot.hears(/^idea:\s*(.+)/is, async (ctx) => {
  const desc = ctx.match[1];
  await ctx.reply("💡 writing that…");
  const { topic, script } = await generateIdea(desc);
  state.set(String(ctx.chat.id), { topic, script });
  await ctx.reply(`*${topic}*\n\n${script}\n\n🎥 record it and send the clip.`, {
    parse_mode: "Markdown",
  });
});

// queue for the 3am job
bot.hears(/^tomorrow:\s*(.+)/is, async (ctx) => {
  await appendFile(resolve(REPO_ROOT, "topics.md"), `\n- ${ctx.match[1].trim()}`);
  await ctx.reply("📌 added to the queue.");
});

// the clip arrives -> render
bot.on(["message:video", "message:document"], async (ctx) => {
  const chat = String(ctx.chat.id);
  const file = await ctx.getFile(); // on the local Bot API server, file_path is a disk path
  const clipPath = file.file_path!;
  const prev = state.get(chat) ?? { topic: "untitled", script: "" };
  state.set(chat, { ...prev, clipPath });
  await makeAndSendReel(ctx, chat);
});

// approve / redo / edit
bot.callbackQuery("post", async (ctx) => {
  await ctx.answerCallbackQuery();
  const p = state.get(String(ctx.chat!.id));
  if (!p?.mp4Path) return ctx.reply("Nothing to post yet.");
  try {
    const link = await postReel(p.mp4Path, p.script.split("\n")[0]);
    await ctx.reply(`🚀 posted: ${link}`);
    state.clear(String(ctx.chat!.id));
  } catch (e: any) {
    await ctx.reply(`⚠️ post not ready: ${e.message}`);
  }
});

bot.callbackQuery("redo", async (ctx) => {
  await ctx.answerCallbackQuery();
  await makeAndSendReel(ctx, String(ctx.chat!.id));
});

bot.callbackQuery("edit", async (ctx) => {
  await ctx.answerCallbackQuery();
  state.patch(String(ctx.chat!.id), { awaitingEdit: true });
  await ctx.reply("✏️ what should I change? (e.g. 'punchier hook', 'swap the title font')");
});

// an edit note (only when we're awaiting one)
bot.on("message:text", async (ctx) => {
  const chat = String(ctx.chat.id);
  const p = state.get(chat);
  if (!p?.awaitingEdit) return; // otherwise ignore free text
  const editNote = ctx.message.text;
  await ctx.reply("🔧 applying and re-rendering…");
  try {
    const mp4 = await renderReel({ clipPath: p.clipPath!, script: p.script, topic: p.topic, editNote });
    state.patch(chat, { mp4Path: mp4, awaitingEdit: false });
    await ctx.replyWithVideo(new InputFile(mp4), { reply_markup: approveKeyboard });
  } catch (e: any) {
    await ctx.reply(`⚠️ render not ready: ${e.message}`);
  }
});

bot.catch((err) => console.error("bot error", err));
bot.start({ onStart: (me) => console.log(`@${me.username} running`) });
