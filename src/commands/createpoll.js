import { InlineKeyboard } from "grammy";
import { getMiniAppUrl } from "../lib/config.js";

export default function register(bot) {
  bot.command("createpoll", async (ctx) => {
    const appUrl = getMiniAppUrl("create");
    if (!appUrl) {
      await ctx.reply("The Mini App URL is not configured yet.");
      return;
    }
    await ctx.reply("Open Create Poll to launch a new normal poll, quiz, or prediction campaign.", {
      reply_markup: new InlineKeyboard().webApp("Create Poll", appUrl)
    });
  });
}
