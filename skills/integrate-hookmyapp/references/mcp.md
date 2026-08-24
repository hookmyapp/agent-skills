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

**1. CLI setup — every agent on the machine.** `hookmyapp agent setup` configures Claude Code, Codex and Cursor in one go, and `hookmyapp login` does the same for whatever it finds.

```bash
hookmyapp agent setup   # re-run to repair; needs CLI >= 0.14.19
hookmyapp doctor        # reports MCP connection status
```

Claude Code needs no sign-in: the entry carries a `headersHelper` that runs `hookmyapp mcp-headers`, and Claude Code calls it on every request for a fresh token from the CLI's stored credential. Codex and Cursor sign in once through the browser instead:

```bash
codex mcp login hookmyapp   # Cursor signs in from its MCP settings
```

Requires the `hookmyapp` binary to be resolvable from the PATH that Claude Code hands the helper process. A normal global install (`npm install -g @gethookmyapp/cli`) satisfies this; an unusual npm prefix may not — see [Recovery](#recovery-mcp-isnt-working).

**Newly added MCP servers do not activate mid-session.** Every client resolves MCP tools at session start, so a server configured during a session stays dormant until the next one. That is expected, not a failure. It also means a tool call cannot verify a setup you just ran: the tools you can see still point at the previous configuration, so the call answers from the old server and proves nothing. Check `codex mcp get hookmyapp` or `claude mcp get hookmyapp` instead, and tell the user to restart.

**2. API key — any client.** An org admin creates an API key in the HookMyApp app (Organization → API). Keys are prefixed `hmok_` and are passed either way:

```http
Authorization: Bearer hmok_...
```

```http
X-API-Key: hmok_...
```

Send exactly one of the two headers, not both. Use `X-API-Key` only when the client can't set an `Authorization` header.

**Browser sign-in (OAuth) works.** Add the server by URL with `claude mcp add --transport http hookmyapp https://api.hookmyapp.com/mcp`, then run `/mcp`, pick `hookmyapp`, and approve in the browser. Codex does the same with `codex mcp login hookmyapp`.

### Client setup

```bash
export HOOKMYAPP_API_KEY="hmok_..."
```

When the CLI is installed, let it do the wiring for all three instead of hand-rolling per-client config:

```bash
hookmyapp agent setup
```

Hand-rolling is right only when there is no CLI on the machine. An entry added by hand has **no** credential helper, so Claude Code authenticates only through `/mcp` → pick `hookmyapp` → approve in the browser, never automatically.

The blocks below are the API-key path, for CI and headless environments where no browser sign-in is possible.

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
| `hookmyapp agent setup` errors with `unknown command 'agent'` | CLI older than 0.14.19 is first on PATH | `npm install -g @gethookmyapp/cli@latest`, confirm with `hookmyapp --version`, then re-run |
| The helper check errors with `unknown command 'mcp-headers'` | CLI older than 0.14.2 is first on PATH | `npm install -g @gethookmyapp/cli@latest`, confirm with `hookmyapp --version`, then `hookmyapp agent setup` |
| The helper check errors with a not-logged-in message | No stored credential | `hookmyapp login`, which also reinstalls the MCP entry |
| Helper works in your shell, client still won't authenticate | `hookmyapp` is not on the PATH the client gives the helper process (unusual npm prefix such as `~/.local/node/bin`) | Re-point the entry at an absolute path: `command -v hookmyapp` to find it, then `claude mcp add-json --scope user hookmyapp '{"type":"http","url":"https://api.hookmyapp.com/mcp","headersHelper":"/absolute/path/to/hookmyapp mcp-headers"}'` |
| Browser sign-in returns `error=invalid_scope` | The browser flow normally works, so this is a client-side scope mismatch (often a stale server entry from an older setup) | Remove and re-add the entry (`claude mcp remove hookmyapp`, then the `claude mcp add` line above) and sign in again via `/mcp`. If it recurs, fall back to CLI header injection or an API key and report it to HookMyApp support |
| A tool call fails with a scope error | The credential lacks that action | Re-run `status`, report the missing scope to the human, do not retry |

`hookmyapp doctor` summarizes CLI, login, and MCP status in one command — run it first when a user reports "the MCP isn't working".

## Tools (43)

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
| `list_sandbox_sessions` | List sandbox testing sessions in a workspace (`workspaceId`, optional `includeInactive`). A sandbox session is a phone or Instagram account bound to the SHARED HookMyApp sandbox number — **not a channel**: it has an `ssn_` ID, no `ch_` ID, and never appears in `list_channels` or `status.channelCount` |
| `get_sandbox_logs` | Delivery log for a sandbox session (`sessionId`, optional `since`/`until` ISO bounds, `limit`, `cursor`) — the sandbox counterpart of `list_deliveries`, which only covers channels. An inbound message with no destination set is recorded as `not_delivered` / "No sandbox destination" |
| `list_onboarding_links` | List customer connect links (SaaS Mode) |
| `list_support_tickets` | List your organization's 20 most recent support tickets (org-wide — whichever credential or surface opened them) |
| `get_support_ticket` | Read a support-ticket conversation and check for replies; optional `wait` (1-25s) holds for a new reply, `afterCursor` = the previous response's `nextCursor` |
| `list_instagram_comments` | List comments on an Instagram media (`mediaId`) or the replies of a comment (`commentId`), with explicit `fields` and cursor paging. Instagram channels only |
| `get_instagram_insights` | Read account or per-media Instagram insights: `target` (`"account"` or a media id), `metrics[]`, optional `period` and `breakdown`, `timeframe` (required for demographics). Account metrics may include the profile counters `followers_count`/`follows_count`/`media_count`. Unavailable metrics come back in an `unavailable[]` list instead of failing the whole call |
| `list_instagram_media` | List an Instagram account's own posts (`source: "posts"`, default), the stories still inside their 24h window (`"stories"`), or posts other accounts tagged it in (`"tagged"`). Pass `mediaId` instead to read one post with its carousel `children`. **This is where media ids come from** — `get_instagram_insights` and `list_instagram_comments` both need one, and an inbound webhook is the only other source |
| `list_instagram_mentions` | List posts and comments where other accounts @mentioned this one, with the post each mention sits on. Reply with `reply_instagram_comment` using the mention id |
| `list_instagram_conversations` | List DM threads (most recently updated first), read one thread's messages with `conversationId`, or read the public profile behind an IGSID with `participantId`. Read the thread before `send_message` so a reply has the history in view |
| `get_instagram_account` | Read the account profile (username, name, bio, website, picture, follower/following/post counts), plus the daily publishing quota when `includePublishingLimit` is set — worth checking before `publish_instagram_media` on a busy account |

Write:

| Tool | Use it for |
| --- | --- |
| `create_workspace` | Create a workspace |
| `delete_workspace` | Delete a workspace by its `ws_` ID (org admin only; team and customer workspaces alike). Two outcomes: a workspace with no channels and no usage history is hard-deleted; otherwise it is deprecated — channels disconnected, history kept for stats/billing. The organization's last workspace is refused (`LAST_WORKSPACE`) |
| `create_customer` | Create a customer (SaaS Mode) |
| `create_onboarding_link` | Mint a connect link a customer opens to connect their channel |
| `revoke_onboarding_link` | Revoke an onboarding link by its `ol_` ID so its connect URL stops working (org admin only) |
| `start_sandbox_session` | Get the caller's sandbox bind code plus a `wa.me` deep link (optional `workspaceId`; required when the org has several team workspaces). The human sends that code to the sandbox number **from the phone they want to bind** — you cannot do this step for them. Returns the same code until it is consumed. This is the no-Meta-app, no-WABA path: use it instead of `create_onboarding_link` whenever someone wants to test |
| `set_sandbox_destination` | Point a sandbox session at a destination webhook URL (`sessionId`, `url`). Verified with a live handshake before it is stored. Without a destination, inbound sandbox messages go nowhere |
| `send_sandbox_message` | Reply to the phone bound to a WhatsApp sandbox session (`sessionId`, `message`). WhatsApp only — Instagram sandbox replies are CLI-only. Subject to WhatsApp's 24h window (`SESSION_WINDOW_CLOSED`) and to the shared-number caps (10/min per session, `RATE_LIMIT_SESSION`) |
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
| `set_instagram_thread_setup` | Set the starter questions on a new DM thread (up to 4; tapping one posts its `payload` to the webhook) and the always-visible thread menu (up to 5 links), or `clear: true` to remove both. Replaces whatever is set |

The Instagram tools require an **Instagram Login** channel. A channel connected via Facebook Login returns an **unsupported-login-flow** error; the account must be connected through Instagram OAuth. Reads (`list_instagram_comments`, `get_instagram_insights`, `list_instagram_media`, `list_instagram_mentions`, `list_instagram_conversations`, `get_instagram_account`) run under the `channel.read` action; mutations (`publish_instagram_media`, `reply_instagram_comment`, `moderate_instagram_comment`, `set_instagram_thread_setup`) run under `channel.manage`. An Instagram-Login channel connected before these abilities were available returns a **reconnect-required** error — the human re-runs `hookmyapp channels connect instagram` for that account, then the tool works. Media constraints, publish quota, insight metric names, and the comment-webhook payload shapes are in [instagram.md](instagram.md).

**Sandbox sessions are not channels.** Every channel-scoped tool (`list_channels`, `get_channel`, `list_deliveries`, `send_message`, `get_webhook_config`, `set_webhook_destination`) is keyed to a `ch_` ID and is blind to sandbox traffic. Before telling a human that nothing is connected, check **both**: `status` reports `sandboxSessionCount` alongside `channelCount`, and `list_channels` returns `sandboxSessionCount` next to its `channels[]`. An org can have zero channels and a live sandbox session — answering "no number connected" there is wrong. Full CLI equivalents in [sandbox.md](sandbox.md).

## Working order

1. `status` — confirms identity, organization, and scopes before anything else, and surface any `notifications[]` to the human before proceeding (then `acknowledge_notification` each one). If a later call fails with a scope error, re-run `status` and report the missing scope to the human instead of retrying.
2. `list_workspaces` before any per-workspace tool — channel tools need a `ws_` ID.
3. Testing without a Meta app: `start_sandbox_session` → relay the code and link to the human → poll `list_sandbox_sessions` until the session is active → `set_sandbox_destination` → `get_sandbox_logs` / `send_sandbox_message`. Never route a "let me test WhatsApp" request to `create_onboarding_link`; that is the production Embedded Signup path and needs a number the human owns.
4. SaaS Mode flow: list customers → create/choose a customer → `create_onboarding_link` for that customer → after the customer connects, `list_channels` with the **customer's** `ws_` ID → send / manage webhooks on the customer channel. Don't list your own workspace channels when you mean a customer's.

## Safety rules

The skill-wide safety rules apply unchanged over MCP:

- **Confirm before mutating.** `set_webhook_destination`, `clear_webhook_destination`, `set_forwarding` (disabling = silent inbound message drop), `rotate_hmac` (old signatures stop verifying immediately), `set_org_destination`, `apply_org_destination_to_channels`, `delete_workspace` (disconnects every channel in the workspace — inbound traffic stops), and `revoke_onboarding_link` (the connect URL stops working immediately) all change live message routing or connectivity — get explicit human confirmation, including the exact channel, customer, workspace, organization, or `ol_` onboarding-link ID, before calling.
- **`send_message` sends a real message** to a real person. Confirm recipient channel and content.
- **`send_sandbox_message` also sends a real WhatsApp message** — to the human's own bound phone. Confirm content. `set_sandbox_destination` re-points live sandbox traffic, so confirm the URL.
- **`publish_instagram_media` posts real, public content** to the account's feed, reels, or story. `reply_instagram_comment` posts a public reply (or DMs a real user); `moderate_instagram_comment` hides or deletes real comments, and `delete` is irreversible. Confirm channel, target ids, and content with the human before calling any of them.
- **Never paste `hmok_` API keys** into chat, tickets, or logs. They are org-scoped credentials; the human creates and stores them.
- **Verify token ≠ HMAC secret.** The verify token answers the webhook subscription handshake; the HMAC secret (rotated by `rotate_hmac`) signs delivered payloads (`X-HookMyApp-Signature-256`). Don't conflate them when reading `get_webhook_config` output back to the human.
