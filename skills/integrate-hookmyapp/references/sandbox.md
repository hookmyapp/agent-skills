---
name: sandbox
description: Manage a sandbox WhatsApp or Instagram session (dev/testing), pull its env, open a tunnel, and send test messages.
---

# Sandbox

The sandbox is a test account HookMyApp provisions for dev and testing — no Meta dashboard, no embedded signup, no templates. A WhatsApp session is pinned to a single phone number (yours). Recipients are pinned to that session phone server-side; **`--to` does not exist** on `sandbox send` and any attempt to send to a different number is rejected. `sandbox start instagram` opens an Instagram session reached via an ig.me deep link; IG sandbox replies go to the DM thread rather than a pinned phone.

## No terminal? Use MCP

The whole loop exists on the MCP server, so an agent without shell access is not
blocked. Same session, same shared number — only the surface differs:

| CLI | MCP tool |
| --- | --- |
| `sandbox start` | `start_sandbox_session` (returns the bind code + `wa.me` deep link) |
| `sandbox status` | `list_sandbox_sessions` |
| `sandbox webhook set` | `set_sandbox_destination` |
| `sandbox logs` | `get_sandbox_logs` |
| `sandbox send` | `send_sandbox_message` (WhatsApp only) |
| `sandbox env`, `sandbox listen`, `sandbox stop` | CLI only |

The phone step is identical either way: the human sends the code from the device
they want to bind. Tool details and the not-a-channel caveat are in
[mcp.md](mcp.md).

## sandbox start

Start a new sandbox session. Pass the channel type as a positional argument or use `--type`. When omitted the CLI prompts interactively (required in `--json` mode); there is no default type.

**Flags:**

| Flag | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `--type` | `whatsapp\|instagram` | no | (interactive prompt) | Channel type for this session. |
| `--listen` | boolean | no | `false` | After binding, immediately open the tunnel (same as running `sandbox listen` next). |

Global flags that apply: `--json`, `--workspace`.

**Arguments:** `[whatsapp|instagram]` — optional positional alias for `--type`.

**Browser step required:** No — but a phone step is: there is no flag for the phone or handle. The CLI mints a **bind code** and prints it with a deep link; the human sends that code to the sandbox WhatsApp number (or DMs it to the sandbox Instagram account) from the phone/account they want to bind, and the session activates when the code arrives. Under `--json` the CLI emits `{code, type, deepLink}` and exits immediately — deliver the code out-of-band and poll `sandbox status`.

**Examples:**

```bash
hookmyapp sandbox start whatsapp
hookmyapp sandbox start instagram
hookmyapp sandbox start                      # no flag — CLI prompts for the type
```

**Exit codes:** standard CLI codes — see SKILL.md § Exit codes (`0` success; class-based non-zero).

## sandbox status

Show the active sandbox session for this workspace (if any).

**Flags:** `--json`, `--workspace`.

**Examples:**

```bash
hookmyapp sandbox status
```

## sandbox stop

Terminate the active sandbox session.

**Flags:** none per-command. Global `--workspace` is accepted.

**Examples:**

```bash
hookmyapp sandbox stop
```

## sandbox env

Print or write the sandbox env keys. WhatsApp and Instagram sessions write different key sets (six keys each, but different names).

**Flags:**

| Flag | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `--phone` | E.164 string | no | — | Select WhatsApp session by phone (skip picker). |
| `--username` | string | no | — | Select Instagram session by handle (skip picker). |
| `--session` | string | no | — | Select session by public ID (`ssn_XXXXXXXX`) — use when you have a session ID but not the phone or handle. |
| `--write` | path | no | `./.env` | Destination file. Positional argument is OPTIONAL (defaults to `./.env`). Without `--write`, the command prints the keys to stdout. |
| `--force` | boolean | no | `false` | Overwrite destination without prompt. Recommended for CI. |

Global flags: `--json`, `--workspace`.

**Arguments:** none

**Browser step required:** No

**WhatsApp sandbox keys** (six keys):

| Key | Purpose |
|-----|---------|
| `WEBHOOK_HMAC_SECRET` | Per-session HMAC-SHA256 key for verifying `X-HookMyApp-Signature-256` on forwarded webhooks — same key name as `channels env`. |
| `VERIFY_TOKEN` | Plain-text value your endpoint echoes back on the one-time verify GET — `sandbox webhook set` runs this handshake against your URL before saving it. |
| `PORT` | Port your local server listens on (default `3000`). |
| `WHATSAPP_API_URL` | Sandbox proxy base URL. |
| `WHATSAPP_ACCESS_TOKEN` | Sandbox channel token used to send messages. |
| `WHATSAPP_PHONE_NUMBER_ID` | Sandbox phone number ID. |

**Instagram sandbox keys** (six keys):

| Key | Purpose |
|-----|---------|
| `WEBHOOK_HMAC_SECRET` | Per-session HMAC-SHA256 key for verifying `X-HookMyApp-Signature-256` on forwarded webhooks — same key name as `channels env`. |
| `VERIFY_TOKEN` | Plain-text value your endpoint echoes back on the one-time verify GET — `sandbox webhook set` runs this handshake against your URL before saving it. |
| `PORT` | Port your local server listens on (default `3000`). |
| `INSTAGRAM_API_URL` | Sandbox proxy base URL for Instagram. |
| `INSTAGRAM_ACCESS_TOKEN` | Sandbox channel token used to send DMs. |
| `INSTAGRAM_ACCOUNT_ID` | Sandbox Instagram account ID. |

> **Safety:** The sandbox keys are secrets scoped to your session. Never paste the contents of your `.env` file into a chat, ticket, or log.

**Examples:**

```bash
# Print to stdout (useful for piping)
hookmyapp sandbox env

# Pipe to a custom file
hookmyapp sandbox env > .env.sandbox

# Write to default ./.env
hookmyapp sandbox env --write

# Write to a custom path
hookmyapp sandbox env --write=.env.sandbox

# Skip session picker in CI + overwrite without prompt (WhatsApp)
hookmyapp sandbox env --phone +15551234567 --write --force

# Skip session picker in CI + overwrite without prompt (Instagram)
hookmyapp sandbox env --username @acmebrand --write --force
```

Use `--force` in CI; without it the CLI prompts before overwriting an existing file.

**Exit codes:** standard CLI codes — see SKILL.md § Exit codes (`0` success; class-based non-zero).

## sandbox listen

Start a sandbox tunnel and stream incoming webhooks to your local app.

**Flags:**

| Flag | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `--port` | integer | no | `3000` | Local port your app listens on. |
| `--path` | path | no | `/webhook` | Webhook path on your app. |
| `--phone` | E.164 string | no | — | Skip session picker by test phone (WhatsApp sessions). |
| `--username` | string | no | — | Skip session picker by Instagram handle (Instagram sessions). |
| `--session` | string | no | — | Skip session picker by session publicId (`ssn_XXXXXXXX`) — use when you have a session ID but not the phone or handle. |
| `--verbose` | boolean | no | `false` | Print full request/response bodies. First-line diagnostic when "webhooks arrive at HookMyApp but nothing hits my server." |
| `--json` | boolean | no | `false` | Per-command machine-readable event log. NOT the same as the global `--json` flag. |
| `--reinstall-tunnel-binary` | boolean | no | `false` | Force re-download of cloudflared. Direct fix for "tunnel closed" cloudflared errors. |

Global flags: `--workspace`.

**Arguments:** none

**Browser step required:** No

**Behavior:** Leaves the process running in the foreground. Ctrl-C terminates the tunnel. Defaults (`port 3000`, `path /webhook`) are aligned with the webhook-starter-kit's Express routes — a fresh `git clone` + `npm start` + `sandbox listen` receives forwarded webhooks out of the box (no verify-GET handshake — the sandbox tunnel never issues one).

**Examples:**

```bash
# Default: forwards to localhost:3000/webhook
hookmyapp sandbox listen

# Skip session picker by phone (WhatsApp)
hookmyapp sandbox listen --phone +15551234567 --port 3000

# Skip session picker by Instagram handle
hookmyapp sandbox listen --username @acmebrand --port 3000

# Skip session picker by session ID
hookmyapp sandbox listen --session ssn_XXXXXXXX --port 3000

# Diagnostic mode — stream full request/response bodies
hookmyapp sandbox listen --path /webhook --verbose

# Force re-download cloudflared when tunnels keep dropping
hookmyapp sandbox listen --reinstall-tunnel-binary
```

**Exit codes:** `0` graceful shutdown · `3` tunnel provisioning/configure failed · `4` cloudflared binary install failed · `7` cloudflared exited unexpectedly · otherwise standard CLI codes (see SKILL.md § Exit codes).

## sandbox send

Send a text message from the sandbox WABA **to the session phone**, or a DM from the sandbox Instagram account to the session DM thread.

**Flags:**

| Flag | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `--phone` | E.164 string | no | — | Session phone (acts as both sender context and recipient — see note). CLI prompts interactively when omitted. WhatsApp sessions only. |
| `--username` | string | no | — | Instagram handle. CLI prompts interactively when omitted. Instagram sessions only. |
| `--session` | string | no | — | Select session by public ID (`ssn_XXXXXXXX`). |
| `--message` | string | no | — | Text body. CLI prompts interactively when omitted. |

Global flags: `--workspace`.

**Arguments:** none

**Browser step required:** No

> **IMPORTANT:** There is NO `--to` flag. For WhatsApp, the recipient is pinned server-side to the session phone (any outbound send whose `to` != session phone is rejected). For Instagram, sends go to the DM thread of the session; there is no separate recipient argument. Template messages are also blocked on sandbox — templates work only on your own channel.

**Examples:**

```bash
# Interactive — prompts for both session and message
hookmyapp sandbox send

# Prompt only for session (message pre-filled)
hookmyapp sandbox send --message "hi"

# Fully-flagged (CI form, WhatsApp)
hookmyapp sandbox send --phone +15551234567 --message "hi"

# Fully-flagged (CI form, Instagram)
hookmyapp sandbox send --username @acmebrand --message "hi"
```

**Exit codes:** standard CLI codes — see SKILL.md § Exit codes (`0` success; class-based non-zero).

## sandbox webhook

Inspect, set, or clear the sandbox session's webhook destination without restarting the tunnel.

```bash
hookmyapp sandbox webhook show
hookmyapp sandbox webhook set --url https://example.test/webhook
hookmyapp sandbox webhook clear
```

Select the session with `--phone +<E164>`, `--username <@handle>`, or `--session ssn_XXXXXXXX` when more than one is active.

## sandbox logs

Print recent inbound/outbound events for the active sandbox session.

```bash
hookmyapp sandbox logs
hookmyapp sandbox logs --verbose
hookmyapp sandbox logs --follow
hookmyapp sandbox logs --username @acmebrand
```
