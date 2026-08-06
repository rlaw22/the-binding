#!/usr/bin/env python3
"""Push large files to GitHub via the Contents API, using temp files for payloads."""
import json, subprocess, base64, os, sys

TOKEN = open('/data/workspace/the-binding/.github-token').read().strip()
REPO = 'rlaw22/the-binding'
API = f'https://api.github.com/repos/{REPO}'
MSG = 'feat: game mode system - 23 features x 3 modes (storyline/campaign/digital_dm)'
AUTH = f'Bearer {TOKEN}'
LOCAL_DIR = '/data/workspace/the-binding'

FILES = [
    'public/index.html',
    'package-lock.json',
]

def get_sha(remote_path):
    """Get the SHA of an existing file on GitHub."""
    result = subprocess.run(
        ['curl', '-s', '-H', f'Authorization: {AUTH}', '-H', 'Accept: application/vnd.github+json',
         f'{API}/contents/{remote_path}'],
        capture_output=True, text=True
    )
    try:
        data = json.loads(result.stdout)
        return data.get('sha', '')
    except:
        return ''

def push_file(local_path, remote_path):
    """Push a single file to GitHub."""
    full_local = os.path.join(LOCAL_DIR, local_path)
    with open(full_local, 'rb') as f:
        content_b64 = base64.b64encode(f.read()).decode('ascii')
    
    sha = get_sha(remote_path)
    
    payload = {'message': MSG, 'content': content_b64, 'branch': 'main'}
    if sha:
        payload['sha'] = sha
        print(f'Updating {remote_path} (SHA: {sha})...')
    else:
        print(f'Creating {remote_path}...')
    
    # Write payload to temp file
    tmpfile = f'/tmp/push_{os.path.basename(remote_path)}.json'
    with open(tmpfile, 'w') as f:
        json.dump(payload, f)
    
    # Use curl with @file to avoid argument size limit
    result = subprocess.run(
        ['curl', '-s', '-X', 'PUT',
         '-H', f'Authorization: {AUTH}',
         '-H', 'Accept: application/vnd.github+json',
         '-H', 'Content-Type: application/json',
         '--data-binary', f'@{tmpfile}',
         f'{API}/contents/{remote_path}'],
        capture_output=True, text=True
    )
    
    os.unlink(tmpfile)
    
    try:
        resp = json.loads(result.stdout)
        if 'content' in resp:
            print(f'  OK: {resp["content"].get("path", "?")}')
        elif 'message' in resp:
            print(f'  ERROR: {resp["message"]}')
        else:
            print(f'  Response: {result.stdout[:300]}')
    except:
        print(f'  Raw: {result.stdout[:300]}')

if __name__ == '__main__':
    print(f'Pushing large files to {REPO}...')
    for filepath in FILES:
        push_file(filepath, filepath)
    print('Done!')
