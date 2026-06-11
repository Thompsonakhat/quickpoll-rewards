import { getCollections } from "../lib/db.js";
import { getUserByTelegramId } from "./users.js";
import { safeErr } from "../lib/utils.js";

export async function ensureAdmin(telegramId) {
  const user = await getUserByTelegramId(telegramId);
  return Boolean(user?.isAdmin);
}

export async function getAdminStats() {
  const collections = getCollections();

  if (collections.users.countDocuments) {
    try {
      const [totalUsers, totalPolls, totalVotes] = await Promise.all([
        collections.users.countDocuments({}),
        collections.polls.countDocuments({}),
        collections.votes.countDocuments({})
      ]);
      const polls = await collections.polls.find({}).toArray();
      const activePolls = polls.filter((poll) => !poll.endTime || new Date(poll.endTime).getTime() > Date.now()).length;
      const endedPolls = Math.max(0, polls.length - activePolls);
      return { totalUsers, totalPolls, totalVotes, activePolls, endedPolls };
    } catch (err) {
      console.error("[db] admin stats failure", { collection: "multiple", operation: "aggregate", error: safeErr(err) });
      return { totalUsers: 0, totalPolls: 0, totalVotes: 0, activePolls: 0, endedPolls: 0 };
    }
  }

  const polls = [...collections.polls.values()];
  const activePolls = polls.filter((poll) => !poll.endTime || new Date(poll.endTime).getTime() > Date.now()).length;
  return {
    totalUsers: collections.users.size,
    totalPolls: collections.polls.size,
    totalVotes: collections.votes.size,
    activePolls,
    endedPolls: Math.max(0, collections.polls.size - activePolls)
  };
}
