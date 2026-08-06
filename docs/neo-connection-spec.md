# Neo Agent Connection Spec
*For: Lawman — Connecting to Morpheus (Matrix Agent)*
*Drafted: August 6, 2026*

---

## Overview

Morpheus is the conversational agent running on a Neo deployment (Matrix platform by Paxlabs). To connect remotely, Lawman needs two things from the deployment owner: the **host URL** and an **authentication credential**. This document covers the API shape, required credentials, and integration patterns.

---

## API Surface

### Primary Interface

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/chat` | POST | Send a user message; response streams back over SSE |
| `/events` | GET | SSE event stream carrying replies, tool steps, workspace events |
| `/events/replay/{conversation}` | GET | Replay a conversation's durable event trace |
| `/halt` | POST | Interrupt every live run |

### Conversation History

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/conversations` | GET | List conversation history from durable store |

### Workspace & Projects

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/workspace/*` | GET/POST | File tree, read/write, download, upload, diff, exec |
| `/projects` | GET/POST | Workbench project registry |

### Media & Build

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/media/{id}` | GET | Serve generated/uploaded media artifacts |
| `/upload` | POST | Upload a file to the agent's machine volume |
| `/build-jobs` | GET/POST | Create and inspect durable async Build jobs |

### Desktop (Disposable)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/dojo/session` | GET | Live desktop session state |
| `/dojo/boot` | POST | Start the disposable desktop |
| `/dojo/shutdown` | POST | Stop the desktop (work ships home first) |

### Memory (Neocortex)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/memory/search` | POST | Search learned memories |
| `/memory/recent` | GET | List recent learned memories |
| `/memory/mutate` | POST | Create/update/delete memories |
| `/memory/export` | GET | Export all current memories as JSON |

---

## Required Credentials

**You need to get these from the deployment owner (Paxlabs / Matrix admin):**

### 1. Host URL
- The base URL where the Neo daemon is reachable (e.g., `https://neo.matrix.paxlabs.io` or `https://your-instance.example.com`)
- Could also be an IP + port if self-hosted

### 2. Authentication
- **API key, bearer token, or session cookie** — the exact mechanism depends on how the instance is configured
- Common patterns: `Authorization: Bearer <token>`, `X-API-Key: <key>`, or a cookie set via a login flow
- Ask: "What auth header or credential do I need to include in requests to `/chat`?"

---

## Integration Pattern: Sending a Message & Reading the Reply

```
# 1. Send a message
POST /chat
Content-Type: application/json
Authorization: Bearer <TOKEN>

{
  "message": "What's the status of Phase 2?",
  "conversation_id": "optional-existing-thread-id"
}

# 2. Stream the response
GET /events
Accept: text/event-stream
Authorization: Bearer <TOKEN>

# Events arrive as SSE:
# event: message
# data: {"type":"text","content":"Here's the Phase 2 status..."}
#
# event: tool_step
# data: {"tool":"memory_recall","status":"completed","result":"..."}
#
# event: done
# data: {"conversation_id":"abc123"}
```

### Key Notes
- There is **no OpenAI-compatible endpoint** — `/v1/chat/completions` does not exist
- The only way to interact is `POST /chat` + reading `GET /events` (SSE)
- Responses stream in real-time; consume the SSE stream to get the full reply
- Pass a `conversation_id` to continue an existing thread; omit it to start fresh

---

## What Lawman Should Send Back

Once he has access, he needs to provide:

1. **Base URL** — where the Neo instance is hosted
2. **Auth mechanism** — what header/credential to use and the actual token/key
3. **Any IP allowlisting or VPN requirements** — if the instance isn't public

With those three things, the connection can be wired up immediately.

---

## Questions to Ask the Deployment Owner

1. "What is the public URL for this Neo instance?"
2. "How do I authenticate — API key, bearer token, or something else?"
3. "Is there an IP allowlist or VPN I need to join first?"
4. "Is there a rate limit I should know about?"
5. "Can I get a dedicated conversation_id for persistent context, or should I manage session state myself?"
