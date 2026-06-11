import { InlineKeyboard } from "grammy";
import { getMiniAppUrl } from "../lib/config.js";
import { ensureAdmin } from "../services/admin.js";

export default function register(bot) {
  bot.command("admin", async (ctx) => {
    const telegramId = String(ctx.from?.id || "");
    const allowed = await ensureAdmin(telegramId);
    if (!allowed) {
      await ctx.reply("This dashboard is only available to approved admins.");
      return;
    }

    const appUrl = getMiniAppUrl("admin");
    await ctx.reply("Open the admin dashboard to view poll, vote, and user stats.", appUrl ? {
      reply_markup: new InlineKeyboard().webApp("Open Admin Dashboard", appUrl)
    } : undefined);
  });
}
