import { cfg } from "../lib/config.js";
import { getCollections, genId, stampInsert, stampUpdate } from "../lib/db.js";
import { safeErr } from "../lib/utils.js";

function normalizeTelegramUser(user = {}) {
  const telegramId = String(user.id || user.telegramId || "");
  return {
    id: genId("usr"),
    telegramId,
    username: user.username || "",
    firstName: user.first_name || user.firstName || "",
    lastName: user.last_name || user.lastName || "",
    photoUrl: user.photo_url || user.photoUrl || "",
    isAdmin: cfg.ADMIN_TELEGRAM_IDS.includes(telegramId),
    pointsBalance: 0,
    totalPointsEarned: 0,
    completedPollCount: 0,
    pendingRewards: 0,
    claimedRewards: 0,
    lastSeenAt: new Date()
  };
}

export async function upsertUserFromTelegram(user) {
  const collections = getCollections();
  const normalized = normalizeTelegramUser(user);

  if (collections.users.createIndex) {
    try {
      await collections.users.updateOne(
        { telegramId: normalized.telegramId },
        {
          $setOnInsert: {
            ...stampInsert({
              id: normalized.id,
              telegramId: normalized.telegramId,
              pointsBalance: 0,
              totalPointsEarned: 0,
              completedPollCount: 0,
              pendingRewards: 0,
              claimedRewards: 0
            })
          },
          $set: stampUpdate({
            username: normalized.username,
            firstName: normalized.firstName,
            lastName: normalized.lastName,
            photoUrl: normalized.photoUrl,
            isAdmin: normalized.isAdmin,
            lastSeenAt: new Date()
          })
        },
        { upsert: true }
      );

      return await collections.users.findOne({ telegramId: normalized.telegramId });
    } catch (err) {
      console.error("[db] user upsert failure", { collection: "users", operation: "updateOne", error: safeErr(err) });
      throw err;
    }
  }

  const existing = collections.users.get(normalized.telegramId);
  if (existing) {
    const next = {
      ...existing,
      username: normalized.username,
      firstName: normalized.firstName,
      lastName: normalized.lastName,
      photoUrl: normalized.photoUrl,
      isAdmin: normalized.isAdmin,
      lastSeenAt: new Date(),
      updatedAt: new Date()
    };
    collections.users.set(normalized.telegramId, next);
    return next;
  }

  const created = stampInsert(normalized);
  collections.users.set(normalized.telegramId, created);
  return created;
}

export async function getUserByTelegramId(telegramId) {
  const collections = getCollections();
  const id = String(telegramId || "");

  if (collections.users.findOne) {
    try {
      return await collections.users.findOne({ telegramId: id });
    } catch (err) {
      console.error("[db] user read failure", { collection: "users", operation: "findOne", error: safeErr(err) });
      return null;
    }
  }

  return collections.users.get(id) || null;
}

export async function adjustUserRewardCounters(telegramId, deltaPoints, rewardStatus = "pending") {
  const collections = getCollections();
  const id = String(telegramId || "");
  const points = Number(deltaPoints || 0);

  if (collections.users.updateOne) {
    try {
      const inc = {
        pointsBalance: points,
        totalPointsEarned: points,
        completedPollCount: 1,
        pendingRewards: rewardStatus === "pending" ? points : 0
      };
      await collections.users.updateOne(
        { telegramId: id },
        {
          $setOnInsert: { createdAt: new Date() },
          $set: { updatedAt: new Date() },
          $inc: inc
        },
        { upsert: true }
      );
    } catch (err) {
      console.error("[db] user reward adjust failure", { collection: "users", operation: "updateOne", error: safeErr(err) });
      throw err;
    }
    return getUserByTelegramId(id);
  }

  const existing = collections.users.get(id) || stampInsert({
    id: genId("usr"),
    telegramId: id,
    username: "",
    firstName: "",
    lastName: "",
    photoUrl: "",
    isAdmin: cfg.ADMIN_TELEGRAM_IDS.includes(id),
    pointsBalance: 0,
    totalPointsEarned: 0,
    completedPollCount: 0,
    pendingRewards: 0,
    claimedRewards: 0,
    lastSeenAt: new Date()
  });

  existing.pointsBalance += points;
  existing.totalPointsEarned += points;
  existing.completedPollCount += 1;
  if (rewardStatus === "pending") existing.pendingRewards += points;
  existing.updatedAt = new Date();
  collections.users.set(id, existing);
  return existing;
}

export async function claimPendingRewards(telegramId) {
  const user = await getUserByTelegramId(telegramId);
  if (!user) return null;

  const collections = getCollections();
  const id = String(telegramId || "");
  const pending = Number(user.pendingRewards || 0);
  if (pending <= 0) return user;

  if (collections.users.updateOne) {
    await collections.users.updateOne(
      { telegramId: id },
      {
        $setOnInsert: { },
        $set: { updatedAt: new Date() },
        $inc: { pendingRewards: -pending, claimedRewards: pending }
      },
      { upsert: true }
    );
    return getUserByTelegramId(id);
  }

  user.pendingRewards = Math.max(0, Number(user.pendingRewards || 0) - pending);
  user.claimedRewards = Number(user.claimedRewards || 0) + pending;
  user.updatedAt = new Date();
  collections.users.set(id, user);
  return user;
}
