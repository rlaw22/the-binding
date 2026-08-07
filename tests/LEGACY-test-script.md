# Legacy Test Script (archived)

**Archived**: August 7, 2026
**Replaced by**: 8 bucketed scripts in `package.json` (test:engine, test:voice, test:image, test:uxui, test:e2e, test:combat, test:inventory, test:pwa)
**Reason**: Token-intensive monolithic chain. Use `npm run test:all` or individual buckets instead.

---

## Original `test` script (pre-9207f098)

```json
{
  "test": "node tests/phase1.test.js && node tests/image-pipeline.test.js && node tests/coin-bellcurve.test.js && node tests/coin-engine-v2.test.js && node tests/dice.test.js && node tests/durability-combat.test.js && node tests/durability-image.test.js && node tests/dynamic-difficulty-tuning.test.js && node tests/e2e-expanded.test.js && node tests/image-cache.test.js && node tests/image-queue.test.js && node tests/inventory-edge-cases.test.js && node tests/inventory-shoppe.test.js && node tests/persistent-store.test.js && node tests/phase1-integration.test.js && node tests/phase2.test.js && node tests/voice-tts.test.js && node tests/class-abilities.test.js && node tests/story-mode.test.js && node tests/session14-improvements.test.js && node tests/browser-tts.test.js && node tests/coin-engine-rubric.test.js && node tests/coin-notifications-calibration.test.js && node tests/e2e-extended.test.js && node tests/e2e-smoke.test.js && node tests/e2e-voice-image.test.js && node tests/image-dm-integration.test.js && node tests/phase2-campaign.test.js && node tests/phase2-e2e.test.js && node tests/phase2-extended.test.js && node tests/phase2bcd.test.js && node tests/pwa-improvements.test.js && node tests/pwa.test.js && node tests/shoppe-dd-api.test.js && node tests/tts-error-recovery.test.js && node tests/voice-profiles.test.js && node tests/voice-tts-e2e.test.js && node tests/game-mode.test.js"
}
```

---

## Notes

- 37 test files chained with `&&` (fail-fast on first failure)
- No categorization — all engine, voice, image, UI, combat, inventory, PWA tests in one command
- Replaced in commit `9207f098` (Aug 6, 2026) with bucketed scripts
- **Do not restore** without discussing with Lawman — token-intensive
