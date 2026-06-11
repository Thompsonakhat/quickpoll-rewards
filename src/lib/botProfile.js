export function buildBotProfile() {
  return [
    "Purpose: QuickPoll Rewards is a Telegram Mini App for creating polls, quizzes, and prediction campaigns where users earn points for participation.",
    "Public commands: /start opens the welcome flow, /help explains usage, /app opens the Mini App, /leaderboard shows top users, /rewards opens My Rewards, /createpoll opens poll creation, /admin opens admin dashboard for admins, /reset clears saved memory.",
    "Rules: In the Mini App, users can vote only once per poll. Admin pages are only for configured admin Telegram IDs. The Mini App is hosted at /app."
  ].join(" ");
}
