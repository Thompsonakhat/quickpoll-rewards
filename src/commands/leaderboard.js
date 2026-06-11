import { InlineKeyboard } from "grammy";
import { getLeaderboard } from "../services/leaderboard.js";
import { getMiniAppUrl } from "../lib/config.js";

export default function register(bot) {
  bot.command("leaderboard", async (ctx) => {
    const top = await getLeaderboard(3);
    const preview = top.length
      ? top.map((user) => `${user.rank}. ${user.username ? `@${user.username}` : user.firstName || user.telegramId} — ${user.totalPointsEarned || 0} pts`).join("\n")
      : "No leaderboard data yet.";

    const appUrl = getMiniAppUrl("leaderboard");
    await ctx.reply(`Top users:\n${preview}`, appUrl ? {
      reply_markup: new InlineKeyboard().webApp("Open Leaderboard", appUrl)
    } : undefined);
  });
}
