import { InlineKeyboard } from "grammy";
import { getMiniAppUrl } from "../lib/config.js";

export default function register(bot) {
  bot.command("app", async (ctx) => {
    const appUrl = getMiniAppUrl();
    if (!appUrl) {
      await ctx.reply("The Mini App URL is not configured yet. Set PUBLIC_BASE_URL after deployment.");
      return;
    }
    await ctx.reply("Open QuickPoll Rewards:", {
      reply_markup: new InlineKeyboard().webApp("Open App", appUrl)
    });
  });
}
