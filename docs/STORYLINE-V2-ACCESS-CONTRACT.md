# Storyline V2 Access Contract

## Current personal test surface

The personal test surface is separate from `/api/storyline-v2` and uses:

- `STORYLINE_V2_PERSONAL_TEST_TOKEN` as deployment-only configuration;
- `Authorization: Bearer <token>` on every request;
- `/api/storyline-v2-personal/*` routes;
- a Dracula-only registry;
- HTTP 401 for missing or invalid credentials;
- constant-time token comparison;
- no token in URLs, source, persistence, or logs.

The surface is unavailable when no token is configured. The normal V2 flag and routes are unaffected.

## Future beta contract

The personal token is a temporary single-operator adapter, not the final beta identity model. The future beta layer should resolve an authenticated participant to an authorization scope before allowing session operations:

```text
participant
  id: stable opaque identifier
  status: active | revoked | expired
  scopes: storyline-v2:dracula | ...
  expiresAt

session authorization
  sessionId
  participantId
  adventureId
  createdAt
  lastSeenAt
```

Every session read/write must verify participant ownership or an explicit support capability. Invite credentials should be revocable, expiring, individually attributable, and separate from deployment/admin credentials.

## Deferred beta features

Individual invitations, login UI, revocation management, consent, feedback linking, rate limiting, and support recovery are intentionally deferred until the personal playtest stabilizes the product.
