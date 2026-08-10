#!/usr/bin/env python3
import os
import re

# Manifest files to patch
manifest_files = [
  'manifests-act1.js',
  'manifests-act2.js',
  'manifests-act3.js',
  'manifests-act4.js',
  'manifests-act5.js',
  'manifests-frankenstein-act1.js',
  'manifests-frankenstein-act2.js',
  'manifests-frankenstein-act3.js',
  'manifests-frankenstein-act4.js',
  'manifests-frankenstein-act5.js',
  'manifests-holmes-act1.js',
  'manifests-holmes-act2.js',
  'manifests-holmes-act3.js',
  'manifests-holmes-act4.js',
  'manifests-holmes-act5.js'
]

def add_valid_arrays(content):
    # Pattern to find locationKeywords blocks
    location_keywords_pattern = r'"locationKeywords":\s*\{[^}]*\}'
    
    changes = 0
    
    def replace_block(match):
        nonlocal changes
        block = match.group(0)
        
        # Check if it already has a valid array
        if '"valid"' in block:
            return block
        
        # Extract the banned array to get context
        banned_match = re.search(r'"banned":\s*\[([^\]]*)\]', block)
        if not banned_match:
            return block
        
        banned_items = [s.strip().strip('"') for s in banned_match.group(1).split(',')]
        
        # Create a generic valid array based on the banned items
        valid_items = []
        
        # Add some generic valid locations based on common patterns
        if 'castle' in banned_items:
            valid_items.extend(['castle', 'dracula', 'great hall', 'crypt', 'tower', 'courtyard'])
        if 'london' in banned_items:
            valid_items.extend(['london', 'exeter', 'office', 'hotel', 'train'])
        if 'transylvania' in banned_items:
            valid_items.extend(['transylvania', 'bistritz', 'mountain', 'road', 'forest'])
        if 'carpathians' in banned_items:
            valid_items.extend(['carpathians', 'mountain', 'forest', 'road', 'pass'])
        
        # If we don't have enough valid items, add some defaults
        if len(valid_items) < 3:
            valid_items.extend(['location', 'room', 'area', 'place', 'here'])
        
        # Remove duplicates
        valid_items = list(dict.fromkeys(valid_items))
        
        # Create the new block with valid array
        valid_str = ', '.join(f'"{v}"' for v in valid_items)
        new_block = block.replace(
            f'"banned": [{banned_match.group(1)}]',
            f'"banned": [{banned_match.group(1)}],\n      "valid": [{valid_str}]'
        )
        
        changes += 1
        return new_block
    
    # Replace all locationKeywords blocks
    new_content = re.sub(location_keywords_pattern, replace_block, content)
    
    return new_content, changes

# Apply edits to each manifest file
for file in manifest_files:
    file_path = f'./{file}'
    
    if not os.path.exists(file_path):
        print(f'Skipping {file} (not found)')
        continue
    
    with open(file_path, 'r') as f:
        content = f.read()
    
    new_content, changes = add_valid_arrays(content)
    
    if changes > 0:
        with open(file_path, 'w') as f:
            f.write(new_content)
        print(f'Patched {file} ({changes} changes)')
    else:
        print(f'No changes needed for {file}')

print('\nDone! Added valid arrays to manifest files.')
