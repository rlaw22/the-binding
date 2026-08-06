#!/bin/bash
# Push large files using @file approach to avoid argument list too long
set -e

TOKEN=$(cat /data/workspace/the-binding/.github-token)
REPO="rlaw22/the-binding"
API="https://api.github.com/repos/$REPO"
MSG="feat: game mode system - 23 features x 3 modes (storyline/campaign/digital_dm)"
AUTH="Authorization: Bearer $TOKEN"

cd /data/workspace/the-binding

push_large_file() {
  local LOCAL="$1"
  local REMOTE="$2"
  local B64=$(base64 -w0 "$LOCAL")
  
  # Get existing SHA
  local EXISTING=$(curl -s -H "$AUTH" -H "Accept: application/vnd.github+json" "$API/contents/$REMOTE" 2>/dev/null)
  local SHA=$(echo "$EXISTING" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('sha',''))" 2>/dev/null || echo "")
  
  # Write JSON payload to temp file
  local TMPFILE="/tmp/push-payload-$RANDOM.json"
  if [ -n "$SHA" ] && [ "$SHA" != "None" ] && [ "$SHA" != "" ]; then
    echo "Updating $REMOTE (SHA: $SHA)..."
    python3 -c "
import json, sys
payload = {'message': '''$MSG''', 'content': '''$B64''', 'sha': '''$SHA''', 'branch': 'main'}
with open('$TMPFILE', 'w') as f:
    json.dump(payload, f)
"
    local RESULT=$(curl -s -X PUT -H "$AUTH" -H "Accept: application/vnd.github+json" \
      -H "Content-Type: application/json" \
      --data-binary "@$TMPFILE" \
      "$API/contents/$REMOTE")
    echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print('  OK:', d.get('content',{}).get('path','?'))" 2>/dev/null || echo "  ERROR: $(echo $RESULT | head -c 300)"
  else
    echo "Creating $REMOTE..."
    python3 -c "
import json, sys
payload = {'message': '''$MSG''', 'content': '''$B64''', 'branch': 'main'}
with open('$TMPFILE', 'w') as f:
    json.dump(payload, f)
"
    local RESULT=$(curl -s -X PUT -H "$AUTH" -H "Accept: application/vnd.github+json" \
      -H "Content-Type: application/json" \
      --data-binary "@$TMPFILE" \
      "$API/contents/$REMOTE")
    echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print('  OK:', d.get('content',{}).get('path','?'))" 2>/dev/null || echo "  ERROR: $(echo $RESULT | head -c 300)"
  fi
  rm -f "$TMPFILE"
}

echo "=== Pushing large files ==="
push_large_file "public/index.html" "public/index.html"
push_large_file "package-lock.json" "package-lock.json"

echo ""
echo "=== Done ==="
