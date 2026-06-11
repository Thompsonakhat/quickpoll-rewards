import { MongoClient } from "mongodb";
import { cfg } from "./config.js";
import { safeErr, nowIso } from "./utils.js";

let client = null;
let db = null;
let memoryStore = null;

function createMemoryStore() {
  const state = {
    users: new Map(),
    polls: new Map(),
    votes: new Map(),
    rewards: new Map(),
    memoryMessages: []
  };
  return {
    kind: "memory",
    state
  };
}

export async function connectDb() {
  if (!cfg.MONGODB_URI) {
    memoryStore = createMemoryStore();
    console.warn("[db] MONGODB_URI missing, using in-memory fallback");
    return null;
  }

  try {
    client = new MongoClient(cfg.MONGODB_URI, { ignoreUndefined: true });
    await client.connect();
    db = client.db();
    console.log("[db] connected", { mongo: true });
    await ensureIndexes();
    return db;
  } catch (err) {
    console.error("[db] connect failure", { operation: "connect", error: safeErr(err) });
    memoryStore = createMemoryStore();
    return null;
  }
}

async function ensureIndexes() {
  if (!db) return;
  try {
    await db.collection("users").createIndex({ telegramId: 1 }, { unique: true });
    await db.collection("votes").createIndex({ pollId: 1, telegramId: 1 }, { unique: true });
    await db.collection("polls").createIndex({ status: 1, endTime: 1 });
    await db.collection("rewards").createIndex({ telegramId: 1, status: 1 });
    await db.collection("memory_messages").createIndex({ telegramId: 1, ts: -1 });
  } catch (err) {
    console.error("[db] index failure", { operation: "ensureIndexes", error: safeErr(err) });
  }
}

export function getDbMode() {
  return db ? "mongo" : "memory";
}

export function getCollections() {
  if (db) {
    return {
      users: db.collection("users"),
      polls: db.collection("polls"),
      votes: db.collection("votes"),
      rewards: db.collection("rewards"),
      memoryMessages: db.collection("memory_messages")
    };
  }
  return memoryStore.state;
}

export async function saveMemoryMessage({ telegramId, chatId, role, text }) {
  const clean = {
    telegramId: String(telegramId || ""),
    chatId: String(chatId || ""),
    platform: "telegram",
    role: String(role || "user"),
    text: String(text || "").slice(0, 2000),
    ts: new Date()
  };

  if (db) {
    try {
      await db.collection("memory_messages").insertOne(clean);
    } catch (err) {
      console.error("[db] memory write failure", { collection: "memory_messages", operation: "insertOne", error: safeErr(err) });
    }
    return;
  }

  memoryStore.state.memoryMessages.push(clean);
  if (memoryStore.state.memoryMessages.length > 5000) {
    memoryStore.state.memoryMessages.shift();
  }
}

export async function getRecentMemory(telegramId, limit = 10) {
  const id = String(telegramId || "");
  if (db) {
    try {
      return await db.collection("memory_messages").find({ telegramId: id }).sort({ ts: -1 }).limit(limit).toArray();
    } catch (err) {
      console.error("[db] memory read failure", { collection: "memory_messages", operation: "find", error: safeErr(err) });
      return [];
    }
  }
  return memoryStore.state.memoryMessages.filter((m) => m.telegramId === id).slice(-limit).reverse();
}

export async function clearMemory(telegramId) {
  const id = String(telegramId || "");
  if (db) {
    try {
      await db.collection("memory_messages").deleteMany({ telegramId: id });
    } catch (err) {
      console.error("[db] memory clear failure", { collection: "memory_messages", operation: "deleteMany", error: safeErr(err) });
    }
    return;
  }
  memoryStore.state.memoryMessages = memoryStore.state.memoryMessages.filter((m) => m.telegramId !== id);
}

export function genId(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

export function stampInsert(doc = {}) {
  return {
    ...doc,
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

export function stampUpdate(doc = {}) {
  const next = { ...doc };
  delete next._id;
  delete next.createdAt;
  return {
    ...next,
    updatedAt: new Date()
  };
}

export function fallbackNow() {
  return nowIso();
}
