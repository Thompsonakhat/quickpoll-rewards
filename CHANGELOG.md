# Changelog

All notable changes to this bot project are recorded here.

## 2026-06-11 00:31:43. UTC
- Request: help me check what went wrong as deployment failed
- Summary: I made a targeted deploy-fix pass on the most likely blockers. I fixed a syntax-breaking issue in src/lib/ai.js where a malformed newline string would crash Node during boot, hardened the Express server startup so liste…
- Files: .env.sample, package.json, src/lib/ai.js, src/server.js, webapp/src/App.jsx

## 2026-06-11 00:21:02. UTC
- Request: Build a Telegram Mini App called QuickPoll Rewards. It should be a mobile-first Telegram Mini App for creating polls, quizzes, and community voting campaigns where users can earn points for participating. The app should…
- Summary: Built the first complete QuickPoll Rewards version as a Telegram Mini App with grammY bot commands, Express API, React webapp, MongoDB persistence with safe in-memory fallback, duplicate-vote protection, rewards, leader…
- Files: .env.sample, DOCS.md, README.md, package.json, project.json, src/bot.js, src/commands/admin.js, src/commands/app.js, src/commands/createpoll.js, src/commands/help.js, src/commands/leaderboard.js, src/commands/loader.js, src/commands/reset.js, src/commands/rew…

