export function safeErr(err) {
  return err?.response?.data?.error?.message || err?.response?.data?.message || err?.message || String(err);
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function clampText(value, max = 280) {
  return String(value || "").trim().slice(0, max);
}

export function nowIso() {
  return new Date().toISOString();
}
