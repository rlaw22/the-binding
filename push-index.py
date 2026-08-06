#!/usr/bin/env python3
"""Push public/index.html to GitHub via Git Data API."""
import json, subprocess, base64, os, sys, tempfile

TOKEN = open('/data/workspace/the-binding/.github-token').read().strip()
REPO = 'rlaw22/the-binding'
API = f'https://api.github.com/repos/{REPO}'
MSG = 'feat: hide text input/send button in Storyline mode - UI guard + sendFree guard + action btn resize'
LOCAL = '/data/workspace/the-binding'

def curl_json(method, path, payload_file=None):
    url = f'{API}{path}' if path.startswith('/') else path
    cmd = ['curl', '-s', '-X', method,
           '-H', f'Authorization: Bearer {TOKEN}',
           '-H', 'Accept: application/vnd.github+json']
    if payload_file:
        cmd += ['-H', 'Content-Type: application/json', '--data-binary', f'@{payload_file}']
    cmd.append(url)
    result = subprocess.run(cmd, capture_output=True, text=True)
    try:
        return json.loads(result.stdout)
    except:
        print(f'  RAW: {result.stdout[:500]}')
        return None

# Step 1: Get current main
print('1. Getting main ref...')
ref = curl_json('GET', '/git/refs/heads/main')
if not ref or 'object' not in ref:
    print(f'ERROR: {ref}')
    sys.exit(1)
main_sha = ref['object']['sha']
print(f'   HEAD: {main_sha}')

# Step 2: Get current tree
print('2. Getting commit tree...')
commit = curl_json('GET', f'/git/commits/{main_sha}')
tree_sha = commit['tree']['sha']
print(f'   Tree: {tree_sha}')

# Step 3: Create blob for index.html
filepath = 'public/index.html'
full_path = os.path.join(LOCAL, filepath)
with open(full_path, 'rb') as f:
    b64 = base64.b64encode(f.read()).decode()
payload = {'content': b64, 'encoding': 'base64'}
tmp = tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False)
json.dump(payload, tmp)
tmp.close()
print(f'3. Creating blob for {filepath} ({os.path.getsize(full_path)//1024}KB)...')
blob = curl_json('POST', '/git/blobs', tmp.name)
os.unlink(tmp.name)
if not blob or 'sha' not in blob:
    print(f'ERROR: {blob}')
    sys.exit(1)
print(f'   Blob: {blob["sha"]}')

# Step 4: Create tree
tree_payload = {
    'base_tree': tree_sha,
    'tree': [{'path': filepath, 'mode': '100644', 'type': 'blob', 'sha': blob['sha']}]
}
tmp = tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False)
json.dump(tree_payload, tmp)
tmp.close()
print('4. Creating new tree...')
new_tree = curl_json('POST', '/git/trees', tmp.name)
os.unlink(tmp.name)
print(f'   Tree: {new_tree["sha"]}')

# Step 5: Create commit
commit_payload = {'message': MSG, 'tree': new_tree['sha'], 'parents': [main_sha]}
tmp = tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False)
json.dump(commit_payload, tmp)
tmp.close()
print('5. Creating commit...')
new_commit = curl_json('POST', '/git/commits', tmp.name)
os.unlink(tmp.name)
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
    print('=== SUCCESS! ===')
    print(f'https://github.com/{REPO}')
    print('Render will auto-deploy to https://the-binding.onrender.com/')
else:
    print(f'ERROR: {result}')
    sys.exit(1)
