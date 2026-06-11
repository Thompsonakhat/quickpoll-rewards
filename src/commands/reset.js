import { clearMemory } from "../lib/db.js";

export default function register(bot) {
  bot.command("reset", async (ctx) => {
    const telegramId = String(ctx.from?.id || "");
    await clearMemory(telegramId);
    await ctx.reply("Your saved memory has been cleared.");
  });
}
