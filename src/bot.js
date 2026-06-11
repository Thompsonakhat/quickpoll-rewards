import { Bot } from "grammy";
import { run } from "@grammyjs/runner";
import { cfg } from "./lib/config.js";
import { safeErr, sleep } from "./lib/utils.js";
import { registerCommands } from "./commands/loader.js";

let runner = null;
let pollingPromise = null;
let restarting = false;

export async function createTelegramBot() {
  const bot = new Bot(cfg.TELEGRAM_BOT_TOKEN);

  bot.catch((err) => {
    console.error("[telegram] bot.catch", { error: safeErr(err?.error || err) });
  });

  await registerCommands(bot);

  try {
    await bot.api.setMyCommands([
      { command: "start", description: "Open QuickPoll Rewards" },
      { command: "help", description: "How to use the bot" },
      { command: "app", description: "Open the Mini App" },
      { command: "leaderboard", description: "View top users" },
      { command: "rewards", description: "Open My Rewards" },
      { command: "createpoll", description: "Open Create Poll" },
      { command: "admin", description: "Open admin dashboard" },
      { command: "reset", description: "Clear your saved memory" }
    ]);
  } catch (err) {
    console.error("[telegram] setMyCommands failed", { error: safeErr(err) });
  }

  await bot.init();
  return bot;
}

async function stopRunner() {
  if (!runner) return;
  try {
    runner.stop();
  } catch (err) {
    console.error("[telegram] stop runner failed", { error: safeErr(err) });
  }
  runner = null;
  pollingPromise = null;
}

export async function startPolling(bot) {
  if (pollingPromise) return pollingPromise;

  pollingPromise = (async () => {
    const backoffs = [2000, 5000, 10000, 20000];
    let attempt = 0;

    while (true) {
      try {
        console.log("[telegram] polling start", { attempt: attempt + 1 });
        await bot.api.deleteWebhook({ drop_pending_updates: true });
        runner = run(bot, { runner: { fetch: { allowed_updates: ["message", "callback_query"] } }, sink: { concurrency: 1 } });
        console.log("[telegram] polling started", { concurrency: 1 });
        return;
      } catch (err) {
        const message = safeErr(err);
        const isConflict = String(message).includes("409") || String(message).toLowerCase().includes("conflict");
        const delay = backoffs[Math.min(attempt, backoffs.length - 1)];
        console.error("[telegram] polling failure", { error: message, conflict: isConflict, retryInMs: delay });
        await stopRunner();
        if (restarting) {
          await sleep(delay);
          continue;
        }
        restarting = true;
        await sleep(delay);
        restarting = false;
        attempt += 1;
      }
    }
  })();

  return pollingPromise;
}
