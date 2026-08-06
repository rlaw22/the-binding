#!/usr/bin/env python3
"""Push large files to GitHub via Git Data API (blob→tree→commit→ref).
Writes payloads to temp files so curl never gets oversized arguments."""
import json, subprocess, base64, os, sys, tempfile

TOKEN_FILE = '/data/workspace/the-binding/.github-token'
TOKEN = open(TOKEN_FILE).read().strip()
REPO = 'rlaw22/the-binding'
API = f'https://api.github.com/repos/{REPO}'
MSG = 'feat: update public/index.html and package-lock.json for game mode system'
LOCAL = '/data/workspace/the-binding'

LARGE_FILES = ['public/index.html', 'package-lock.json']

def curl_json(method, path, payload_file=None):
    """Make a GitHub API call using curl, optionally with a JSON body from file."""
    url = f'{API}{path}' if path.startswith('/') else path
    cmd = [
        'curl', '-s', '-X', method,
        '-H', f'Authorization: Bearer {TOKEN}',
        '-H', 'Accept: application/vnd.github+json',
    ]
    if payload_file:
        cmd += ['-H', 'Content-Type: application/json', '--data-binary', f'@{payload_file}']
    cmd.append(url)
    result = subprocess.run(cmd, capture_output=True, text=True)
    try:
        return json.loads(result.stdout)
    except:
        print(f'  RAW RESPONSE: {result.stdout[:500]}')
        return None

# Step 1: Get current main HEAD
print('1. Getting main ref...')
ref = curl_json('GET', '/git/refs/heads/main')
if not ref or 'object' not in ref:
    print(f'ERROR: Could not get ref. Response: {ref}')
    sys.exit(1)
main_sha = ref['object']['sha']
print(f'   HEAD: {main_sha}')

# Step 2: Get current tree
print('2. Getting commit tree...')
commit = curl_json('GET', f'/git/commits/{main_sha}')
if not commit or 'tree' not in commit:
    print(f'ERROR: Could not get commit. Response: {commit}')
    sys.exit(1)
tree_sha = commit['tree']['sha']
print(f'   Tree: {tree_sha}')

# Step 3: Create blobs for large files
blob_entries = []
for filepath in LARGE_FILES:
    full_path = os.path.join(LOCAL, filepath)
    with open(full_path, 'rb') as f:
        b64 = base64.b64encode(f.read()).decode()
    
    payload = {'content': b64, 'encoding': 'base64'}
    tmp = tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False)
    json.dump(payload, tmp)
    tmp.close()
    
    size_kb = os.path.getsize(full_path) / 1024
    print(f'3. Creating blob for {filepath} ({size_kb:.0f}KB)...')
    blob = curl_json('POST', '/git/blobs', tmp.name)
    os.unlink(tmp.name)
    
    if not blob or 'sha' not in blob:
        print(f'ERROR: Could not create blob for {filepath}. Response: {blob}')
        sys.exit(1)
    print(f'   Blob: {blob["sha"]}')
    blob_entries.append({'path': filepath, 'sha': blob['sha']})

# Step 4: Create new tree
tree_payload = {
    'base_tree': tree_sha,
    'tree': [
        {'path': e['path'], 'mode': '100644', 'type': 'blob', 'sha': e['sha']}
        for e in blob_entries
    ]
}
tmp = tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False)
json.dump(tree_payload, tmp)
tmp.close()

print('4. Creating new tree...')
new_tree = curl_json('POST', '/git/trees', tmp.name)
os.unlink(tmp.name)

if not new_tree or 'sha' not in new_tree:
    print(f'ERROR: Could not create tree. Response: {new_tree}')
    sys.exit(1)
print(f'   Tree: {new_tree["sha"]}')

# Step 5: Create commit
commit_payload = {
    'message': MSG,
    'tree': new_tree['sha'],
    'parents': [main_sha]
}
tmp = tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False)
json.dump(commit_payload, tmp)
tmp.close()

print('5. Creating commit...')
new_commit = curl_json('POST', '/git/commits', tmp.name)
os.unlink(tmp.name)

if not new_commit or 'sha' not in new_commit:
    print(f'ERROR: Could not create commit. Response: {new_commit}')
    sys.exit(1)
print(f'   Commit: {new_commit["sha"]}')

# Step 6: Update ref
ref_payload = {'sha': new_commit['sha'], 'force': False}
tmp = tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False)
json.dump(ref_payload, tmp)
tmp.close()

print('6. Updating main ref...')
result = curl_json('PATCH', '/git/refs/heads/main', tmp.name)
os.unlink(tmp.name)

if result and 'object' in result:
    print(f'   Updated! New HEAD: {result["object"]["sha"][:12]}...')
    print()
    print('=== SUCCESS! All files pushed. ===')
    print(f'https://github.com/{REPO}')
else:
    print(f'ERROR: Could not update ref. Response: {result}')
    sys.exit(1)
