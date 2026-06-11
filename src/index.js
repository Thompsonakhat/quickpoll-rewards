import "dotenv/config";

function safeErr(err) {
  return err?.response?.data?.error?.message || err?.response?.data?.message || err?.message || String(err);
}

process.on("unhandledRejection", (err) => {
  console.error("[fatal] unhandledRejection", { error: safeErr(err) });
  process.exit(1);
});

process.on("uncaughtException", (err) => {
  console.error("[fatal] uncaughtException", { error: safeErr(err) });
  process.exit(1);
});

async function boot() {
  try {
    console.log("[boot] start");

    const [{ cfg, getMiniAppUrl }, { connectDb }, { startServer }, { createTelegramBot, startPolling }] = await Promise.all([
      import("./lib/config.js"),
      import("./lib/db.js"),
      import("./server.js"),
      import("./bot.js")
    ]);

    console.log("[boot] config", {
      TELEGRAM_BOT_TOKEN: Boolean(cfg.TELEGRAM_BOT_TOKEN),
      MONGODB_URI: Boolean(cfg.MONGODB_URI),
      PUBLIC_BASE_URL: Boolean(cfg.PUBLIC_BASE_URL),
      MINI_APP_URL: Boolean(getMiniAppUrl()),
      ADMIN_TELEGRAM_IDS: cfg.ADMIN_TELEGRAM_IDS.length > 0
    });

    if (!cfg.TELEGRAM_BOT_TOKEN) {
      console.error("TELEGRAM_BOT_TOKEN is missing. Add TELEGRAM_BOT_TOKEN to your environment and redeploy.");
      process.exit(1);
    }

    await connectDb();
    await startServer();
    const bot = await createTelegramBot();
    await startPolling(bot);
  } catch (err) {
    console.error("[boot] failed", { error: safeErr(err) });
    process.exit(1);
  }
}

boot();
