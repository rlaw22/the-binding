#!/usr/bin/env python3
"""Push large files via GitHub Git Data API (blob + tree + commit + ref update)."""
import json, subprocess, base64, os, sys, urllib.request, urllib.error

TOKEN = open('/data/workspace/the-binding/.github-token').read().strip()
REPO = 'rlaw22/the-binding'
API = f'https://api.github.com/repos/{REPO}'
MSG = 'feat: game mode system - 23 features x 3 modes (storyline/campaign/digital_dm)'
LOCAL_DIR = '/data/workspace/the-binding'

LARGE_FILES = [
    'public/index.html',
    'package-lock.json',
]

def api_call(method, path, data=None):
    url = f'{API}{path}' if path.startswith('/') else path
    headers = {
        'Authorization': f'Bearer {TOKEN}',
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'the-binding-deploy'
    }
    body = json.dumps(data).encode() if data else None
    if body:
        headers['Content-Type'] = 'application/json'
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        resp = urllib.request.urlopen(req)
        return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        err_body = e.read().decode()
        print(f'  HTTP {e.code}: {err_body[:300]}')
        return None

def get_main_ref():
    print('1. Getting main branch ref...')
    result = api_call('GET', '/git/refs/heads/main')
    if result:
        sha = result['object']['sha']
        print(f'   SHA: {sha}')
        return sha
    return None

def get_commit(sha):
    print(f'2. Getting commit {sha[:8]}...')
    result = api_call('GET', f'/git/commits/{sha}')
    if result:
        tree_sha = result['tree']['sha']
        print(f'   Tree: {tree_sha}')
        return tree_sha
    return None

def create_blob(filepath):
    full_path = os.path.join(LOCAL_DIR, filepath)
    with open(full_path, 'rb') as f:
        content = base64.b64encode(f.read()).decode('ascii')
    print(f'3. Creating blob for {filepath} ({os.path.getsize(full_path)} bytes)...')
    result = api_call('POST', '/git/blobs', {'content': content, 'encoding': 'base64'})
    if result:
        print(f'   Blob SHA: {result["sha"]}')
        return result['sha']
    return None

def create_tree(base_tree_sha, blob_entries):
    print(f'4. Creating new tree with {len(blob_entries)} entries...')
    tree = []
    for entry in blob_entries:
        tree.append({
            'path': entry['path'],
            'mode': '100644',
            'type': 'blob',
            'sha': entry['sha']
        })
    result = api_call('POST', '/git/trees', {'base_tree': base_tree_sha, 'tree': tree})
    if result:
        print(f'   New tree SHA: {result["sha"]}')
        return result['sha']
    return None

def create_commit(tree_sha, parent_sha):
    print(f'5. Creating commit...')
    result = api_call('POST', '/git/commits', {
        'message': MSG,
        'tree': tree_sha,
        'parents': [parent_sha]
    })
    if result:
        print(f'   Commit SHA: {result["sha"]}')
        return result['sha']
    return None

def update_ref(commit_sha):
    print(f'6. Updating main ref to {commit_sha[:8]}...')
    result = api_call('PATCH', '/git/refs/heads/main', {'sha': commit_sha, 'force': False})
    if result:
        print(f'   Updated! Object: {result["object"]["sha"][:8]}')
        return True
    return False

if __name__ == '__main__':
    print(f'Pushing large files to {REPO} via Git Data API...')
    print()

    # Step 1: Get current main
    main_sha = get_main_ref()
    if not main_sha:
        print('ERROR: Could not get main ref')
        sys.exit(1)

    # Step 2: Get the current commit's tree
    tree_sha = get_commit(main_sha)
    if not tree_sha:
        print('ERROR: Could not get commit tree')
        sys.exit(1)

    # Step 3: Create blobs for each large file
    entries = []
    for filepath in LARGE_FILES:
        blob_sha = create_blob(filepath)
        if not blob_sha:
            print(f'ERROR: Could not create blob for {filepath}')
            sys.exit(1)
        entries.append({'path': filepath, 'sha': blob_sha})

    # Step 4: Create new tree (based on current tree, replacing only our files)
    new_tree_sha = create_tree(tree_sha, entries)
    if not new_tree_sha:
        print('ERROR: Could not create tree')
        sys.exit(1)

    # Step 5: Create commit
    commit_sha = create_commit(new_tree_sha, main_sha)
    if not commit_sha:
        print('ERROR: Could not create commit')
        sys.exit(1)

    # Step 6: Update ref
    if update_ref(commit_sha):
        print()
        print('=== SUCCESS! ===')
        print(f'Check: https://github.com/{REPO}')
        print('Render will auto-deploy to https://the-binding.onrender.com/')
    else:
        print('ERROR: Could not update ref')
        sys.exit(1)
