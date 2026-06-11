# QuickPoll Rewards

QuickPoll Rewards is a Telegram Mini App and grammY bot for creating polls, quizzes, and prediction campaigns with reward points.

## Features
- Telegram bot with /start, /help, /app, /leaderboard, /rewards, /createpoll, /admin, /reset
- Telegram Mini App served at /app
- Create polls with multiple options, poll type, reward points, and optional end time
- Join active polls and vote once per Telegram user
- Reward ledger and points balance tracking
- Leaderboard of top users
- My Rewards view with demo claim action
- Admin dashboard with aggregate stats
- MongoDB-backed persistence with in-memory fallback when MONGODB_URI is missing

## Architecture
- Node.js single process
- grammY bot for Telegram commands and polling
- Express server for API and static Mini App hosting
- React + Vite + Tailwind webapp in /webapp
- MongoDB collections: users, polls, votes, rewards, memory_messages

## Setup
### Prerequisites
- Node.js 18+
- Telegram bot token
- MongoDB connection string recommended

### Install
bash
npm run build


### Configure
Copy .env.sample values into your environment.

Required:
- TELEGRAM_BOT_TOKEN: Telegram bot token

Recommended:
- MONGODB_URI: MongoDB connection string
- PUBLIC_BASE_URL: deployed base URL like https://your-service.onrender.com
- ADMIN_TELEGRAM_IDS: comma-separated Telegram user IDs for admin dashboard access

### Run locally
bash
npm start


### Development
bash
npm run dev


## Commands
- /start → welcome message and Mini App button
- /help → usage and command list
- /app → open Mini App
- /leaderboard → quick top users preview
- /rewards → shortcut to rewards page
- /createpoll → shortcut to create poll page
- /admin → shortcut to admin dashboard for admins
- /reset → clear your saved chat memory

## API routes
- POST /api/auth/telegram
- GET /api/me
- GET /api/polls
- POST /api/polls
- GET /api/polls/:pollId
- POST /api/polls/:pollId/vote
- GET /api/leaderboard
- GET /api/rewards
- POST /api/rewards/claim
- GET /api/admin/stats
- GET /health

## Database
Collections:
- users
- polls
- votes
- rewards
- memory_messages

Indexes:
- users.telegramId unique
- votes pollId + telegramId unique
- polls status + endTime
- rewards telegramId + status
- memory_messages telegramId + ts

## Deployment
- Build command: npm run build
- Start command: npm start
- Set TELEGRAM_BOT_TOKEN
- Set PUBLIC_BASE_URL to the service base URL without /app
- Render will provide PORT automatically

## Troubleshooting
- If /start says Mini App URL is not configured, set PUBLIC_BASE_URL
- If duplicate votes happen without MongoDB, connect MONGODB_URI for durable enforcement
- If Telegram returns polling conflicts, the bot retries automatically
- Check boot logs for env presence booleans, DB status, and polling retries

## Extending
- Add commands in src/commands/
- Register them through src/commands/loader.js
- Add API/service logic under src/services/ and src/lib/
- Update DOCS.md when behavior changes
