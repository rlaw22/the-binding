# Storyline Mode Strict Narration - Implementation

## Summary

This implementation adds **Storyline Mode** with strict manifest-only narration to "The Binding" game. The key feature is that in Storyline Mode, the DM (Dungeon Master) can only narrate atmosphere and environment, while all content (discoveries, items, NPCs) comes from pre-authored scene manifests.

## What's Implemented (Steps 1-5)

### 1. Storyline System Prompt (`src/ai-dm/prompts.js`)
- Added `STORYLINE_SYSTEM_PROMPT` constant
- Added `buildStorylineSystemPrompt()` function
- The prompt strictly limits the DM to narrating only atmosphere

### 2. Game Mode Support (`src/ai-dm/dm-service.js`)
- Added `GameMode` import
- Added `gameMode` property to game objects
- Added Storyline branch with retry loop for validation
- Uses stricter system prompt for Storyline Mode

### 3. Scene Context Builder (`src/scene-engine/index.js`)
- Added `buildStorylineSceneContext()` function
- Omits discovery text (DM must not invent content)
- Includes exit label and button list for narration

### 4. Continuity Validator (`src/scene-engine/continuity-validator.js`)
- Added `valid` whitelist skeleton in Layer 2
- Checks location continuity against valid locations

### 5. Server Integration (`src/api/server.js`)
- Wired `gameMode: resolvedGameMode` into `createGame()`

## Step 6: Manifest Patcher

### Generic Patcher (`patch-manifests-python.py`)
- Adds `valid` arrays to all 75 scenes across 15 manifest files
- Uses pattern matching to generate appropriate valid locations
- **Note**: This adds generic valid arrays. For production, customize per scene.

### How to Run
```bash
cd /path/to/the-binding
python3 patch-manifests-python.py
```

## Step 7: Push to GitHub

### Option 1: Use the Push Script
```bash
# Set your GitHub token
export GITHUB_PAT=your_github_token

# Run the push script
./push-to-github.sh
```

### Option 2: Manual Push
1. Create a new branch: `feat/storyline-strict-narration`
2. Copy the modified files to the repository
3. Run the manifest patcher
4. Commit and push

## Files Modified

### Source Files (Steps 1-5)
- `src/ai-dm/prompts.js`
- `src/ai-dm/dm-service.js`
- `src/scene-engine/index.js`
- `src/scene-engine/continuity-validator.js`
- `src/api/server.js`

### Manifest Files (Step 6)
- All 15 manifest files (manifests-act*.js, manifests-frankenstein-act*.js, manifests-holmes-act*.js)
- Each file gets `valid` arrays added to all scenes

## Next Steps

1. **Customize Valid Arrays**: The generic patcher adds basic valid locations. For production, customize each scene's `valid` array based on the scene context.

2. **Test the Implementation**: 
   - Start a new game in Storyline Mode
   - Verify the DM only narrates atmosphere
   - Check that discovery text comes from manifests

3. **Create Pull Request**: Push the changes and create a PR to merge into main.

## Notes

- The manifest patcher uses pattern matching to generate valid locations
- For production, consider creating a more sophisticated patcher that analyzes scene descriptions
- The retry loop in dm-service.js helps ensure compliance with the strict narration rules
