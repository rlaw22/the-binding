# Storyline v2 Browser Bridge — 2026-08-19

> Source: Implementation work in the Storyline v2 rewrite.

## Summary

Added a reversible browser integration boundary for Storyline v2. The legacy Storyline flow remains the fallback, while the v2 client activates only when the server status endpoint explicitly reports that v2 is enabled for the selected adventure.

## Behavior

- Loads the presentation-only v2 client and browser bridge.
- Checks `/api/storyline-v2/status` before starting a v2 session.
- Starts a v2 session only for a server-advertised adventure.
- Renders server-issued catalogs through `StorylineV2Client`.
- Submits server-issued action IDs with the current catalog version.
- Falls back silently to legacy `startGame()` when disabled, unavailable, or failed.

## Verification

- Full extracted inline frontend JavaScript parses successfully.
- Browser bridge contract test passes.
- Client, core, Dracula adapter, service, and API suites pass.
- Deployed commit `e305323` reached the VPS.
- PM2 is online and the HTTPS health endpoint returns `200`.
- Production status confirms v2 remains disabled by default.
- Production HTML and bridge asset are served correctly.

## Related

- [Storyline v2 Client Adapter](storyline-v2-client-adapter-2026-08-19.md)
- [Storyline v2 API Transport](storyline-v2-api-transport-2026-08-19.md)
- [Storyline v2 Universal Manifest Engine Specification](storyline-v2-specification.md)
