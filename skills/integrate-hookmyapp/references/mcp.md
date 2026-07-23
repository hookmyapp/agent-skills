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

## MCP is optional — never a setup blocker

Setting up HookMyApp does **not** require MCP. The CLI covers everything MCP does for account operations, plus the things MCP cannot do (env files, tunnels, `hmat_` tokens). Treat MCP as an upgrade for agents that prefer tool calls over shelling out. If MCP is missing, misconfigured, or its tools are dormant, do the work with the CLI and say so plainly — do not tell the user their task is blocked.

## Authentication

Two working options; pick what the MCP client supports.

**1. CLI header injection — Claude Code, zero-touch.** Nothing to sign in to. `hookmyapp login` already configures it: the CLI writes an MCP entry whose `headersHelper` runs `hookmyapp mcp-headers`, and Claude Code calls that helper on every request to get a fresh `Bearer hmok_…` from the CLI's stored credential.

```bash
hookmyapp mcp install --agent claude   # re-run to repair; needs CLI >= 0.14.2
hookmyapp doctor                       # reports MCP connection status
```

Requires the `hookmyapp` binary to be resolvable from the PATH that Claude Code hands the helper process. A normal global install (`npm install -g @gethookmyapp/cli`) satisfies this; an unusual npm prefix may not — see [Recovery](#recovery-mcp-isnt-working).

**Newly added MCP servers do not activate mid-session.** Claude Code resolves MCP tools at session start, so a server installed during a session stays dormant until the next one. That is expected, not a failure.

**2. API key — any client.** An org admin creates an API key in the HookMyApp app (Organization → API). Keys are prefixed `hmok_` and are passed either way:

```http
Authorization: Bearer hmok_...
```

```http
X-API-Key: hmok_...
```

Send exactly one of the two headers, not both. Use `X-API-Key` only when the client can't set an `Authorization` header.

**Browser sign-in (OAuth) is not currently available.** The server publishes protected-resource metadata at `https://api.hookmyapp.com/.well-known/oauth-protected-resource/mcp`, but token issuance for MCP clients is not operational — clients that attempt it fail with `error=invalid_scope`. Do not send the user to `/mcp` sign-in in Claude Code or `codex mcp login`; use option 1 or 2 instead.

### Client setup

```bash
export HOOKMYAPP_API_KEY="hmok_..."
```

Claude Code — let the CLI do it, do not hand-roll `claude mcp add`:

```bash
hookmyapp mcp install --agent claude
```

`hookmyapp login` already runs this for you. Adding the server by hand with `claude mcp add` produces an entry with **no** credential helper, which cannot authenticate.

Codex CLI:

```bash
codex mcp add hookmyapp --url https://api.hookmyapp.com/mcp --bearer-token-env-var HOOKMYAPP_API_KEY
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

## Recovery: MCP isn't working

Work top to bottom; each row assumes the ones above it passed.

| Symptom | What it means | Fix |
|---------|---------------|-----|
| `mcp__hookmyapp__*` tools absent, but `claude mcp list` says ✔ Connected | The server was installed during this session; tools resolve at session start only | Nothing is broken. Do the task with the CLI now, and tell the user a restart activates the tools. **Never report the task as blocked.** |
| `claude mcp list` shows `✘ Failed to connect` or `! Needs authentication` | The credential helper produced no token | Run `hookmyapp mcp-headers`. It must print `{"Authorization":"Bearer hmok_…"}`. See the two rows below for the two ways it fails. |
| `hookmyapp mcp-headers` → `unknown command 'mcp-headers'` | CLI older than 0.14.2 is first on PATH | `npm install -g @gethookmyapp/cli@latest`, confirm with `hookmyapp --version`, then `hookmyapp mcp install --agent claude` |
| `hookmyapp mcp-headers` → not-logged-in error | No stored credential | `hookmyapp login`, which also reinstalls the MCP entry |
| Helper works in your shell, client still won't authenticate | `hookmyapp` is not on the PATH the client gives the helper process (unusual npm prefix such as `~/.local/node/bin`) | Re-point the entry at an absolute path: `command -v hookmyapp` to find it, then `claude mcp add-json --scope user hookmyapp '{"type":"http","url":"https://api.hookmyapp.com/mcp","headersHelper":"/absolute/path/to/hookmyapp mcp-headers"}'` |
| Browser sign-in returns `error=invalid_scope` | The OAuth path is not operational | Use CLI header injection or an API key; do not retry the browser flow |
| A tool call fails with a scope error | The credential lacks that action | Re-run `status`, report the missing scope to the human, do not retry |

`hookmyapp doctor` summarizes CLI, login, and MCP status in one command — run it first when a user reports "the MCP isn't working".

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
| `get_hmac_secret` | Read a channel's current webhook signing secret without rotating it. The value signs every delivered webhook — treat it like a password: never echo it into chat, logs, or client-visible output; if it leaks, `rotate_hmac` |
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
