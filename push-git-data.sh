#!/bin/bash
# Push large files via GitHub Git Data API (blob + tree + commit + ref)
# This avoids the Contents API's payload size issues.
set -e

TOKEN=$(cat /data/workspace/the-binding/.github-token)
REPO="rlaw22/the-binding"
API="https://api.github.com/repos/$REPO"
AUTH="Authorization: Bearer $TOKEN"
ACCEPT="Accept: application/vnd.github+json"
CT="Content-Type: application/json"
LOCAL="/data/workspace/the-binding"
MSG="feat: game mode system - 23 features x 3 modes (storyline/campaign/digital_dm)"

# Step 1: Get current main HEAD SHA
echo "1. Getting current main ref..."
REF_RESP=$(curl -s -H "$AUTH" -H "$ACCEPT" "$API/git/refs/heads/main")
MAIN_SHA=$(echo "$REF_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['object']['sha'])")
echo "   HEAD: $MAIN_SHA"

# Step 2: Get the tree SHA from the current commit
echo "2. Getting commit tree..."
COMMIT_RESP=$(curl -s -H "$AUTH" -H "$ACCEPT" "$API/git/commits/$MAIN_SHA")
TREE_SHA=$(echo "$COMMIT_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['tree']['sha'])")
echo "   Tree: $TREE_SHA"

# Step 3: Create blobs for the two large files
echo "3. Creating blobs..."

# public/index.html
echo "   Encoding public/index.html..."
HTML_B64=$(base64 -w0 "$LOCAL/public/index.html")
echo "   Creating blob (size: ${#HTML_B64} chars base64)..."
BLOB1_RESP=$(curl -s -X POST -H "$AUTH" -H "$ACCEPT" -H "$CT" \
  -d "$(python3 -c "import json; print(json.dumps({'content':'$HTML_B64','encoding':'base64'}))")" \
  "$API/git/blobs")
# Use a temp file approach for the JSON body
python3 -c "
import json, base64, subprocess, sys
with open('$LOCAL/public/index.html','rb') as f:
    b64 = base64.b64encode(f.read()).decode()
payload = json.dumps({'content': b64, 'encoding': 'base64'})
with open('/tmp/blob1.json','w') as f:
    f.write(payload)
print('   Wrote blob payload:', len(payload), 'bytes')
"
BLOB1_RESP=$(curl -s -X POST -H "$AUTH" -H "$ACCEPT" -H "$CT" \
  --data-binary @/tmp/blob1.json \
  "$API/git/blobs")
BLOB1_SHA=$(echo "$BLOB1_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['sha'])")
echo "   Blob 1 (index.html): $BLOB1_SHA"

# package-lock.json
echo "   Encoding package-lock.json..."
python3 -c "
import json, base64
with open('$LOCAL/package-lock.json','rb') as f:
    b64 = base64.b64encode(f.read()).decode()
payload = json.dumps({'content': b64, 'encoding': 'base64'})
with open('/tmp/blob2.json','w') as f:
    f.write(payload)
print('   Wrote blob payload:', len(payload), 'bytes')
"
BLOB2_RESP=$(curl -s -X POST -H "$AUTH" -H "$ACCEPT" -H "$CT" \
  --data-binary @/tmp/blob2.json \
  "$API/git/blobs")
BLOB2_SHA=$(echo "$BLOB2_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['sha'])")
echo "   Blob 2 (package-lock.json): $BLOB2_SHA"

# Step 4: Create a new tree with both files
echo "4. Creating new tree..."
python3 -c "
import json
tree = [
    {'path': 'public/index.html', 'mode': '100644', 'type': 'blob', 'sha': '$BLOB1_SHA'},
    {'path': 'package-lock.json', 'mode': '100644', 'type': 'blob', 'sha': '$BLOB2_SHA'}
]
payload = {'base_tree': '$TREE_SHA', 'tree': tree}
with open('/tmp/tree.json','w') as f:
    json.dump(payload, f)
print('   Wrote tree payload')
"
TREE_RESP=$(curl -s -X POST -H "$AUTH" -H "$ACCEPT" -H "$CT" \
  --data-binary @/tmp/tree.json \
  "$API/git/trees")
NEW_TREE_SHA=$(echo "$TREE_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['sha'])")
echo "   New tree: $NEW_TREE_SHA"

# Step 5: Create a commit
echo "5. Creating commit..."
python3 -c "
import json
payload = {'message': '$MSG', 'tree': '$NEW_TREE_SHA', 'parents': ['$MAIN_SHA']}
with open('/tmp/commit.json','w') as f:
    json.dump(payload, f)
print('   Wrote commit payload')
"
COMMIT_RESP=$(curl -s -X POST -H "$AUTH" -H "$ACCEPT" -H "$CT" \
  --data-binary @/tmp/commit.json \
  "$API/git/commits")
NEW_COMMIT_SHA=$(echo "$COMMIT_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['sha'])")
echo "   New commit: $NEW_COMMIT_SHA"

# Step 6: Update the ref
echo "6. Updating main ref..."
python3 -c "
import json
payload = {'sha': '$NEW_COMMIT_SHA', 'force': False}
with open('/tmp/ref.json','w') as f:
    json.dump(payload, f)
print('   Wrote ref payload')
"
REF_UPDATE=$(curl -s -X PATCH -H "$AUTH" -H "$ACCEPT" -H "$CT" \
  --data-binary @/tmp/ref.json \
  "$API/git/refs/heads/main")
echo "   Response: $(echo $REF_UPDATE | head -c 200)"

echo ""
echo "=== DONE! ==="
echo "All 8 files now pushed to https://github.com/$REPO"
echo "Render will auto-deploy to https://the-binding.onrender.com/"

# Cleanup
rm -f /tmp/blob1.json /tmp/blob2.json /tmp/tree.json /tmp/commit.json /tmp/ref.json
