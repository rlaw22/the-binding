#!/usr/bin/env python3
"""Fetch monster descriptions from Open5e API and merge into srd-monsters.json"""

import json
import urllib.request
import time
import sys

API_BASE = "https://api.open5e.com/v1/monsters/"
MONSTERS_FILE = "/workspace/the-binding/src/data/monsters/srd-monsters.json"
DOCS_FILE = "/workspace/the-binding/public/docs/srd-monsters.json"

def fetch_all_srd_monsters():
    """Fetch all SRD monsters from Open5e API with descriptions."""
    all_monsters = {}
    url = f"{API_BASE}?document__slug=wotc-srd&limit=100"
    page = 1
    while url:
        print(f"  Fetching page {page}...", end=" ", flush=True)
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "TheBinding/1.0"})
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = json.loads(resp.read())
            results = data.get("results", [])
            print(f"got {len(results)} monsters")
            for m in results:
                name = m.get("name", "").strip()
                desc = m.get("desc", "").strip()
                if name and desc:
                    all_monsters[name.lower()] = desc
            url = data.get("next")
            page += 1
            if url:
                time.sleep(0.3)
        except Exception as e:
            print(f"ERROR: {e}")
            break
    return all_monsters

def main():
    print("Loading local monster database...")
    with open(MONSTERS_FILE, "r") as f:
        db = json.load(f)
    
    monsters = db["monsters"]
    print(f"  Found {len(monsters)} monsters in local DB")
    
    print("\nFetching SRD descriptions from Open5e API...")
    descriptions = fetch_all_srd_monsters()
    print(f"\n  Got descriptions for {len(descriptions)} monsters from Open5e")
    
    matched = 0
    unmatched = []
    for monster in monsters:
        name = monster["name"].strip().lower()
        if name in descriptions:
            monster["desc"] = descriptions[name]
            matched += 1
        else:
            # Fuzzy: check if API name contains our name or vice versa
            found = False
            for api_name, desc in descriptions.items():
                if name == api_name or name in api_name or api_name in name:
                    monster["desc"] = desc
                    matched += 1
                    found = True
                    break
            if not found:
                monster["desc"] = ""
                unmatched.append(monster["name"])
    
    print(f"\n  Matched: {matched}/{len(monsters)}")
    print(f"  Unmatched: {len(unmatched)}")
    if unmatched:
        print(f"  Missing: {', '.join(unmatched[:30])}")
        if len(unmatched) > 30:
            print(f"  ... and {len(unmatched) - 30} more")
    
    db["meta"]["description_source"] = "Open5e API (https://api.open5e.com)"
    db["meta"]["description_license"] = "Open Gaming License (OGL)"
    db["meta"]["descriptions_count"] = matched
    
    print(f"\nSaving to {MONSTERS_FILE}...")
    with open(MONSTERS_FILE, "w") as f:
        json.dump(db, f, indent=2, ensure_ascii=False)
    
    print(f"Saving to {DOCS_FILE}...")
    with open(DOCS_FILE, "w") as f:
        json.dump(db, f, indent=2, ensure_ascii=False)
    
    print("\nDone!")
    return matched, len(unmatched)

if __name__ == "__main__":
    matched, unmatched = main()
    sys.exit(0)
