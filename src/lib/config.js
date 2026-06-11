const base = (
  process.env.RENDER_EXTERNAL_URL ||
  process.env.PUBLIC_BASE_URL ||
  process.env.WEBAPP_URL ||
  process.env.WEB_APP_URL ||
  process.env.PUBLIC_URL ||
  ""
).replace(/\/+$/, "").replace(/\/app$/i, "");

export const cfg = {
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || "",
  MONGODB_URI: process.env.MONGODB_URI || "",
  PORT: Number(process.env.PORT || 4000),
  PUBLIC_BASE_URL: base,
  ADMIN_TELEGRAM_IDS: String(process.env.ADMIN_TELEGRAM_IDS || "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean),
  AI_TIMEOUT_MS: Number(process.env.AI_TIMEOUT_MS || 600000),
  AI_MAX_RETRIES: Number(process.env.AI_MAX_RETRIES || 2),
  CONCURRENCY: Number(process.env.CONCURRENCY || 20)
};

export function getMiniAppUrl(path = "") {
  const mini = cfg.PUBLIC_BASE_URL ? `${cfg.PUBLIC_BASE_URL}/app` : "";
  if (!mini) return "";
  const normalized = String(path || "").replace(/^\/+/, "");
  return normalized ? `${mini}?page=${encodeURIComponent(normalized)}` : mini;
}
