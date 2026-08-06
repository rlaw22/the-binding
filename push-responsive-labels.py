#!/usr/bin/env python3
"""Push 4 changed files to GitHub via the Git Data API (blob+tree+commit+ref)."""
import base64, json, os, urllib.request, urllib.error

TOKEN = open('.github-token').read().strip()
REPO = 'rlaw22/the-binding'
API = f'https://api.github.com/repos/{REPO}'
AUTH = {'Authorization': f'Bearer {TOKEN}', 'Accept': 'application/vnd.github+json', 'Content-Type': 'application/json'}

def api(method, path, body=None):
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(f'{API}{path}', data=data, headers=AUTH, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        print(f'ERROR {e.code} on {method} {path}: {e.read().decode()[:500]}')
        raise

# Step 1: Get current main HEAD
print('1. Getting main HEAD...')
ref = api('GET', '/git/refs/heads/main')
base_sha = ref['object']['sha']
print(f'   HEAD: {base_sha}')

# Step 2: Create blobs for all 4 files
files = [
    ('src/ai-dm/dm-service.js', 'dm-service.js'),
    ('src/session/message-router.js', 'message-router.js'),
    ('src/api/server.js', 'server.js'),
    ('public/index.html', 'index.html'),
]
blobs = {}
for local, name in files:
    print(f'2. Creating blob for {name}...')
    content = base64.b64encode(open(local, 'rb').read()).decode()
    result = api('POST', '/git/blobs', {'encoding': 'base64', 'content': content})
    blobs[local] = result['sha']
    print(f'   SHA: {result["sha"]}')

# Step 3: Get the base tree SHA
print('3. Getting base tree...')
base_commit = api('GET', f'/git/commits/{base_sha}')
tree_sha = base_commit['tree']['sha']
print(f'   Base tree: {tree_sha}')

# Step 4: Create a new tree with the 4 updated files
print('4. Creating new tree...')
tree_entries = []
for local, _ in files:
    tree_entries.append({
        'path': local,
        'mode': '100644',
        'type': 'blob',
        'sha': blobs[local]
    })
new_tree = api('POST', f'/git/trees', {'base_tree': tree_sha, 'tree': tree_entries})
new_tree_sha = new_tree['sha']
print(f'   New tree: {new_tree_sha}')

# Step 5: Create the commit
msg = 'feat: responsive short labels for storyline buttons\n\n- Server: generateShortLabel() with 90+ verb patterns + noun extraction\n- Server: shortLabel on all action types (content, contextual, exit, AI-generated)\n- Server: shortLabel passthrough via MessageRouter + all 4 server.js mappings\n- Frontend: dual-label buttons (data-full-label / data-short-label)\n- Frontend: two-row grid layout, max 8 buttons, no horizontal scroll\n- Frontend: responsive label switching at 600px breakpoint\n- Frontend: long-press tooltip showing full label on mobile\n- Frontend: client-side generateClientShortLabel() fallback for AI actions'
print('5. Creating commit...')
commit = api('POST', '/git/commits', {
    'message': msg,
    'tree': new_tree_sha,
    'parents': [base_sha]
})
commit_sha = commit['sha']
print(f'   Commit: {commit_sha}')
print(f'   URL: https://github.com/{REPO}/commit/{commit_sha}')

# Step 6: Update the ref
print('6. Updating main ref...')
api('PATCH', '/git/refs/heads/main', {'sha': commit_sha, 'force': False})
print(f'\n✅ Pushed successfully!')
print(f'   https://github.com/{REPO}/commit/{commit_sha}')
