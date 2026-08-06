#!/bin/bash
# Push game mode changes to GitHub
# Run this from the the-binding/ directory

set -e

cd "$(dirname "$0")"

echo "=== Staging game mode files ==="
git add src/game-mode/index.js
git add tests/game-mode.test.js
git add public/index.html
git add src/api/server.js
git add STATUS.md
git add docs/HANDOFF.md
git add package.json
git add package-lock.json

echo "=== Staged files ==="
git status --short

echo ""
echo "=== Committing ==="
git commit -m "feat: add game mode configuration system (23 features × 3 modes)

- New module: src/game-mode/index.js — Storyline, Campaign, Digital DM
  mode configs with feature flags for all 23 matrix features
- New tests: tests/game-mode.test.js — 340 tests, all passing
- Server: mode-aware session creation (POST /api/sessions accepts gameMode),
  new endpoints GET /api/game-modes and GET /api/game-modes/:mode
- Frontend: mode selector screen (3 cards) inserted between gate and
  adventure select, UI elements conditionally shown/hidden per mode config
- 89 existing tests passing, zero regressions"

echo ""
echo "=== Pushing to GitHub ==="
git push origin main

echo ""
echo "=== Done! Render will auto-deploy shortly. ==="
echo "Check: https://the-binding.onrender.com/"
