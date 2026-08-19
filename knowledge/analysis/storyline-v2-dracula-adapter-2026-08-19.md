# Storyline v2 Dracula Adapter — 2026-08-19

> Source: Implementation progress in the Storyline v2 restart.

## Summary

Created a migration-only adapter that transforms Dracula's existing authored scene manifests into the universal Storyline v2 data contract. The adapter preserves authored descriptions, discoveries, item gains, bad choices, exits, and the prologue while keeping legacy field interpretation outside the v2 compiler and resolver.

## Migration rules

- The Dracula adventure loader already merges the five acts into `DraculaAdventure.sceneManifests`; the adapter consumes that merged source once.
- Every migrated action is namespaced with its scene ID to create globally stable v2 action and content IDs.
- Legacy item names are normalized into Storyline-only item IDs with explicit acquisition effects.
- Legacy bad choices and exits become typed v2 actions with deterministic resolutions.
- Sequential authored exits form the initial migration graph; this is a provisional graph for validation, not a claim that final narrative branching is complete.

## Verification

- Source contains all 25 Dracula scenes.
- The generated manifest is schema version 2.0 and data-only.
- Dracula compiles through the same universal compiler as synthetic manifests.
- Dracula adapter tests pass.
- Storyline v2 core tests pass.

## Related

- [Storyline v2 Universal Manifest Engine Specification](storyline-v2-specification.md)
- [Storyline v2 Deterministic Validation](storyline-v2-deterministic-validation-2026-08-19.md)
- [Storyline Rebuild Audit](storyline-rebuild-audit-2026-08-19.md)
