import express from "express";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { cfg } from "./lib/config.js";
import { safeErr } from "./lib/utils.js";
import { bootstrapTelegramUser } from "./services/auth.js";
import { createPoll, getPollById, getRewardsPageData, listPolls, submitVote } from "./services/polls.js";
import { getLeaderboard } from "./services/leaderboard.js";
import { claimRewardsForUser } from "./services/rewards.js";
import { getAdminStats, ensureAdmin } from "./services/admin.js";
import { getUserByTelegramId } from "./services/users.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
let memLogAt = 0;
let serverRef = null;

function authFromHeaders(req) {
  return {
    initData: String(req.headers["x-telegram-init-data"] || req.body?.initData || ""),
    fallbackUser: req.body?.user || null
  };
}

function sendIndex(res) {
  const file = path.join(__dirname, "..", "webapp", "dist", "index.html");
  if (fs.existsSync(file)) return res.sendFile(file);
  return res.status(200).send("Web app not built yet. Run npm run build:webapp.");
}

function maybeLogMemory() {
  const now = Date.now();
  if (now - memLogAt < 60000) return;
  memLogAt = now;
  const m = process.memoryUsage();
  console.log("[mem]", { rssMB: Math.round(m.rss / 1e6), heapUsedMB: Math.round(m.heapUsed / 1e6) });
}

app.use(express.json({ limit: "1mb" }));
app.use((req, _res, next) => {
  console.log("[http] request", { method: req.method, path: req.path });
  maybeLogMemory();
  next();
});

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "quickpoll-rewards" });
});

app.post("/api/auth/telegram", async (req, res) => {
  try {
    const { initData, fallbackUser } = authFromHeaders(req);
    const result = await bootstrapTelegramUser(initData, fallbackUser);
    if (!result.ok) {
      return res.status(401).json(result);
    }
    return res.json({ ok: true, user: result.user });
  } catch (err) {
    console.error("[api] auth failure", { error: safeErr(err) });
    return res.status(500).json({ ok: false, error: "AUTH_FAILED" });
  }
});

app.get("/api/me", async (req, res) => {
  try {
    const telegramId = String(req.query.telegramId || "");
    const user = await getUserByTelegramId(telegramId);
    return res.json({ ok: true, user });
  } catch (err) {
    console.error("[api] me failure", { error: safeErr(err) });
    return res.status(500).json({ ok: false, error: "ME_FAILED" });
  }
});

app.get("/api/polls", async (req, res) => {
  try {
    const activeOnly = String(req.query.activeOnly || "1") !== "0";
    const polls = await listPolls({ activeOnly });
    return res.json({ ok: true, polls });
  } catch (err) {
    console.error("[api] list polls failure", { error: safeErr(err) });
    return res.status(500).json({ ok: false, error: "POLLS_FAILED" });
  }
});

app.get("/api/polls/:pollId", async (req, res) => {
  try {
    const poll = await getPollById(req.params.pollId);
    if (!poll) return res.status(404).json({ ok: false, error: "POLL_NOT_FOUND" });
    return res.json({ ok: true, poll });
  } catch (err) {
    console.error("[api] poll detail failure", { error: safeErr(err) });
    return res.status(500).json({ ok: false, error: "POLL_DETAIL_FAILED" });
  }
});

app.post("/api/polls", async (req, res) => {
  try {
    const { initData, fallbackUser } = authFromHeaders(req);
    const auth = await bootstrapTelegramUser(initData, fallbackUser);
    if (!auth.ok) return res.status(401).json(auth);

    const poll = await createPoll({
      creator: auth.user,
      question: req.body?.question,
      options: req.body?.options || [],
      pollType: req.body?.pollType,
      rewardPoints: req.body?.rewardPoints,
      endTime: req.body?.endTime,
      correctOptionId: req.body?.correctOptionId
    });

    return res.json({ ok: true, poll });
  } catch (err) {
    console.error("[api] create poll failure", { error: safeErr(err) });
    return res.status(400).json({ ok: false, error: safeErr(err) });
  }
});

app.post("/api/polls/:pollId/vote", async (req, res) => {
  try {
    const { initData, fallbackUser } = authFromHeaders(req);
    const auth = await bootstrapTelegramUser(initData, fallbackUser);
    if (!auth.ok) return res.status(401).json(auth);

    const result = await submitVote({
      pollId: req.params.pollId,
      telegramId: auth.user.telegramId,
      optionId: req.body?.optionId
    });

    return res.json({ ok: true, ...result });
  } catch (err) {
    console.error("[api] vote failure", { error: safeErr(err) });
    return res.status(400).json({ ok: false, error: safeErr(err) });
  }
});

app.get("/api/leaderboard", async (req, res) => {
  try {
    const leaderboard = await getLeaderboard(Number(req.query.limit || 20));
    return res.json({ ok: true, leaderboard });
  } catch (err) {
    console.error("[api] leaderboard failure", { error: safeErr(err) });
    return res.status(500).json({ ok: false, error: "LEADERBOARD_FAILED" });
  }
});

app.get("/api/rewards", async (req, res) => {
  try {
    const telegramId = String(req.query.telegramId || "");
    const user = await getUserByTelegramId(telegramId);
    const details = await getRewardsPageData(telegramId);
    return res.json({ ok: true, user, ...details });
  } catch (err) {
    console.error("[api] rewards failure", { error: safeErr(err) });
    return res.status(500).json({ ok: false, error: "REWARDS_FAILED" });
  }
});

app.post("/api/rewards/claim", async (req, res) => {
  try {
    const { initData, fallbackUser } = authFromHeaders(req);
    const auth = await bootstrapTelegramUser(initData, fallbackUser);
    if (!auth.ok) return res.status(401).json(auth);

    const result = await claimRewardsForUser(auth.user.telegramId);
    return res.json({ ok: true, ...result });
  } catch (err) {
    console.error("[api] rewards claim failure", { error: safeErr(err) });
    return res.status(500).json({ ok: false, error: "CLAIM_FAILED" });
  }
});

app.get("/api/admin/stats", async (req, res) => {
  try {
    const telegramId = String(req.query.telegramId || "");
    const allowed = await ensureAdmin(telegramId);
    if (!allowed) return res.status(403).json({ ok: false, error: "FORBIDDEN" });
    const stats = await getAdminStats();
    return res.json({ ok: true, stats });
  } catch (err) {
    console.error("[api] admin stats failure", { error: safeErr(err) });
    return res.status(500).json({ ok: false, error: "ADMIN_FAILED" });
  }
});

const distDir = path.join(__dirname, "..", "webapp", "dist");
if (fs.existsSync(distDir)) {
  app.use("/app", express.static(distDir));
}

app.get("/app", (_req, res) => sendIndex(res));
app.get("/app/*splat", (_req, res) => sendIndex(res));
app.get("/", (_req, res) => res.redirect("/app"));

export async function startServer() {
  if (serverRef) {
    console.log("[http] server already started", { port: cfg.PORT });
    return serverRef;
  }

  serverRef = await new Promise((resolve, reject) => {
    const server = app.listen(cfg.PORT, () => {
      console.log("[http] server started", { port: cfg.PORT });
      resolve(server);
    });

    server.on("error", (err) => {
      console.error("[http] server failure", { port: cfg.PORT, error: safeErr(err) });
      reject(err);
    });
  });

  return serverRef;
}
