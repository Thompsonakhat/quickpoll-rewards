export default function register(bot) {
  bot.command("help", async (ctx) => {
    await ctx.reply(
      "QuickPoll Rewards commands: /start, /help, /app, /leaderboard, /rewards, /createpoll, /admin, /reset. Use the Mini App to create polls, vote once per poll, and earn reward points."
    );
  });
}
