import { getCollections, genId, stampInsert, stampUpdate } from "../lib/db.js";
import { safeErr, clampText } from "../lib/utils.js";
import { adjustUserRewardCounters } from "./users.js";
import { createRewardLedgerEntry, getRewardsForUser } from "./rewards.js";

const POLL_TYPES = new Set(["normal", "quiz", "prediction"]);

function normalizeStatus(poll) {
  const endTime = poll?.endTime ? new Date(poll.endTime) : null;
  const explicit = poll?.status || "active";
  if (explicit === "ended") return "ended";
  if (endTime && endTime.getTime() <= Date.now()) return "ended";
  return explicit === "draft" ? "draft" : "active";
}

function sanitizeOptions(options = []) {
  return options
    .map((option, index) => ({
      id: option?.id || `opt_${index + 1}`,
      text: clampText(option?.text, 120)
    }))
    .filter((option) => option.text);
}

export async function createPoll({ creator, question, options, pollType, rewardPoints, endTime, correctOptionId }) {
  const cleanQuestion = clampText(question, 240);
  const cleanOptions = sanitizeOptions(options);
  const type = POLL_TYPES.has(pollType) ? pollType : "normal";
  const reward = Math.max(0, Number(rewardPoints || 0));

  if (!cleanQuestion) throw new Error("Question is required.");
  if (cleanOptions.length < 2) throw new Error("At least two options are required.");

  const poll = stampInsert({
    id: genId("pol"),
    creatorTelegramId: String(creator.telegramId),
    creatorName: creator.username || creator.firstName || "Creator",
    question: cleanQuestion,
    options: cleanOptions,
    pollType: type,
    correctOptionId: type === "quiz" ? String(correctOptionId || "") : "",
    rewardPoints: reward,
    endTime: endTime ? new Date(endTime) : null,
    status: "active",
    totalVotes: 0,
    shareSlug: genId("share")
  });

  const collections = getCollections();

  if (collections.polls.insertOne) {
    try {
      await collections.polls.insertOne(poll);
      return poll;
    } catch (err) {
      console.error("[db] poll create failure", { collection: "polls", operation: "insertOne", error: safeErr(err) });
      throw err;
    }
  }

  collections.polls.set(poll.id, poll);
  return poll;
}

export async function listPolls({ activeOnly = false } = {}) {
  const collections = getCollections();

  if (collections.polls.find) {
    try {
      const docs = await collections.polls.find({}).sort({ createdAt: -1 }).toArray();
      return docs
        .map((poll) => ({ ...poll, status: normalizeStatus(poll) }))
        .filter((poll) => (activeOnly ? poll.status === "active" : true));
    } catch (err) {
      console.error("[db] poll list failure", { collection: "polls", operation: "find", error: safeErr(err) });
      return [];
    }
  }

  return [...collections.polls.values()]
    .map((poll) => ({ ...poll, status: normalizeStatus(poll) }))
    .filter((poll) => (activeOnly ? poll.status === "active" : true))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getPollById(pollId) {
  const collections = getCollections();
  const id = String(pollId || "");

  if (collections.polls.findOne) {
    try {
      const poll = await collections.polls.findOne({ id });
      return poll ? { ...poll, status: normalizeStatus(poll) } : null;
    } catch (err) {
      console.error("[db] poll read failure", { collection: "polls", operation: "findOne", error: safeErr(err) });
      return null;
    }
  }

  const poll = collections.polls.get(id);
  return poll ? { ...poll, status: normalizeStatus(poll) } : null;
}

export async function submitVote({ pollId, telegramId, optionId }) {
  const poll = await getPollById(pollId);
  if (!poll) throw new Error("Poll not found.");
  if (poll.status !== "active") throw new Error("This poll has ended.");

  const option = (poll.options || []).find((item) => item.id === optionId);
  if (!option) throw new Error("Option not found.");

  const collections = getCollections();
  const vote = stampInsert({
    id: genId("vot"),
    pollId: String(pollId),
    telegramId: String(telegramId),
    optionId: String(optionId),
    awardedPoints: Number(poll.rewardPoints || 0),
    votedAt: new Date(),
    isCorrect: poll.pollType === "quiz" ? String(poll.correctOptionId || "") === String(optionId) : null
  });

  if (collections.votes.insertOne) {
    try {
      const existing = await collections.votes.findOne({ pollId: vote.pollId, telegramId: vote.telegramId });
      if (existing) {
        return { ok: false, duplicate: true, pointsEarned: Number(existing.awardedPoints || 0) };
      }

      await collections.votes.insertOne(vote);
      await collections.polls.updateOne(
        { id: vote.pollId },
        {
          $set: stampUpdate({ totalVotes: Number(poll.totalVotes || 0) + 1, status: normalizeStatus(poll) })
        }
      );
    } catch (err) {
      if (String(safeErr(err)).toLowerCase().includes("duplicate")) {
        return { ok: false, duplicate: true, pointsEarned: 0 };
      }
      console.error("[db] vote write failure", { collection: "votes", operation: "insertOne", error: safeErr(err) });
      throw err;
    }
  } else {
    const key = `${vote.pollId}:${vote.telegramId}`;
    if (collections.votes.has(key)) {
      return { ok: false, duplicate: true, pointsEarned: 0 };
    }
    collections.votes.set(key, vote);
    const mutablePoll = collections.polls.get(vote.pollId);
    mutablePoll.totalVotes = Number(mutablePoll.totalVotes || 0) + 1;
    mutablePoll.updatedAt = new Date();
    collections.polls.set(vote.pollId, mutablePoll);
  }

  const points = Number(poll.rewardPoints || 0);
  await adjustUserRewardCounters(vote.telegramId, points, "pending");
  await createRewardLedgerEntry({
    telegramId: vote.telegramId,
    pollId: vote.pollId,
    type: vote.isCorrect ? "quizbonus" : "participation",
    points,
    status: "pending",
    metadata: {
      optionId: vote.optionId,
      pollType: poll.pollType
    }
  });

  return {
    ok: true,
    duplicate: false,
    pointsEarned: points,
    vote
  };
}

export async function getCompletedPollsForUser(telegramId) {
  const collections = getCollections();
  const id = String(telegramId || "");

  if (collections.votes.find) {
    try {
      const votes = await collections.votes.find({ telegramId: id }).sort({ votedAt: -1 }).toArray();
      const pollIds = votes.map((v) => v.pollId);
      const polls = pollIds.length ? await collections.polls.find({ id: { $in: pollIds } }).toArray() : [];
      const pollMap = new Map(polls.map((poll) => [poll.id, poll]));
      return votes.map((vote) => ({
        ...vote,
        poll: pollMap.get(vote.pollId) || null
      }));
    } catch (err) {
      console.error("[db] completed polls failure", { collection: "votes", operation: "find", error: safeErr(err) });
      return [];
    }
  }

  const votes = [...collections.votes.values()].filter((vote) => vote.telegramId === id);
  return votes
    .sort((a, b) => new Date(b.votedAt).getTime() - new Date(a.votedAt).getTime())
    .map((vote) => ({ ...vote, poll: collections.polls.get(vote.pollId) || null }));
}

export async function getRewardsPageData(telegramId) {
  const [completedPolls, rewards] = await Promise.all([
    getCompletedPollsForUser(telegramId),
    getRewardsForUser(telegramId)
  ]);
  return { completedPolls, rewards };
}
