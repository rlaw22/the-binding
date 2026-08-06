#!/bin/bash
# ═════════════════════════════════════════════════════════════════════════
# Smoke Test Wrapper — The Binding
#
# Runs the Playwright smoke journey test (full player flow).
# Usage: ./scripts/smoke.sh
# ═════════════════════════════════════════════════════════════════════════

set -e

echo "🔥 Running smoke journey test..."
echo ""

# Run the smoke project (matches uxui-smoke-journey.test.js)
npx playwright test --project=smoke

echo ""
echo "✅ Smoke test complete!"
