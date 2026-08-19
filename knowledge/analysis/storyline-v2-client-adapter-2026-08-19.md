# Storyline v2 Client Adapter — 2026-08-19

> Source: Implementation progress in the Storyline v2 restart.

## Summary

Added a standalone browser client adapter for the v2 transport. It is not wired into the legacy frontend flow yet.

## Contract

- Starts and refreshes v2 sessions.
- Stores the server snapshot and current catalog.
- Submits only action IDs present in the current server catalog.
- Sends the server-issued catalog version with button actions.
- Supports free-text submission through the server endpoint.
- Renders catalog buttons from server data without inventing IDs, types, availability, or effects.

## Safety

The adapter contains no local action generation, random IDs, mechanics, inventory mutation, scene transitions, or state inference. The server remains authoritative.

## Verification

Static client contract tests pass, including checks for catalog-version usage, catalog-bound action validation, and absence of local action generation.

## Related

- [Storyline v2 API Transport](storyline-v2-api-transport-2026-08-19.md)
- [Storyline v2 Universal Manifest Engine Specification](storyline-v2-specification.md)
