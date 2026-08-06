#!/bin/bash
set -e
TOKEN=$(cat /data/workspace/the-binding/.github-token)
REPO="rlaw22/the-binding"
API="https://api.github.com/repos/$REPO"
MSG="feat: game mode system - 23 features x 3 modes (storyline/campaign/digital_dm)"
AUTH="Authorization: Bearer $TOKEN"

cd /data/workspace/the-binding

push_file() {
  local LOCAL="$1"
  local REMOTE="$2"
  local B64=$(base64 -w0 "$LOCAL")
  
  local EXISTING=$(curl -s -H "$AUTH" -H "Accept: application/vnd.github+json" "$API/contents/$REMOTE" 2>/dev/null)
  local SHA=$(echo "$EXISTING" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('sha',''))" 2>/dev/null || echo "")
  
  if [ -n "$SHA" ] && [ "$SHA" != "None" ] && [ "$SHA" != "" ]; then
    echo "Updating $REMOTE..."
    local RESULT=$(curl -s -X PUT -H "$AUTH" -H "Accept: application/vnd.github+json" \
      "$API/contents/$REMOTE" \
      -d "{\"message\":\"$MSG\",\"content\":\"$B64\",\"sha\":\"$SHA\",\"branch\":\"main\"}")
    echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print('  OK:', d.get('content',{}).get('path','?'))" 2>/dev/null || echo "  Response: $(echo $RESULT | head -c 200)"
  else
    echo "Creating $REMOTE..."
    local RESULT=$(curl -s -X PUT -H "$AUTH" -H "Accept: application/vnd.github+json" \
      "$API/contents/$REMOTE" \
      -d "{\"message\":\"$MSG\",\"content\":\"$B64\",\"branch\":\"main\"}")
    echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print('  OK:', d.get('content',{}).get('path','?'))" 2>/dev/null || echo "  Response: $(echo $RESULT | head -c 200)"
  fi
}

echo "=== Pushing game mode files to GitHub ==="
echo "Repo: $REPO"
echo "Message: $MSG"
echo ""

push_file "src/game-mode/index.js" "src/game-mode/index.js"
push_file "tests/game-mode.test.js" "tests/game-mode.test.js"
push_file "src/api/server.js" "src/api/server.js"
push_file "public/index.html" "public/index.html"
push_file "STATUS.md" "STATUS.md"
push_file "docs/HANDOFF.md" "docs/HANDOFF.md"
push_file "package.json" "package.json"
push_file "package-lock.json" "package-lock.json"

echo ""
echo "=== Done! ==="
echo "Check: https://github.com/rlaw22/the-binding"
echo "Render will auto-deploy to https://the-binding.onrender.com/"
