# MCP server

HookMyApp ships a hosted MCP (Model Context Protocol) server so an AI agent can operate HookMyApp directly — no CLI install, no shell. It exposes the same product surface the CLI covers for workspace, customer, channel, webhook, and delivery-log management, plus message sending.

```text
https://api.hookmyapp.com/mcp
```

## MCP or CLI?

| Situation | Use |
|-----------|-----|
| Agent has terminal access (Claude Code, Codex CLI, a dev machine) and the integration involves env files, tunnels, or starter kits | **CLI** — it owns credential issuance, tunnel lifecycle, and `.env` writing. Everything else in this skill. |
| Agent supports MCP but has no shell (hosted agents, IDE agents without terminal, custom agent runtimes) | **MCP** — this reference. |
| Task is pure account operations (list customers, mint onboarding links, flip forwarding, read delivery logs) and an MCP connection already exists | **MCP** — fewer moving parts than shelling out. |

The two are interchangeable for management operations; they read and mutate the same account. What MCP does NOT do: mint `hmat_` gateway access tokens, write env files, or open tunnels — provisioning a code integration stays a CLI job.

## Authentication

Two options; pick what the MCP client supports.

**Browser sign-in (OAuth).** Configure only the URL. The server publishes standard OAuth protected-resource metadata at `https://api.hookmyapp.com/.well-known/oauth-protected-resource/mcp`, so OAuth-capable clients discover the authorization server on their own — the human signs in to HookMyApp in the browser and picks an organization.

**API key.** An org admin creates an API key in the HookMyApp app (Organization → API). Keys are prefixed `hmok_` and are passed either way:

```http
Authorization: Bearer hmok_...
```

```http
X-API-Key: hmok_...
```

Send exactly one of the two headers, not both. Use `X-API-Key` only when the client can't set an `Authorization` header.

### Client setup

```bash
export HOOKMYAPP_API_KEY="hmok_..."
```

Codex CLI:

```bash
# browser sign-in
codex mcp add hookmyapp --url https://api.hookmyapp.com/mcp
codex mcp login hookmyapp
# or API key
codex mcp add hookmyapp --url https://api.hookmyapp.com/mcp --bearer-token-env-var HOOKMYAPP_API_KEY
```

Claude Code:

```bash
# browser sign-in: add, then run /mcp inside Claude Code
claude mcp add --transport http hookmyapp https://api.hookmyapp.com/mcp
# or API key
claude mcp add --transport http hookmyapp https://api.hookmyapp.com/mcp \
  --header "Authorization: Bearer $HOOKMYAPP_API_KEY"
```

Cursor (`mcpServers` in settings):

```json
{
  "mcpServers": {
    "hookmyapp": {
      "url": "https://api.hookmyapp.com/mcp",
      "headers": { "Authorization": "Bearer ${env:HOOKMYAPP_API_KEY}" }
    }
  }
}
```

## Tools (23)

Read:

| Tool | Use it for |
| --- | --- |
| `status` | Check auth, organization, granted scopes, usage, and suggested next steps. **Call this first.** |
| `list_workspaces` | List workspaces and customers |
| `list_customers` | List customers in the organization (SaaS Mode) |
| `list_channels` | List channels in one workspace — pass the `ws_` ID from `list_workspaces` |
| `get_channel` | Read one channel (type, identity, forwarding state, destination) |
| `get_webhook_config` | Read a channel's webhook destination |
| `get_hmac_secret` | Read a channel's current webhook signing secret without rotating it |
| `list_deliveries` | List delivery logs for a channel, newest first, cursor-paged |
| `get_delivery` | Read one delivery log by channel + the `wd_` ID from `list_deliveries` |
| `get_org_usage` | Check monthly organization usage |
| `list_onboarding_links` | List customer connect links (SaaS Mode) |

Write:

| Tool | Use it for |
| --- | --- |
| `create_workspace` | Create a workspace |
| `delete_workspace` | Delete a workspace by its `ws_` ID (org admin only; team and customer workspaces alike). Two outcomes: a workspace with no channels and no usage history is hard-deleted; otherwise it is deprecated — channels disconnected, history kept for stats/billing. The organization's last workspace is refused (`LAST_WORKSPACE`) |
| `create_customer` | Create a customer (SaaS Mode) |
| `create_onboarding_link` | Mint a connect link a customer opens to connect their channel |
| `revoke_onboarding_link` | Revoke an onboarding link by its `ol_` ID so its connect URL stops working (org admin only) |
| `send_message` | Send an outbound message on a channel (channel `ch_` ID + the Meta message content object) |
| `set_webhook_destination` | Set a channel's webhook destination URL (+ optional verify token) |
| `clear_webhook_destination` | Clear a channel's webhook destination |
| `rotate_hmac` | Rotate a channel's webhook signing secret |
| `set_forwarding` | Enable or disable webhook forwarding for a channel |
| `set_org_destination` | Set the organization default destination seeded onto new customer channels (org admin + SaaS Mode) |
| `apply_org_destination_to_channels` | Bulk-apply (or clear) the organization destination across customer channels |

## Working order

1. `status` — confirms identity, organization, and scopes before anything else. If a later call fails with a scope error, re-run `status` and report the missing scope to the human instead of retrying.
2. `list_workspaces` before any per-workspace tool — channel tools need a `ws_` ID.
3. SaaS Mode flow: list customers → create/choose a customer → `create_onboarding_link` for that customer → after the customer connects, `list_channels` with the **customer's** `ws_` ID → send / manage webhooks on the customer channel. Don't list your own workspace channels when you mean a customer's.

## Safety rules

The skill-wide safety rules apply unchanged over MCP:

- **Confirm before mutating.** `set_webhook_destination`, `clear_webhook_destination`, `set_forwarding` (disabling = silent inbound message drop), `rotate_hmac` (old signatures stop verifying immediately), `set_org_destination`, `apply_org_destination_to_channels`, `delete_workspace` (disconnects every channel in the workspace — inbound traffic stops), and `revoke_onboarding_link` (the connect URL stops working immediately) all change live message routing or connectivity — get explicit human confirmation, including the exact channel, customer, workspace, organization, or `ol_` onboarding-link ID, before calling.
- **`send_message` sends a real message** to a real person. Confirm recipient channel and content.
- **Never paste `hmok_` API keys** into chat, tickets, or logs. They are org-scoped credentials; the human creates and stores them.
- **Verify token ≠ HMAC secret.** The verify token answers the webhook subscription handshake; the HMAC secret (rotated by `rotate_hmac`) signs delivered payloads (`X-HookMyApp-Signature-256`). Don't conflate them when reading `get_webhook_config` output back to the human.
