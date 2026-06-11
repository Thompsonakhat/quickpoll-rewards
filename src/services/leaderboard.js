import { getCollections } from "../lib/db.js";
import { safeErr } from "../lib/utils.js";

export async function getLeaderboard(limit = 10) {
  const size = Math.max(1, Math.min(Number(limit || 10), 50));
  const collections = getCollections();

  if (collections.users.find) {
    try {
      const users = await collections.users.find({}).sort({ totalPointsEarned: -1, pointsBalance: -1, createdAt: 1 }).limit(size).toArray();
      return users.map((user, index) => ({ ...user, rank: index + 1 }));
    } catch (err) {
      console.error("[db] leaderboard failure", { collection: "users", operation: "find", error: safeErr(err) });
      return [];
    }
  }

  return [...collections.users.values()]
    .sort((a, b) => Number(b.totalPointsEarned || 0) - Number(a.totalPointsEarned || 0))
    .slice(0, size)
    .map((user, index) => ({ ...user, rank: index + 1 }));
}
