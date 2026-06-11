import crypto from "node:crypto";
import { cfg } from "../lib/config.js";
import { upsertUserFromTelegram } from "./users.js";

export function verifyTelegramInitData(initData) {
  const value = String(initData || "");
  if (!value) return { ok: false, error: "MISSING_INIT_DATA" };

  const params = new URLSearchParams(value);
  const hash = params.get("hash") || "";
  if (!hash) return { ok: false, error: "MISSING_HASH" };

  params.delete("hash");
  const pairs = [...params.entries()].map(([k, v]) => `${k}=${v}`).sort();
  const dataCheckString = pairs.join("\n");

  const secret = crypto.createHmac("sha256", "WebAppData").update(cfg.TELEGRAM_BOT_TOKEN).digest();
  const calculated = crypto.createHmac("sha256", secret).update(dataCheckString).digest("hex");

  const left = Buffer.from(calculated, "hex");
  const right = Buffer.from(hash, "hex");
  if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) {
    return { ok: false, error: "BAD_HASH" };
  }

  let user = null;
  try {
    user = JSON.parse(params.get("user") || "null");
  } catch {
    user = null;
  }

  return { ok: true, user };
}

export async function bootstrapTelegramUser(initData, fallbackUser = null) {
  let verified = null;

  if (initData) {
    const result = verifyTelegramInitData(initData);
    if (!result.ok) return result;
    verified = result.user;
  }

  const user = verified || fallbackUser;
  if (!user?.id) return { ok: false, error: "MISSING_USER" };

  const profile = await upsertUserFromTelegram(user);
  return { ok: true, user: profile };
}
