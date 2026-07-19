#!/usr/bin/env python3
"""Phase 2: Try Fandom wiki, D&D 5e API other fields, and SRD text scraping for remaining 173 monsters"""
import json, urllib.request, urllib.parse, time, re, sys, html

MONSTERS_FILE = "/workspace/the-binding/src/data/monsters/srd-monsters.json"
DOCS_FILE = "/workspace/the-binding/public/docs/srd-monsters.json"

def load_db():
    with open(MONSTERS_FILE) as f:
        return json.load(f)

def save_db(db):
    with open(MONSTERS_FILE, "w") as f:
        json.dump(db, f, indent=2, ensure_ascii=False)
    with open(DOCS_FILE, "w") as f:
        json.dump(db, f, indent=2, ensure_ascii=False)

def normalize(s):
    return re.sub(r'\s+', ' ', s.lower().strip().replace('"','').replace("'","")).split('(')[0].strip()

def strip_html(text):
    text = re.sub(r'<[^>]+>', ' ', text)
    text = html.unescape(text)
    return re.sub(r'\s+', ' ', text).strip()

def fetch_url(url, timeout=15):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (compatible; TheBinding/1.0)"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read().decode('utf-8', errors='replace')

def try_fandom_wiki(missing_names):
    """Try Fandom D&D wiki for monster pages"""
    print(f"\n=== Trying Fandom D&D Wiki for {len(missing_names)} monsters ===")
    descs = {}
    base = "https://forgottenrealms.fandom.com/wiki/"
    
    for i, name in enumerate(missing_names):
        if i % 20 == 0 and i > 0:
            print(f"  ... tried {i}/{len(missing_names)}, found {len(descs)}")
        try:
            # Try various name formats
            wiki_name = name.replace(' ', '_').replace('/', '_')
            url = base + urllib.parse.quote(wiki_name, safe='_')
            body = fetch_url(url)
            
            # Extract first paragraph from article content
            # Look for the article body
            match = re.search(r'<div class="mw-parser-output">(.*?)</div>\s*</div>', body, re.DOTALL)
            if not match:
                continue
            content = match.group(1)
            
            # Find first <p> tag with actual text
            paragraphs = re.findall(r'<p[^>]*>(.*?)</p>', content, re.DOTALL)
            for p in paragraphs:
                text = strip_html(p).strip()
                if len(text) > 50 and 'may refer to' not in text.lower():
                    descs[name] = text
                    break
            time.sleep(0.3)
        except Exception as e:
            pass  # 404 or other error, skip
    
    print(f"  Found {len(descs)} descriptions from Fandom")
    return descs

def try_5eapi_extra_fields(missing_names):
    """Try D&D 5e API but look for fields other than 'desc'"""
    print(f"\n=== Trying D&D 5e API extra fields ===")
    descs = {}
    try:
        url = "https://www.dnd5eapi.co/api/2014/monsters"
        body = fetch_url(url, timeout=30)
        data = json.loads(body)
        index = data.get("results", data) if isinstance(data, dict) else data
        print(f"  API has {len(index)} monsters indexed")
        
        # Build name->url map
        name_map = {}
        for entry in index:
            name_map[entry["name"].lower()] = entry["url"]
        
        checked = 0
        for name in missing_names:
            key = normalize(name)
            if key in name_map:
                try:
                    mbody = fetch_url(f"https://www.dnd5eapi.co{name_map[key]}")
                    mdata = json.loads(mbody)
                    
                    # Check all text fields
                    desc_parts = []
                    for field in ['desc', 'special_abilities', 'actions', 'legendary_actions', 'reactions']:
                        val = mdata.get(field)
                        if isinstance(val, str) and val.strip():
                            desc_parts.append(val.strip())
                        elif isinstance(val, list):
                            for item in val:
                                if isinstance(item, dict):
                                    d = item.get('desc', '')
                                    if d:
                                        desc_parts.append(f"{item.get('name','')}: {d}")
                    
                    if desc_parts:
                        descs[name] = " ".join(desc_parts)
                        checked += 1
                    time.sleep(0.1)
                except:
                    pass
        print(f"  Got {checked} monsters with extra field data")
    except Exception as e:
        print(f"  Error: {e}")
    return descs

def try_wikipedia_more(missing_names):
    """Try Wikipedia for more monsters with different URL patterns"""
    print(f"\n=== Trying more Wikipedia patterns ===")
    descs = {}
    
    # Try these specific patterns
    patterns = [
        "https://en.wikipedia.org/wiki/{name}_(Dungeons_%26_Dragons)",
        "https://en.wikipedia.org/wiki/{name}",
        "https://en.wikipedia.org/wiki/{name}_(mythology)",
    ]
    
    for name in missing_names:
        found = False
        for pattern in patterns:
            url = pattern.format(name=urllib.parse.quote(name.replace(' ', '_'), safe='_'))
            try:
                body = fetch_url(url)
                # Check if this is a disambiguation or redirect
                if 'may refer to:' in body[:5000]:
                    continue
                    
                # Extract first paragraph
                match = re.search(r'<div class="mw-parser-output">(.*?)</div>\s*</div>', body, re.DOTALL)
                if not match:
                    continue
                content = match.group(1)
                paragraphs = re.findall(r'<p[^>]*>(.*?)</p>', content, re.DOTALL)
                for p in paragraphs:
                    text = strip_html(p).strip()
                    if len(text) > 50:
                        descs[name] = text
                        found = True
                        break
                if found:
                    break
                time.sleep(0.2)
            except:
                pass
        if not found:
            time.sleep(0.1)
    
    print(f"  Found {len(descs)} descriptions from Wikipedia")
    return descs

def merge_descs(db, descs, source_name):
    """Merge a dict of {name: desc} into the database"""
    matched = 0
    for monster in db["monsters"]:
        if monster.get("desc", "").strip():
            continue
        name = monster["name"].strip()
        key = normalize(name)
        
        # Direct match
        if key in descs:
            monster["desc"] = descs[key]
            matched += 1
            continue
        
        # Try partial matching
        for dk, dv in descs.items():
            if key in dk or dk in key:
                monster["desc"] = dv
                matched += 1
                break
    
    print(f"  Merged {matched} from {source_name}")
    return matched

def main():
    print("Loading database...")
    db = load_db()
    missing = [m["name"] for m in db["monsters"] if not m.get("desc", "").strip()]
    print(f"  {len(missing)} monsters still missing descriptions")
    
    # Try Fandom wiki (top 50 most iconic to save time)
    fandom_descs = try_fandom_wiki(missing[:80])
    merge_descs(db, fandom_descs, "Fandom Wiki")
    
    # Try D&D 5e API extra fields
    still_missing = [m["name"] for m in db["monsters"] if not m.get("desc", "").strip()]
    api_descs = try_5eapi_extra_fields(still_missing[:50])
    merge_descs(db, api_descs, "D&D 5e API extras")
    
    # Try more Wikipedia
    still_missing = [m["name"] for m in db["monsters"] if not m.get("desc", "").strip()]
    wiki_descs = try_wikipedia_more(still_missing[:60])
    merge_descs(db, wiki_descs, "Wikipedia extended")
    
    # Final tally
    total = sum(1 for m in db["monsters"] if m.get("desc", "").strip())
    remaining = [m["name"] for m in db["monsters"] if not m.get("desc", "").strip()]
    
    print(f"\n=== PHASE 2 RESULTS ===")
    print(f"With descriptions: {total}/{len(db['monsters'])}")
    print(f"Still missing: {len(remaining)}")
    if remaining:
        print(f"First 30: {', '.join(remaining[:30])}")
    
    db["meta"]["descriptions_count"] = total
    db["meta"]["descriptions_missing"] = len(remaining)
    save_db(db)
    print(f"\nSaved!")

if __name__ == "__main__":
    main()
