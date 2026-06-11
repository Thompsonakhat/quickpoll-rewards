import { InlineKeyboard } from "grammy";
import { getMiniAppUrl } from "../lib/config.js";

function buildStartKeyboard() {
  const appUrl = getMiniAppUrl();
  if (!appUrl) return null;
  return new InlineKeyboard().webApp("Open QuickPoll Rewards", appUrl);
}

export default function register(bot) {
  bot.command("start", async (ctx) => {
    const keyboard = buildStartKeyboard();
    const text = keyboard
      ? "Welcome to QuickPoll Rewards. Create polls, vote in campaigns, earn points, and track your rewards in the Mini App."
      : "Welcome to QuickPoll Rewards. The bot is live, but the Mini App URL is not configured yet. Set PUBLIC_BASE_URL after deployment.";

    await ctx.reply(text, keyboard ? { reply_markup: keyboard } : undefined);
  });
}
