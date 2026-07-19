#!/usr/bin/env python3
"""Fetch monster descriptions from D&D 5e API and merge into already-enriched srd-monsters.json"""

import json
import urllib.request
import time
import sys
import re

MONSTERS_FILE = "/workspace/the-binding/src/data/monsters/srd-monsters.json"
DOCS_FILE = "/workspace/the-binding/public/docs/srd-monsters.json"

def slugify(name):
    """Convert monster name to dnd5eapi slug."""
    s = name.lower().strip()
    s = re.sub(r'\(.*?\)', '', s)  # remove parentheticals
    s = s.replace("'", "").replace("/", "-")
    s = re.sub(r'[^a-z0-9\s-]', '', s)
    s = re.sub(r'\s+', '-', s.strip())
    return s

def fetch_5eapi_descriptions():
    """Fetch descriptions from dnd5eapi.co."""
    all_descs = {}
    # Get the monster index list
    url = "https://www.dnd5eapi.co/api/2014/monsters"
    req = urllib.request.Request(url, headers={"User-Agent": "TheBinding/1.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read())
    
    # API returns {"count": N, "results": [...]}
    index = data.get("results", data) if isinstance(data, dict) else data
    print(f"  D&D 5e API has {len(index)} monsters indexed")
    
    # Fetch each monster individually for the desc field
    fetched = 0
    for entry in index:
        name = entry["name"]
        try:
            mreq = urllib.request.Request(
                f"https://www.dnd5eapi.co{entry['url']}", 
                headers={"User-Agent": "TheBinding/1.0"}
            )
            with urllib.request.urlopen(mreq, timeout=15) as resp:
                mdata = json.loads(resp.read())
            desc = mdata.get("desc", "").strip()
            if desc:
                all_descs[name.lower()] = desc
                fetched += 1
            if fetched % 50 == 0 and fetched > 0:
                print(f"  ... fetched {fetched} descriptions so far")
            time.sleep(0.15)  # rate limit
        except Exception as e:
            pass  # skip errors silently
    
    print(f"  Got {len(all_descs)} descriptions from D&D 5e API")
    return all_descs

def main():
    print("Loading current monster database (with Open5e descs)...")
    with open(MONSTERS_FILE, "r") as f:
        db = json.load(f)
    
    monsters = db["monsters"]
    
    # Count current coverage
    has_desc = sum(1 for m in monsters if m.get("desc", "").strip())
    print(f"  {has_desc}/{len(monsters)} already have descriptions")
    
    # Fetch from D&D 5e API
    print("\nFetching from D&D 5e API...")
    api_descs = fetch_5eapi_descriptions()
    
    # Merge - only fill in missing descriptions
    newly_filled = 0
    still_missing = []
    for monster in monsters:
        if monster.get("desc", "").strip():
            continue  # already has a description
        name = monster["name"].strip().lower()
        if name in api_descs:
            monster["desc"] = api_descs[name]
            newly_filled += 1
        else:
            # Try fuzzy
            found = False
            for api_name, desc in api_descs.items():
                if name == api_name or name in api_name or api_name in name:
                    monster["desc"] = desc
                    newly_filled += 1
                    found = True
                    break
            if not found:
                still_missing.append(monster["name"])
    
    total_desc = sum(1 for m in monsters if m.get("desc", "").strip())
    print(f"\n  Newly filled: {newly_filled}")
    print(f"  Total with descriptions: {total_desc}/{len(monsters)}")
    print(f"  Still missing: {len(still_missing)}")
    if still_missing:
        print(f"  Missing: {', '.join(still_missing[:20])}")
        if len(still_missing) > 20:
            print(f"  ... and {len(still_missing) - 20} more")
    
    # Update metadata
    db["meta"]["description_source"] = "Open5e API + D&D 5e API"
    db["meta"]["description_license"] = "Open Gaming License (OGL) + CC-BY-4.0"
    db["meta"]["descriptions_count"] = total_desc
    db["meta"]["descriptions_missing"] = len(still_missing)
    
    # Save
    print(f"\nSaving to {MONSTERS_FILE}...")
    with open(MONSTERS_FILE, "w") as f:
        json.dump(db, f, indent=2, ensure_ascii=False)
    
    print(f"Saving to {DOCS_FILE}...")
    with open(DOCS_FILE, "w") as f:
        json.dump(db, f, indent=2, ensure_ascii=False)
    
    print("\nDone!")
    return total_desc, len(still_missing)

if __name__ == "__main__":
    main()
