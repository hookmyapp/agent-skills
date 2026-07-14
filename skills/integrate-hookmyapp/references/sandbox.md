---
name: sandbox
description: Manage a sandbox WhatsApp or Instagram session (dev/testing), pull its env, open a tunnel, and send test messages.
---

# Sandbox

The sandbox is a test account HookMyApp provisions for dev and testing — no Meta dashboard, no embedded signup, no templates. A WhatsApp session is pinned to a single phone number (yours). Recipients are pinned to that session phone server-side; **`--to` does not exist** on `sandbox send` and any attempt to send to a different number is rejected by sandbox-proxy. `sandbox start instagram` opens an Instagram session reached via an ig.me deep link; IG sandbox replies go to the DM thread rather than a pinned phone.

## sandbox start

Start a new sandbox session. Pass the channel type as a positional argument or use `--type`. When omitted the CLI prompts interactively (required in `--json` mode); there is no default type.

**Flags:**

| Flag | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `--type` | `whatsapp\|instagram` | no | (interactive prompt) | Channel type for this session. |
| `--phone` | E.164 string | no | — | Your phone number, e.g. `+15551234567`. WhatsApp sessions only; omit for interactive prompt. |
| `--username` | string | no | — | Instagram handle, e.g. `@acmebrand`. Instagram sessions only; omit for interactive prompt. |

Global flags that apply: `--json`, `--workspace`.

**Arguments:** `[whatsapp|instagram]` — optional positional alias for `--type`.

**Browser step required:** No (CLI provisions via API).

**Examples:**

```bash
hookmyapp sandbox start whatsapp --phone +15551234567
hookmyapp sandbox start instagram
hookmyapp sandbox start                      # no flag — CLI prompts for type and identifier
```

**Exit codes:** `0` success · `1` phone is invalid E.164 · `2` session already active for this phone.

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

Print or write the sandbox env keys. WhatsApp and Instagram sessions write different key sets (five keys each, but different names).

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

**WhatsApp sandbox keys** (five keys):

| Key | Purpose |
|-----|---------|
| `WEBHOOK_HMAC_SECRET` | Per-session HMAC-SHA256 key for verifying `X-HookMyApp-Signature-256` on forwarded webhooks — same key name as `channels env`. No `VERIFY_TOKEN` is written: the sandbox tunnel never issues the verify-GET handshake. |
| `PORT` | Port your local server listens on (default `3000`). |
| `WHATSAPP_API_URL` | Sandbox proxy base URL. |
| `WHATSAPP_ACCESS_TOKEN` | Sandbox activation code. |
| `WHATSAPP_PHONE_NUMBER_ID` | Sandbox phone number ID. |

**Instagram sandbox keys** (five keys):

| Key | Purpose |
|-----|---------|
| `WEBHOOK_HMAC_SECRET` | Per-session HMAC-SHA256 key for verifying `X-HookMyApp-Signature-256` on forwarded webhooks — same key name as `channels env`. No `VERIFY_TOKEN` is written: the sandbox tunnel never issues the verify-GET handshake. |
| `PORT` | Port your local server listens on (default `3000`). |
| `INSTAGRAM_API_URL` | Sandbox proxy base URL for Instagram. |
| `INSTAGRAM_ACCESS_TOKEN` | Sandbox activation code. |
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

**Exit codes:** `0` success · `1` no active session (run `sandbox start` first).

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

**Behavior:** Leaves the process running in the foreground. Ctrl-C terminates the tunnel. Defaults (`port 3000`, `path /webhook`) are aligned with the webhook-starter-kit's Express routes — a fresh `git clone` + `npm start` + `sandbox listen` round-trips Meta's verification GET out of the box.

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

**Exit codes:** `0` on graceful shutdown · `1` port in use · `2` tunnel provisioning failed · `3` session phone mismatch.

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

> **IMPORTANT:** There is NO `--to` flag. For WhatsApp, the recipient is pinned server-side to the session phone (sandbox-proxy rejects any outbound send whose `to` != session phone; see `proxy.controller.ts:50-64`). For Instagram, sends go to the DM thread of the session; there is no separate recipient argument. Template messages are also blocked on sandbox (`proxy.controller.ts:67-76`) — templates work only on your own channel.

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

**Exit codes:** `0` success · `1` no active session · `2` message blocked by sandbox-proxy (recipient not session phone, or template attempt).

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
