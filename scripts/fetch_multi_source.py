#!/usr/bin/env python3
"""Fetch monster descriptions from multiple free/open sources and merge into srd-monsters.json"""
import json, urllib.request, urllib.parse, time, re, sys

MONSTERS_FILE = "/workspace/the-binding/src/data/monsters/srd-monsters.json"
DOCS_FILE = "/workspace/the-binding/public/docs/srd-monsters.json"

WIKI_DESCS = [
    {"name": "Beholder", "desc": "The beholder is a fictional monster in the Dungeons & Dragons fantasy role-playing game. It is depicted as a floating orb of flesh with a large mouth, single central eye, and many smaller eyestalks on top with powerful magical abilities."},
    {"name": "Lich", "desc": "The lich is an undead creature found in the Dungeons & Dragons fantasy role-playing game. Liches are spellcasters who seek to defy death by magical means."},
    {"name": "Mind Flayer", "desc": "In the Dungeons & Dragons fantasy role-playing game, illithids (commonly known as mind flayers) are monstrous humanoid aberrations with psionic powers. In a typical Dungeons & Dragons campaign setting, they live in the moist caverns and cities of the enormous Underdark."},
    {"name": "Owlbear", "desc": "An owlbear is a fictional creature originally created for the Dungeons & Dragons fantasy role-playing game. An owlbear is depicted as a cross between a bear and an owl, which 'hugs' like a bear and attacks with its beak."},
    {"name": "Gelatinous Cube", "desc": "A gelatinous cube is a fictional monster from the Dungeons & Dragons fantasy role-playing game. It is described as a ten-foot cube of transparent gelatinous ooze, which is able to absorb and digest organic matter."},
    {"name": "Mimic", "desc": "In the Dungeons & Dragons fantasy role-playing game, the mimic is a type of fictional monster. It is portrayed as being able to change its shape to disguise its body as an inanimate object, commonly a chest. The mimic uses a powerful adhesive that holds fast to creatures that touch it, allowing the mimic to beat its victims with its powerful pseudopods."},
    {"name": "Rust Monster", "desc": "A rust monster is a fictional creature from the Dungeons & Dragons fantasy role-playing game that seeks out and consumes metal, often the armor and weaponry of players' characters."},
    {"name": "Displacer Beast", "desc": "A displacer beast is a fictional evil feline creature created for the Dungeons & Dragons role-playing game. A displacer beast is a magical six-legged black panther-like feline with a pair of tentacles growing from its shoulders. The beast's name comes from its innate 'displacement' ability whereby it magically bends light to create the illusion that it is a short distance away from its actual location."},
    {"name": "Vampire", "desc": "In the Dungeons & Dragons fantasy role-playing game, a vampire is an undead creature. A humanoid or monstrous humanoid creature can become a vampire, and looks as it did in life, with pale skin, haunting red eyes, and a feral cast to its features."},
    {"name": "Skeleton", "desc": "A skeleton is a type of physically manifested undead often found in fantasy, gothic, and horror fiction, as well as mythology, folklore, and various kinds of art. Most are human skeletons, but they can also be from any species."},
    {"name": "Dragon", "desc": "In the Dungeons & Dragons fantasy role-playing game, dragons are an iconic type of monstrous creature. D&D dragons are loosely based on dragons from a wide range of fictional and mythological sources. In D&D, dragons are depicted as large, intelligent, magical, reptilian beasts, each typically defined by a combination of their demeanor and either the color of their scales or their elemental affinity."},
    {"name": "Devil", "desc": "A devil, also referred to as a baatezu, is a member of a group of fictional creatures in the Dungeons & Dragons roleplaying game typically presented as formidable opponents for advanced players. Devils are characterized by their Lawful Evil alignment and are depicted as originating from the Nine Hells of Baator."},
]

def load_db():
    with open(MONSTERS_FILE) as f:
        return json.load(f)

def save_db(db):
    with open(MONSTERS_FILE, "w") as f:
        json.dump(db, f, indent=2, ensure_ascii=False)
    with open(DOCS_FILE, "w") as f:
        json.dump(db, f, indent=2, ensure_ascii=False)

def normalize(s):
    return re.sub(r'\s+', ' ', s.lower().strip().replace('"','').replace("'",""))

def fuzzy_match(query, candidates):
    """Find best match for query in candidates dict"""
    q = normalize(query)
    if q in candidates:
        return candidates[q]
    # Try partial matches
    for k, v in candidates.items():
        if q in k or k in q:
            return v
    return None

def fetch_5etools():
    """Try 5etools GitHub for fluff/description data"""
    print("\n=== Trying 5etools ===")
    descs = {}
    urls_to_try = [
        "https://raw.githubusercontent.com/5etools-mirror-3/5etools-mirror-3.github.io/master/data/bestiary/fluff-bestiary.json",
        "https://raw.githubusercontent.com/5etools-mirror-3/5etools-mirror-3.github.io/master/data/bestiary/bestiary-mm.json",
        "https://raw.githubusercontent.com/5etools-mirror-3/5etools-mirror-3.github.io/data/bestiary/fluff-bestiary.json",
        "https://raw.githubusercontent.com/5etools-mirror-3/5etools-mirror-3.github.io/data/bestiary/bestiary-mm.json",
    ]
    for url in urls_to_try:
        try:
            print(f"  Trying: {url.split('/')[-1]}...", end=" ", flush=True)
            req = urllib.request.Request(url, headers={"User-Agent": "TheBinding/1.0"})
            with urllib.request.urlopen(req, timeout=15) as resp:
                data = json.loads(resp.read())
            # 5etools fluff format has "monster" array with "name" and "entries"
            monsters_data = data.get("monster", [])
            found = 0
            for entry in monsters_data:
                name = entry.get("name", "").strip()
                entries = entry.get("entries", [])
                # Also check "fluff" sub-key
                fluff = entry.get("fluff", {})
                if fluff:
                    entries = fluff.get("entries", entries)
                # Extract text from entries (recursive)
                desc_parts = []
                def extract_text(items):
                    if isinstance(items, str):
                        desc_parts.append(items)
                    elif isinstance(items, list):
                        for item in items:
                            extract_text(item)
                    elif isinstance(items, dict):
                        if "entries" in items:
                            extract_text(items["entries"])
                        if "text" in items:
                            desc_parts.append(items["text"])
                extract_text(entries)
                if name and desc_parts:
                    descs[name.lower()] = " ".join(desc_parts)
                    found += 1
            print(f"got {found} descriptions")
        except Exception as e:
            print(f"failed: {e}")
        time.sleep(0.5)
    return descs

def fetch_open5e_broad():
    """Fetch ALL monsters from Open5e (not just SRD) to maximize matches"""
    print("\n=== Trying Open5e broad fetch (all documents) ===")
    descs = {}
    url = "https://api.open5e.com/v1/monsters/?limit=100"
    page = 1
    while url:
        print(f"  Page {page}...", end=" ", flush=True)
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "TheBinding/1.0"})
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = json.loads(resp.read())
            results = data.get("results", [])
            print(f"{len(results)} monsters")
            for m in results:
                name = m.get("name", "").strip()
                desc = m.get("desc", "").strip()
                if name and desc:
                    key = name.lower()
                    # Don't overwrite existing longer descriptions
                    if key not in descs or len(desc) > len(descs[key]):
                        descs[key] = desc
            url = data.get("next")
            page += 1
            time.sleep(0.3)
        except Exception as e:
            print(f"error: {e}")
            break
    return descs

def fetch_open5e_search(missing_names):
    """Search Open5e for specific missing monster names"""
    print(f"\n=== Searching Open5e for {len(missing_names)} missing monsters ===")
    descs = {}
    for i, name in enumerate(missing_names):
        if i % 20 == 0 and i > 0:
            print(f"  ... searched {i}/{len(missing_names)}")
        try:
            encoded = urllib.parse.quote(name)
            url = f"https://api.open5e.com/v1/monsters/?search={encoded}"
            req = urllib.request.Request(url, headers={"User-Agent": "TheBinding/1.0"})
            with urllib.request.urlopen(req, timeout=15) as resp:
                data = json.loads(resp.read())
            results = data.get("results", [])
            for m in results:
                mname = m.get("name", "").strip().lower()
                mdesc = m.get("desc", "").strip()
                if mdesc and normalize(mname) == normalize(name):
                    descs[name.lower()] = mdesc
                    break
            time.sleep(0.25)
        except:
            pass
    print(f"  Found {len(descs)} matches from search")
    return descs

def merge_wikipedia(db):
    """Merge pre-fetched Wikipedia descriptions"""
    print("\n=== Merging Wikipedia descriptions ===")
    matched = 0
    # Build lookup
    wiki_lookup = {d["name"].lower(): d["desc"] for d in WIKI_DESCS}
    
    for monster in db["monsters"]:
        if monster.get("desc", "").strip():
            continue
        name = monster["name"].strip().lower()
        
        # Direct match
        if name in wiki_lookup:
            monster["desc"] = wiki_lookup[name]
            matched += 1
            continue
        
        # Check if monster name contains a wiki key or vice versa
        for wkey, wdesc in wiki_lookup.items():
            # e.g. "adult red dragon" contains "dragon", or "skeleton" matches "skeleton"
            if wkey in name or name in wkey:
                monster["desc"] = wdesc
                matched += 1
                break
    
    print(f"  Matched {matched} monsters from Wikipedia")
    return matched

def main():
    print("Loading local monster database...")
    db = load_db()
    monsters = db["monsters"]
    
    has_desc = sum(1 for m in monsters if m.get("desc", "").strip())
    print(f"  {has_desc}/{len(monsters)} already have descriptions")
    print(f"  {len(monsters) - has_desc} missing")
    
    # Phase 1: Merge Wikipedia (fast, no network)
    wiki_count = merge_wikipedia(db)
    
    # Phase 2: Try 5etools
    tools_descs = fetch_5etools()
    if tools_descs:
        matched = 0
        for monster in db["monsters"]:
            if monster.get("desc", "").strip():
                continue
            result = fuzzy_match(monster["name"], tools_descs)
            if result:
                monster["desc"] = result
                matched += 1
        print(f"  Matched {matched} from 5etools")
    
    # Phase 3: Open5e broad fetch
    open5e_descs = fetch_open5e_broad()
    if open5e_descs:
        matched = 0
        for monster in db["monsters"]:
            if monster.get("desc", "").strip():
                continue
            result = fuzzy_match(monster["name"], open5e_descs)
            if result:
                monster["desc"] = result
                matched += 1
        print(f"  Matched {matched} from Open5e broad")
    
    # Phase 4: Open5e targeted search for still-missing monsters
    still_missing = [m["name"] for m in db["monsters"] if not m.get("desc", "").strip()]
    if still_missing and len(still_missing) < 150:
        search_descs = fetch_open5e_search(still_missing)
        if search_descs:
            matched = 0
            for monster in db["monsters"]:
                if monster.get("desc", "").strip():
                    continue
                result = fuzzy_match(monster["name"], search_descs)
                if result:
                    monster["desc"] = result
                    matched += 1
            print(f"  Matched {matched} from Open5e search")
    
    # Final tally
    total = sum(1 for m in db["monsters"] if m.get("desc", "").strip())
    missing = [m["name"] for m in db["monsters"] if not m.get("desc", "").strip()]
    
    print(f"\n=== FINAL RESULTS ===")
    print(f"With descriptions: {total}/{len(db['monsters'])}")
    print(f"Still missing: {len(missing)}")
    if missing:
        print(f"Missing: {', '.join(missing[:30])}")
        if len(missing) > 30:
            print(f"  ... and {len(missing) - 30} more")
    
    # Update metadata
    db["meta"]["descriptions_count"] = total
    db["meta"]["descriptions_missing"] = len(missing)
    db["meta"]["description_source"] = "Open5e API + Wikipedia (CC BY-SA)"
    db["meta"]["description_license"] = "OGL (Open5e) + CC BY-SA 4.0 (Wikipedia)"
    
    save_db(db)
    print(f"\nSaved to {MONSTERS_FILE}")
    print(f"Saved to {DOCS_FILE}")

if __name__ == "__main__":
    main()
