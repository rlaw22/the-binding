# The Binding — Enter the books you love.

An AI-powered interactive fiction game engine. Play through classic novels as an AI Dungeon Master responds to your actions in real-time.

## Play

Visit the deployed URL and click "Begin Adventure" to start.

## Features

- **4-Action System**: 4 AI-generated suggested actions + open-ended text input per turn
- **Multi-Device**: Rejoin from any device with a shareable code or URL
- **Coin Engine**: Earn coins for clever play, tracked across adventures
- **Dracula Adventure**: Full 25-scene, 5-act adventure based on Bram Stoker's Dracula
- **Rule Engine**: Dice rolls, combat, skill checks, and character sheets
- **SSE Real-Time**: Server-Sent Events for instant DM responses through any proxy

## Deploy on Render

1. Fork this repo
2. Go to [render.com](https://render.com) → New → Web Service
3. Connect your GitHub account and select this repo
4. Render will auto-detect the Dockerfile
5. Click "Create Web Service"

## Local Development

```bash
npm install
node server.js
```

Server runs at http://localhost:3001

## Tech Stack

- **Server**: Node.js + Fastify
- **Frontend**: Vanilla HTML/CSS/JS (no framework)
- **Transport**: SSE (Server-Sent Events) + HTTP POST
- **DM**: OpenAI-compatible LLM provider (mock mode for testing)
- **Adventure Engine**: Scene graph with curated backbone + dynamic DM responses
