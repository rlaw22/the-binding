#!/usr/bin/env python3
"""Smoke test: play through the Holmes adventure end-to-end."""
import json, sys, time
from urllib.request import Request, urlopen
from urllib.error import HTTPError

BASE = "http://localhost:3001/api/sessions"
SID = "4f815777-f696-4fa2-a7af-c9a6e910db44"
URL = f"{BASE}/{SID}"

errors = []
scene_transitions = []

def api(method, path, body=None):
    url = f"{URL}{path}" if path.startswith("/") else f"{BASE}/{path}"
    data = json.dumps(body).encode() if body else None
    req = Request(url, data=data, method=method)
    if body:
        req.add_header("Content-Type", "application/json")
    try:
        with urlopen(req, timeout=30) as resp:
            return json.loads(resp.read())
    except HTTPError as e:
        body_text = e.read().decode()[:300]
        errors.append(f"HTTP {e.code} on {method} {path}: {body_text}")
        print(f"  ❌ HTTP {e.code}: {body_text}")
        return None
    except Exception as e:
        errors.append(f"Exception on {method} {path}: {e}")
        print(f"  ❌ {e}")
        return None

def send_action(content, label=""):
    print(f"--- {label} ---")
    data = api("POST", "/actions", {"content": content})
    if not data:
        return
    if "error" in data:
        errors.append(f"API error on '{label}': {data['error']}")
        print(f"  ❌ {data['error']}")
        return
    for m in data.get("messages", []):
        md = m.get("data", {})
        t = md.get("type", "")
        c = md.get("content", "")
        if t == "narration":
            # Check for cross-contamination
            lower = c.lower()
            if ("dracula" in lower or "bistritz" in lower or "jonathan harker" in lower) and "baker street" not in lower:
                errors.append(f"CROSS-CONTAMINATION in '{label}': Dracula content in Holmes session")
                print(f"  ⚠️  CROSS-CONTAMINATION: {c[:150]}")
            else:
                print(f"  📖 {c[:200]}")
        elif t == "coin":
            print(f"  🪙 {c}")
        elif t == "scene_transition":
            scene_transitions.append(c)
            print(f"  🎬 SCENE TRANSITION: {c[:100]}")
        elif t == "error":
            errors.append(f"Game error in '{label}': {c}")
            print(f"  ❌ Game error: {c}")
        elif t == "suggested_actions":
            acts = md.get("metadata", {}).get("actions", [])
            if acts:
                print(f"  🎯 Next: {[a['label'][:40] for a in acts[:3]]}")

def check_state():
    progress = api("GET", "/progress")
    inventory = api("GET", "/inventory")
    coins = api("GET", "/coins")
    if not progress or not inventory or not coins:
        errors.append("State check failed")
        return None, None, None
    sc = progress.get("currentScene", "?")
    nm = progress.get("sceneName", "?")
    act = progress.get("act", {}).get("name", "?")
    items = inventory.get("items", [])
    earned = coins.get("totalEarned", 0)
    pool = coins.get("totalPool", 0)
    print(f"\n📊 Scene {sc}/25 '{nm}' | Act: {act} | Items: {len(items)} | Coins: {earned}/{pool}")
    return progress, inventory, coins

# ============================================================
print("=" * 60)
print("HOLMES ADVENTURE SMOKE TEST")
print("=" * 60)

# Scene 0: 221B Baker Street (already 4 actions done, 17 messages)
# Continue from where we left off
print("\n🏛️  Scene 0: 221B Baker Street (continuing)")
send_action("Think about the implications of the manuscript and the curse", "S0-A5")
send_action("Agree to take the case and prepare for Sir Henry's arrival", "S0-A6")
check_state()

# Scene 1: Sir Henry Arrives
print("\n🏛️  Scene 1: Sir Henry Arrives")
send_action("Welcome Sir Henry Baskerville and observe him carefully", "S1-A1")
send_action("Examine the anonymous warning letter that Sir Henry received", "S1-A2")
check_state()

# Scene 2: The Warning Letter Investigation
print("\n🏛️  Scene 2: The Warning Letter Investigation")
send_action("Investigate how the warning letter was made - check the newspaper it was cut from", "S2-A1")
send_action("Ask Sir Henry about the stolen boot from his hotel room", "S2-A2")
check_state()

# Scene 3: Tracking the Letter Source
print("\n🏛️  Scene 3: Tracking the Letter Source")
send_action("Follow Holmes to the hotel where the letter was composed and trace the newspaper", "S3-A1")
send_action("Question the hotel staff about who had access to compose the letter", "S3-A2")
check_state()

# Scene 4: The Second Boot
print("\n🏛️  Scene 4: The Second Boot")
send_action("Investigate the second stolen boot and search the hotel", "S4-A1")
send_action("Discuss with Holmes why only one old boot was taken", "S4-A2")
check_state()

# Scene 5: Meeting Stapleton
print("\n🏛️  Scene 5: Meeting Stapleton")
send_action("Meet Mr. Stapleton the naturalist who approaches us on the moor", "S5-A1")
send_action("Ask Stapleton about the Baskerville legend and the hound", "S5-A2")
check_state()

# Scene 6: Departure for Dartmoor
print("\n🏛️  Scene 6: Departure for Dartmoor")
send_action("Board the train to Dartmoor and review the case with Holmes", "S6-A1")
send_action("Arrive at the bleak Dartmoor landscape and take in the surroundings", "S6-A2")
check_state()

# Scene 7: Baskerville Hall
print("\n🏛️  Scene 7: Baskerville Hall")
send_action("Examine the ancient stone exterior of Baskerville Hall", "S7-A1")
send_action("Enter the hall and meet the Barrymores, the household staff", "S7-A2")
check_state()

# Scene 8: The Barrymores
print("\n🏛️  Scene 8: The Barrymores")
send_action("Observe Mrs. Barrymore carefully - she seems distressed", "S8-A1")
send_action("Ask the Barrymores about strange occurrences at the hall", "S8-A2")
check_state()

# Scene 9: The Moor at Night
print("\n🏛️  Scene 9: The Moor at Night")
send_action("Step outside at night and listen for sounds from the moor", "S9-A1")
send_action("Investigate a mysterious light seen on the dark moor", "S9-A2")
check_state()

# Scene 10: The Stapletons
print("\n🏛️  Scene 10: The Stapletons")
send_action("Visit the Stapletons at their cottage and learn about the moor", "S10-A1")
send_action("Talk to Miss Stapleton who warns me about the dangerous mire", "S10-A2")
check_state()

# Scene 11: The Grimpen Mire
print("\n🏛️  Scene 11: The Grimpen Mire")
send_action("Explore the edge of the treacherous Grimpen Mire", "S11-A1")
send_action("Ask Stapleton about the hound legend and the pony found dead in the mire", "S11-A2")
check_state()

# Scene 12: The Howl
print("\n🏛️  Scene 12: The Howl")
send_action("Hear a terrifying howl echoing across the moor at night", "S12-A1")
send_action("Search the moor for evidence of the phantom hound", "S12-A2")
check_state()

# Scene 13: The Convict
print("\n🏛️  Scene 13: The Convict")
send_action("Learn about the escaped convict Selden hiding on the moor", "S13-A1")
send_action("Investigate the connection between Selden and the Barrymores", "S13-A2")
check_state()

# Scene 14: The Barrymore Signal
print("\n🏛️  Scene 14: The Barrymore Signal")
send_action("Watch the Barrymores at night signaling from the window with a candle", "S14-A1")
send_action("Confront the Barrymores about the signaling to the moor", "S14-A2")
check_state()

# Scene 15: The Manuscript
print("\n🏛️  Scene 15: The Manuscript")
send_action("Search the old wing of the hall for hidden documents about the curse", "S15-A1")
send_action("Examine the Baskerville manuscript and the account of Hugo Baskerville", "S15-A2")
check_state()

# Scene 16: Holmes on the Moor
print("\n🏛️  Scene 16: Holmes on the Moor")
send_action("Discover that Holmes has been secretly hiding on the moor investigating", "S16-A1")
send_action("Listen as Holmes reveals what he has learned about Stapleton", "S16-A2")
check_state()

# Scene 17: The Trap is Set
print("\n🏛️  Scene 17: The Trap is Set")
send_action("Help Holmes set a trap for Stapleton using Sir Henry as bait", "S17-A1")
send_action("Prepare weapons and position ourselves on the moor for the ambush", "S17-A2")
check_state()

# Scene 18: Sir Henry's Walk
print("\n🏛️  Scene 18: Sir Henry's Walk")
send_action("Watch Sir Henry walk alone across the dark moor as planned", "S18-A1")
send_action("Wait in hiding for the hound to appear from the fog", "S18-A2")
check_state()

# Scene 19: The Hound Attacks
print("\n🏛️  Scene 19: The Hound Attacks")
send_action("See the enormous glowing hound emerge from the fog and charge at Sir Henry", "S19-A1")
send_action("Rush forward with Holmes to save Sir Henry from the beast", "S19-A2")
check_state()

# Scene 20: The Confrontation
print("\n🏛️  Scene 20: The Confrontation")
send_action("Confront Stapleton and reveal his plot to inherit the Baskerville fortune", "S20-A1")
send_action("Subdue Stapleton and ensure the hound is destroyed", "S20-A2")
check_state()

# Scene 21: The Truth Revealed
print("\n🏛️  Scene 21: The Truth Revealed")
send_action("Learn the full truth about Stapleton being a secret Baskerville heir", "S21-A1")
send_action("Discover how Stapleton trained and painted the hound to appear supernatural", "S21-A2")
check_state()

# Scene 22: The Resolution
print("\n🏛️  Scene 22: The Resolution")
send_action("Ensure Sir Henry is safe and the curse of the Baskervilles is broken", "S22-A1")
send_action("Help Sir Henry recover from his ordeal at the hall", "S22-A2")
check_state()

# Scene 23: The Return to London
print("\n🏛️  Scene 23: The Return to London")
send_action("Return to London and report the case resolution", "S23-A1")
send_action("Meet Holmes at Baker Street to discuss the case over tea", "S23-A2")
check_state()

# Scene 24: Baker Street Epilogue
print("\n🏛️  Scene 24: Baker Street Epilogue")
send_action("Reflect on the case with Holmes by the fireplace at 221B", "S24-A1")
send_action("Ask Holmes what he found most remarkable about the Baskerville case", "S24-A2")
check_state()

# Final comprehensive check
print("\n" + "=" * 60)
print("FINAL STATE CHECK")
print("=" * 60)
p, inv, co = check_state()

print("\n" + "=" * 60)
print("TEST SUMMARY")
print("=" * 60)
print(f"Scene transitions: {len(scene_transitions)}")
for st in scene_transitions:
    print(f"  → {st[:80]}")
print(f"\nTotal errors: {len(errors)}")
for i, e in enumerate(errors, 1):
    print(f"  {i}. {e[:200]}")
if p:
    print(f"\nFinal scene: {p.get('currentScene','?')}/25 '{p.get('sceneName','?')}'")
    print(f"Act: {p.get('act',{}).get('name','?')}")
    print(f"Total turns: {p.get('totalTurns','?')}")
if inv:
    print(f"Inventory items: {len(inv.get('items',[]))}")
    for item in inv.get('items', []):
        print(f"  - {item.get('name','?')}: {item.get('description','')[:80]}")
if co:
    print(f"Coins: {co.get('totalEarned',0)}/{co.get('totalPool',0)} ({co.get('percentage',0)}%)")
