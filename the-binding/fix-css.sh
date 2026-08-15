#!/bin/bash
# Fix CSS for mode-select-screen
cd "$(dirname "$0")/public"
sed -i 's/#mode-select-screen{text-align:center;padding:40px 20px;display:flex;flex-direction:column;align-items:center;gap:24px;}/#mode-select-screen{text-align:center;padding:40px 20px;display:flex;flex-direction:column;align-items:center;gap:24px;overflow-y:auto;flex:1;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;}/' index.html
echo "CSS fix applied"
grep "mode-select-screen{" index.html
