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

Setting up HookMyApp does **not** require MCP. The CLI covers everything MCP does for account operations, plus the things MCP cannot do (env files, tunnels, `hmat_` tokens). Treat MCP as an upgrade for agents that prefer tool calls over shelling out. If MCP is missing, misconfigured, or its tools are dormant **and you have shell access**, do the work with the CLI and say so plainly — do not tell the user their task is blocked. A shell-less agent with no working MCP connection genuinely cannot proceed: say exactly that (MCP unavailable, no terminal to fall back to) and point the user at the API-key setup below instead of improvising.

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

**Browser sign-in (OAuth) works.** Add the server by URL with `claude mcp add --transport http hookmyapp https://api.hookmyapp.com/mcp`, then run `/mcp`, pick `hookmyapp`, and approve in the browser. For Codex CLI, use the API-key path below instead.

### Client setup

```bash
export HOOKMYAPP_API_KEY="hmok_..."
```

Claude Code — when the CLI is installed, let it do the wiring instead of hand-rolling `claude mcp add`:

```bash
hookmyapp mcp install --agent claude
```

`hookmyapp login` already runs this for you, wiring a credential helper that injects a fresh token on every request. Hand-rolling `claude mcp add` is right only for the browser sign-in path above (no CLI on the machine): an entry added by hand has **no** credential helper, so it authenticates only through `/mcp` → pick `hookmyapp` → approve in the browser, never automatically.

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
| `mcp__hookmyapp__*` tools absent, but `claude mcp list` says ✔ Connected | The server was installed during this session; tools resolve at session start only | Nothing is broken. If you have shell access, do the task with the CLI now and tell the user a restart activates the tools — **never report the task as blocked when the CLI is available.** |
| `claude mcp list` shows `✘ Failed to connect` or `! Needs authentication` | The credential helper produced no token | Run `hookmyapp mcp-headers >/dev/null && echo helper-ok` — **never print its output; it contains a live org credential** that would land in transcripts and logs. If it errors instead of `helper-ok`, see the two rows below. |
| The helper check errors with `unknown command 'mcp-headers'` | CLI older than 0.14.2 is first on PATH | `npm install -g @gethookmyapp/cli@latest`, confirm with `hookmyapp --version`, then `hookmyapp mcp install --agent claude` |
| The helper check errors with a not-logged-in message | No stored credential | `hookmyapp login`, which also reinstalls the MCP entry |
| Helper works in your shell, client still won't authenticate | `hookmyapp` is not on the PATH the client gives the helper process (unusual npm prefix such as `~/.local/node/bin`) | Re-point the entry at an absolute path: `command -v hookmyapp` to find it, then `claude mcp add-json --scope user hookmyapp '{"type":"http","url":"https://api.hookmyapp.com/mcp","headersHelper":"/absolute/path/to/hookmyapp mcp-headers"}'` |
| Browser sign-in returns `error=invalid_scope` | The browser flow normally works, so this is a client-side scope mismatch (often a stale server entry from an older setup) | Remove and re-add the entry (`claude mcp remove hookmyapp`, then the `claude mcp add` line above) and sign in again via `/mcp`. If it recurs, fall back to CLI header injection or an API key and report it to HookMyApp support |
| A tool call fails with a scope error | The credential lacks that action | Re-run `status`, report the missing scope to the human, do not retry |

`hookmyapp doctor` summarizes CLI, login, and MCP status in one command — run it first when a user reports "the MCP isn't working".

## Tools (38)

Read:

| Tool | Use it for |
| --- | --- |
| `status` | Check auth, organization, granted scopes, usage, and suggested next steps. **Call this first.** Returns `notifications[]` — unacknowledged notifications; relay them to the human. |
| `list_workspaces` | List workspaces and customers |
| `list_customers` | List customers in the organization (SaaS Mode) |
| `list_channels` | List channels in one workspace — pass the `ws_` ID from `list_workspaces` |
| `get_channel` | Read one channel (type, identity, forwarding state, destination) |
| `get_webhook_config` | Read a channel's webhook destination |
| `get_hmac_secret` | Read a channel's current webhook signing secret without rotating it. The value signs every delivered webhook — treat it like a password: never echo it into chat, logs, or client-visible output; if it leaks, `rotate_hmac` |
| `list_deliveries` | List delivery logs for a channel, newest first, cursor-paged |
| `get_delivery` | Read one delivery log by channel + the `wd_` ID from `list_deliveries` |
| `get_org_usage` | Check organization usage for the current quota period (each org has its own monthly reset date; `resetsAt` in the response says when) |
| `get_alert_phone_status` | Check the human's own alert phone (masked) |
| `list_onboarding_links` | List customer connect links (SaaS Mode) |
| `list_support_tickets` | List your organization's 20 most recent support tickets (org-wide — whichever credential or surface opened them) |
| `get_support_ticket` | Read a support-ticket conversation and check for replies; optional `wait` (1-25s) holds for a new reply, `afterCursor` = the previous response's `nextCursor` |
| `list_instagram_comments` | List comments on an Instagram media (`mediaId`) or the replies of a comment (`commentId`), with explicit `fields` and cursor paging. Instagram channels only |
| `get_instagram_insights` | Read account or per-media Instagram insights: `target` (`"account"` or a media id), `metrics[]`, optional `period` and `breakdown`, `timeframe` (required for demographics). Account metrics may include the profile counters `followers_count`/`follows_count`/`media_count`. Unavailable metrics come back in an `unavailable[]` list instead of failing the whole call |

Write:

| Tool | Use it for |
| --- | --- |
| `create_workspace` | Create a workspace |
| `delete_workspace` | Delete a workspace by its `ws_` ID (org admin only; team and customer workspaces alike). Two outcomes: a workspace with no channels and no usage history is hard-deleted; otherwise it is deprecated — channels disconnected, history kept for stats/billing. The organization's last workspace is refused (`LAST_WORKSPACE`) |
| `create_customer` | Create a customer (SaaS Mode) |
| `create_onboarding_link` | Mint a connect link a customer opens to connect their channel |
| `revoke_onboarding_link` | Revoke an onboarding link by its `ol_` ID so its connect URL stops working (org admin only) |
| `send_message` | Send an outbound message on a channel (channel `ch_` ID + the Meta message content object) |
| `update_org_profile` | Update the organization profile (name, support contact) |
| `acknowledge_notification` | Mark a notification from `status` `notifications[]` as seen, after relaying it to the human. Idempotent. Per-user notifications (`ackScope: "user"`) clear only for your user — other members keep their own copy; org notifications (`ackScope: "org"`) clear for the whole organization and record who acked (`acknowledgedBy`). `personal: true` notifications are addressed to your human alone. |
| `set_alert_phone` | Set the human's own alert phone. HookMyApp sends a 6-digit code to it. User-scoped: never for a teammate |
| `verify_alert_phone` | Confirm the alert phone with the code the human received. The code goes to their phone, not to you, so ask them for it |
| `remove_alert_phone` | Remove the human's alert phone. Confirm first and relay: without a number we cannot text them when something breaks |
| `open_support_ticket` | Something failed or got stuck? Open a support ticket describing what you tried, what happened, and the exact error text — no secrets, no customer message content |
| `reply_support_ticket` | Follow up on a support ticket (replying to a resolved ticket reopens it); optional `wait` for the answer |
| `set_webhook_destination` | Set a channel's webhook destination URL (+ optional verify token) |
| `clear_webhook_destination` | Clear a channel's webhook destination |
| `rotate_hmac` | Rotate a channel's webhook signing secret |
| `set_forwarding` | Enable or disable webhook forwarding for a channel |
| `set_org_destination` | Set the organization default destination seeded onto new customer channels (org admin + SaaS Mode) |
| `apply_org_destination_to_channels` | Bulk-apply (or clear) the organization destination across customer channels |
| `publish_instagram_media` | Publish an image, reel, story, or carousel on an Instagram channel: `mediaType`, `imageUrl`/`videoUrl`, `caption`, `children[]` (carousel), `coverUrl`, `shareToFeed`, `trialParams` with `graduationStrategy` set to `"manual"` or `"automatic"` (reels only — trial reel; rejected on any other `mediaType`), plus optional `altText` (image posts), `userTags[]` (`{username, x?, y?}`), `locationId`, `thumbOffset` (ms), `audioName` (reels). Runs Meta's container → status poll → publish flow and returns `{mediaId, permalink}` |
| `reply_instagram_comment` | Public threaded reply to a comment (`commentId`, `text`), or `private: true` to DM the commenter instead (one DM per comment; within 7 days for post/reel comments, Live comments only while the broadcast is live) |
| `moderate_instagram_comment` | `action`: `hide` \| `unhide` \| `delete` \| `disable_media_comments` \| `enable_media_comments`, with `commentId` (comment actions) or `mediaId` (media-level enable/disable) |

The five Instagram tools require an **Instagram Login** channel. A channel connected via Facebook Login returns an **unsupported-login-flow** error; the account must be connected through Instagram OAuth. Reads (`list_instagram_comments`, `get_instagram_insights`) run under the `channel.read` action; mutations (`publish_instagram_media`, `reply_instagram_comment`, `moderate_instagram_comment`) run under `channel.manage`. An Instagram-Login channel connected before these abilities were available returns a **reconnect-required** error — the human re-runs `hookmyapp channels connect instagram` for that account, then the tool works. Media constraints, publish quota, insight metric names, and the comment-webhook payload shapes are in [instagram.md](instagram.md).

## Working order

1. `status` — confirms identity, organization, and scopes before anything else, and surface any `notifications[]` to the human before proceeding (then `acknowledge_notification` each one). If a later call fails with a scope error, re-run `status` and report the missing scope to the human instead of retrying.
2. `list_workspaces` before any per-workspace tool — channel tools need a `ws_` ID.
3. SaaS Mode flow: list customers → create/choose a customer → `create_onboarding_link` for that customer → after the customer connects, `list_channels` with the **customer's** `ws_` ID → send / manage webhooks on the customer channel. Don't list your own workspace channels when you mean a customer's.

## Safety rules

The skill-wide safety rules apply unchanged over MCP:

- **Confirm before mutating.** `set_webhook_destination`, `clear_webhook_destination`, `set_forwarding` (disabling = silent inbound message drop), `rotate_hmac` (old signatures stop verifying immediately), `set_org_destination`, `apply_org_destination_to_channels`, `delete_workspace` (disconnects every channel in the workspace — inbound traffic stops), and `revoke_onboarding_link` (the connect URL stops working immediately) all change live message routing or connectivity — get explicit human confirmation, including the exact channel, customer, workspace, organization, or `ol_` onboarding-link ID, before calling.
- **`send_message` sends a real message** to a real person. Confirm recipient channel and content.
- **`publish_instagram_media` posts real, public content** to the account's feed, reels, or story. `reply_instagram_comment` posts a public reply (or DMs a real user); `moderate_instagram_comment` hides or deletes real comments, and `delete` is irreversible. Confirm channel, target ids, and content with the human before calling any of them.
- **Never paste `hmok_` API keys** into chat, tickets, or logs. They are org-scoped credentials; the human creates and stores them.
- **Verify token ≠ HMAC secret.** The verify token answers the webhook subscription handshake; the HMAC secret (rotated by `rotate_hmac`) signs delivered payloads (`X-HookMyApp-Signature-256`). Don't conflate them when reading `get_webhook_config` output back to the human.
