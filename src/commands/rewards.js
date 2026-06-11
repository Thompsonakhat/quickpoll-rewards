import { InlineKeyboard } from "grammy";
import { getMiniAppUrl } from "../lib/config.js";

export default function register(bot) {
  bot.command("rewards", async (ctx) => {
    const appUrl = getMiniAppUrl("rewards");
    if (!appUrl) {
      await ctx.reply("The Mini App URL is not configured yet.");
      return;
    }
    await ctx.reply("Open My Rewards to see your points, completed polls, and claim demo rewards.", {
      reply_markup: new InlineKeyboard().webApp("Open Rewards", appUrl)
    });
  });
}
