# Storyline v2 API Transport — 2026-08-19

> Source: Implementation progress in the Storyline v2 restart.

## Summary

Added an isolated Fastify transport boundary for Storyline v2. It is disabled by default and does not replace or alter the legacy Storyline route.

## Endpoints

- `GET /api/storyline-v2/status`
- `POST /api/storyline-v2/sessions`
- `GET /api/storyline-v2/sessions/:id`
- `POST /api/storyline-v2/sessions/:id/actions`

The action endpoint accepts either a catalog-bound `actionId` submission or free text. Free text is routed through deterministic current-catalog matching before entering the same resolver.

## Safety boundary

- Enabled only through the explicit `storylineV2Enabled` server option or `STORYLINE_V2_ENABLED=true`.
- Disabled mode returns 404 for v2 session creation and leaves the legacy path untouched.
- The v2 service owns its own session map and does not reuse Campaign or legacy Storyline state.
- The API returns server-issued catalogs and canonical resolver results.

## Verification

Fastify injection tests pass for disabled mode, status, session creation, catalog retrieval, button actions, state advancement, and unmatched text rejection.

## Related

- [Storyline v2 Dracula Adapter](storyline-v2-dracula-adapter-2026-08-19.md)
- [Storyline v2 Universal Manifest Engine Specification](storyline-v2-specification.md)
