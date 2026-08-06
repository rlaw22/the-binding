#!/usr/bin/env python3
"""Push large files to GitHub via curl + temp file approach."""
import json, subprocess, base64, os, sys

TOKEN = open('/data/workspace/the-binding/.github-token').read().strip()
REPO = 'rlaw22/the-binding'
API = f'https://api.github.com/repos/{REPO}'
MSG = 'feat: game mode system - 23 features x 3 modes (storyline/campaign/digital_dm)'
LOCAL_DIR = '/data/workspace/the-binding'

FILES = ['public/index.html', 'package-lock.json']

for filepath in FILES:
    full_local = os.path.join(LOCAL_DIR, filepath)
    
    # Read and base64 encode
    with open(full_local, 'rb') as f:
        content_b64 = base64.b64encode(f.read()).decode('ascii')
    
    # Get existing SHA via curl
    sha_result = subprocess.run(
        ['curl', '-s',
         '-H', f'Authorization: Bearer {TOKEN}',
         '-H', 'Accept: application/vnd.github+json',
         f'{API}/contents/{filepath}'],
        capture_output=True, text=True
    )
    sha = ''
    try:
        sha_data = json.loads(sha_result.stdout)
        sha = sha_data.get('sha', '')
    except:
        pass
    
    # Build payload
    payload = {'message': MSG, 'content': content_b64, 'branch': 'main'}
    if sha:
        payload['sha'] = sha
        print(f'Updating {filepath} (SHA: {sha[:8]}...)...')
    else:
        print(f'Creating {filepath}...')
    
    # Write payload to temp file
    tmpfile = f'/tmp/push_{os.path.basename(filepath)}.json'
    with open(tmpfile, 'w') as f:
        json.dump(payload, f)
    
    # curl with @file - no large args on command line
    result = subprocess.run(
        ['curl', '-s', '-X', 'PUT',
         '-H', f'Authorization: Bearer {TOKEN}',
         '-H', 'Accept: application/vnd.github+json',
         '-H', 'Content-Type: application/json',
         '--data-binary', f'@{tmpfile}',
         f'{API}/contents/{filepath}'],
        capture_output=True, text=True
    )
    
    os.unlink(tmpfile)
    
    try:
        resp = json.loads(result.stdout)
        if 'content' in resp:
            print(f'  OK: {resp["content"].get("path", "?")}')
        elif 'message' in resp:
            print(f'  ERROR: {resp["message"]}')
            if 'errors' in resp:
                for e in resp['errors']:
                    print(f'    - {e}')
        else:
            print(f'  Response: {result.stdout[:300]}')
    except Exception as e:
        print(f'  Parse error: {e}')
        print(f'  Raw: {result.stdout[:300]}')

print()
print('Done!')
