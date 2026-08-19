# Storyline v2 Deterministic Validation — 2026-08-19

> Source: Implementation progress in the Storyline v2 restart conversation.

## Summary

The isolated Storyline v2 core was hardened so free-text matching remains strictly bounded by the current server-issued action catalog. The matcher may select a clear match, but it cannot authorize an action that is not currently legal, and it rejects ambiguous matches.

## Changes

- Added duplicate graph-edge ID validation.
- Added validation that graph transition triggers reference known action IDs.
- Applied requirement validation to graph transition triggers.
- Free-text matching now consumes only catalog actions and uses normalized action IDs, content IDs, labels, short labels, and authored keywords.
- Exact matches outrank phrase matches; phrase matches outrank multi-token matches.
- Tied or insufficiently distinct candidates return `ambiguous` with no action.
- Missing or malformed catalogs return `no_match`.
- Added regression tests for ambiguity and for attempts to match a legal-looking action absent from the current catalog.

## Verification

`node tests/storyline-v2-core.test.js` passes all 12 tests, and `node -c src/storyline-v2/index.js` passes.

## Related

- [Storyline v2 Universal Manifest Engine Specification](storyline-v2-specification.md)
- [Storyline Rebuild Audit](storyline-rebuild-audit-2026-08-19.md)
- [Storyline Reconstruction Architecture](storyline-reconstruction-architecture.md)
