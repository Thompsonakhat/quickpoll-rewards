import { getCollections, genId, stampInsert, stampUpdate } from "../lib/db.js";
import { safeErr } from "../lib/utils.js";
import { claimPendingRewards, getUserByTelegramId } from "./users.js";

export async function createRewardLedgerEntry({ telegramId, pollId = "", type = "participation", points = 0, status = "pending", metadata = {} }) {
  const entry = stampInsert({
    id: genId("rwd"),
    telegramId: String(telegramId),
    pollId: String(pollId || ""),
    type,
    points: Number(points || 0),
    status,
    claimedAt: null,
    metadata
  });

  const collections = getCollections();

  if (collections.rewards.insertOne) {
    try {
      await collections.rewards.insertOne(entry);
    } catch (err) {
      console.error("[db] reward write failure", { collection: "rewards", operation: "insertOne", error: safeErr(err) });
      throw err;
    }
    return entry;
  }

  collections.rewards.set(entry.id, entry);
  return entry;
}

export async function getRewardsForUser(telegramId) {
  const collections = getCollections();
  const id = String(telegramId || "");

  if (collections.rewards.find) {
    try {
      return await collections.rewards.find({ telegramId: id }).sort({ createdAt: -1 }).toArray();
    } catch (err) {
      console.error("[db] reward read failure", { collection: "rewards", operation: "find", error: safeErr(err) });
      return [];
    }
  }

  return [...collections.rewards.values()]
    .filter((entry) => entry.telegramId === id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function claimRewardsForUser(telegramId) {
  const collections = getCollections();
  const id = String(telegramId || "");

  if (collections.rewards.updateMany) {
    try {
      await collections.rewards.updateMany(
        { telegramId: id, status: "pending" },
        {
          $set: stampUpdate({ status: "claimed", claimedAt: new Date() })
        }
      );
    } catch (err) {
      console.error("[db] reward claim failure", { collection: "rewards", operation: "updateMany", error: safeErr(err) });
      throw err;
    }
  } else {
    for (const [rewardId, reward] of collections.rewards.entries()) {
      if (reward.telegramId === id && reward.status === "pending") {
        reward.status = "claimed";
        reward.claimedAt = new Date();
        reward.updatedAt = new Date();
        collections.rewards.set(rewardId, reward);
      }
    }
  }

  const user = await claimPendingRewards(id);
  return {
    user: user || (await getUserByTelegramId(id)),
    rewards: await getRewardsForUser(id)
  };
}
