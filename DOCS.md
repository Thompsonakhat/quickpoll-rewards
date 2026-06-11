QuickPoll Rewards lets Telegram users create polls, vote in active campaigns, earn points, and track rewards inside a Telegram Mini App.

Public commands:
1) /start
Opens the welcome flow and sends a Mini App button.
Arguments: none.

2) /help
Shows the available commands and what each does.
Arguments: none.

3) /app
Sends a direct button to open the Mini App home screen.
Arguments: none.

4) /leaderboard
Shows a short top users preview and a button to open the leaderboard page.
Arguments: none.

5) /rewards
Opens the My Rewards page in the Mini App.
Arguments: none.

6) /createpoll
Opens the Create Poll page in the Mini App.
Arguments: none.

7) /admin
Opens the admin dashboard for approved admin Telegram IDs.
Arguments: none.

8) /reset
Clears the current user chat memory stored for the bot.
Arguments: none.

Environment variables:
1) TELEGRAM_BOT_TOKEN
Required. Telegram bot token used by grammY.

2) MONGODB_URI
Optional but recommended. Enables persistent users, polls, votes, rewards, and memory.
If missing, the app uses in-memory fallback storage.

3) PUBLIC_BASE_URL
Optional. Base URL for the deployed app, for example https://your-service.onrender.com.
The bot appends /app automatically.

4) PORT
Optional. HTTP port. Defaults to 4000.

5) ADMIN_TELEGRAM_IDS
Optional. Comma-separated Telegram user IDs allowed to use admin dashboard features.

6) AI_TIMEOUT_MS
Optional. Defaults to 600000.

7) AI_MAX_RETRIES
Optional. Defaults to 2.

8) CONCURRENCY
Optional. Defaults to 20.

Setup:
1) Install dependencies with npm run build
2) Configure env vars
3) Start with npm start
4) Open the bot in Telegram and send /start
