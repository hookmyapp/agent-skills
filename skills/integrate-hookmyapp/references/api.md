# Public REST API

The HookMyApp REST API lets **your backend code** manage the organization at runtime — create customers, mint onboarding links, read channels and tokens, set webhook destinations, and inspect delivery logs — without shelling out to the CLI or holding an MCP connection.

```text
https://api.hookmyapp.com
```

## When to use which surface

| Surface | Caller | Use it for |
|---------|--------|-----------|
| CLI | A human or agent at a terminal | Provisioning: login, connect, env files, tunnels, day-to-day operations |
| MCP | An MCP-capable agent without a shell | Interactive account operations ([references/mcp.md](references/mcp.md)) |
| REST API (this file) | The user's own backend service | Runtime automation inside their product — e.g. mint an onboarding link when one of *their* customers signs up |

All three read and mutate the same account. If the task is a one-off, prefer CLI or MCP; write REST calls into the user's codebase only when their app needs the operation at runtime.

## Authentication

Two tokens, two base URLs:

| Token | Use it for | Base URL |
|-------|-----------|----------|
| `hmok_` org API key | Org, customers, channels, webhooks, delivery logs, agent credentials | `https://api.hookmyapp.com` |
| `hmat_` channel token | Sending messages through one channel | `https://gateway.hookmyapp.com/meta` |

An org admin creates `hmok_` keys in the app (Organization → API); the creation response includes the `org_...` ID used in organization routes. Pass the key as `Authorization: Bearer hmok_...`. **Customer-channel routes additionally need the customer's workspace ID in an `X-Workspace-Id: ws_...` header** — that header is what scopes channel/webhook/delivery calls to one customer.

```bash
curl https://api.hookmyapp.com/meta/channels \
  -H "Authorization: Bearer hmok_..." \
  -H "X-Workspace-Id: ws_..."
```

Keep `hmok_` keys server-side only (env var / secret manager). Never embed them in frontend code or paste them into chat.

## Endpoints

Full request/response schemas: the OpenAPI spec and per-endpoint pages under the HookMyApp docs (SaaS Mode → API). The operation map:

### Customers & workspaces

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/organizations/{orgId}/workspaces?kind=customer` | List customers |
| POST | `/organizations/{orgId}/customers` | Create a customer |
| GET / POST | `/workspaces` | List / create workspaces |
| GET / PATCH | `/workspaces/{workspaceId}` | Get / rename a workspace |

### Onboarding links

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/org/onboarding-links` | Mint a connect link a customer opens to connect their channel |
| GET | `/org/onboarding-links` | List links |
| PATCH | `/org/onboarding-links/{publicId}` | Update a link |
| DELETE | `/org/onboarding-links/{publicId}` | Deactivate a link |
| POST | `/org/onboarding-links/{publicId}/regenerate` | Regenerate a link URL |

### Customer channels (needs `X-Workspace-Id`)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/meta/channels` | List channels in the workspace |
| GET | `/meta/channels/{id}` | Get one channel |
| GET | `/meta/channels/{id}/token` | Read the channel's current `hmat_` token |
| POST | `/meta/channels/{id}/token/rotate` | Rotate the `hmat_` token (old one dies immediately) |
| GET | `/meta/channels/{id}/env` | Get the channel's environment-variable set |
| POST | `/channels/{publicId}/move` | Move a channel to another workspace or customer |

### Webhook destinations (needs `X-Workspace-Id`)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/webhook-config` | Create a webhook destination |
| GET / PUT / DELETE | `/webhook-config/{channelId}` | Get / update / clear a channel's destination |
| GET | `/webhook-config/{channelId}/hmac` | Read the current webhook signing secret |
| POST | `/webhook-config/{channelId}/rotate-hmac` | Rotate the webhook signing secret |

### Delivery logs (needs `X-Workspace-Id`)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/deliveries` | List delivery logs for a channel, newest first |
| GET | `/deliveries/{publicId}` | Get one delivery log (`wd_` ID) |

### Agent credentials (headless auth)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/agent/auth/claim` | Start email-OTP registration |
| POST | `/agent/auth/claim/complete` | Exchange the OTP for an agent credential |
| POST | `/agent/auth` | Register (single-call variants) |
| GET | `/agent/credentials` | List agent credentials |
| GET | `/agent/credentials/eligible-scopes` | List eligible scopes |
| DELETE | `/agent/credentials/{publicId}` | Revoke an agent credential |

This is the machinery behind `hookmyapp login --email`; prefer the CLI for it. Call these directly only when building a custom agent runtime that can't run the CLI.

## Sending messages

Sends do not go through `api.hookmyapp.com`. Fetch the channel's `hmat_` token (`GET /meta/channels/{id}/token`), then POST to the gateway — the path after `/meta` is verbatim Meta Graph API:

```bash
curl -X POST https://gateway.hookmyapp.com/meta/v22.0/{PHONE_NUMBER_ID}/messages \
  -H "Authorization: Bearer hmat_..." \
  -H "Content-Type: application/json" \
  -d '{"messaging_product":"whatsapp","to":"15551234567","type":"text","text":{"body":"Hello"}}'
```

Instagram uses the IG body shape instead (`{"recipient":{"id":"<IGSID>"},"message":{"text":"..."}}`). Full send recipes and code samples: [references/sending-messages.md](references/sending-messages.md).

## SaaS Mode runtime flow

The canonical loop a SaaS backend implements:

1. Customer signs up in *your* product → `POST /organizations/{orgId}/customers`.
2. Mint a connect link → `POST /org/onboarding-links` → show it to the customer; they connect their own WhatsApp/Instagram (no HookMyApp account needed).
3. After they connect → `GET /meta/channels` with the customer's `X-Workspace-Id` to find the channel.
4. Point inbound traffic at your backend → `POST /webhook-config` (verify the `X-HookMyApp-Signature-256` HMAC on delivery — see [references/webhook.md](references/webhook.md)).
5. Send outbound via the gateway with the channel's `hmat_` token.

## Safety rules

Skill-wide rules apply: webhook-destination changes and forwarding flips reroute live customer messages — confirm before mutating. Rotations (`token/rotate`, `rotate-hmac`) invalidate the old credential immediately; make sure the consuming service is updated in the same deploy. The verify token (subscription handshake) and the HMAC signing secret are two different things — never conflate them.
