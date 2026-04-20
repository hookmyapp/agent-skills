---
name: sandbox
description: Manage a shared-WABA sandbox session (dev/testing), pull its env, open a tunnel, and send test messages.
---

# Sandbox

The sandbox is a shared WABA HookMyApp provisions for dev and testing — no Meta dashboard, no embedded signup, no templates. A session is pinned to a single phone number (yours). Recipients are pinned to that session phone server-side; **`--to` does not exist** on `sandbox send` and any attempt to send to a different number is rejected by sandbox-proxy.

## sandbox start

Start a new sandbox session bound to your phone.

**Flags:**

| Flag | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `--phone` | E.164 string | no | — | Your phone number, e.g. `+15551234567`. Omit for interactive prompt. |

Global flags that apply: `--env <local|staging|production>`, `--json`, `--workspace`.

**Arguments:** none

**Browser step required:** No (CLI provisions via API).

**Examples:**

```bash
hookmyapp sandbox start --phone +15551234567
hookmyapp sandbox start                      # no flag — CLI prompts for phone
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

Print or write the sandbox's five env keys.

**Flags:**

| Flag | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `--phone` | E.164 string | no | — | Select session by phone (skip picker). |
| `--write` | path | no | `./.env` | Destination file. Positional argument is OPTIONAL (defaults to `./.env`). Without `--write`, the command prints the keys to stdout. |
| `--force` | boolean | no | `false` | Overwrite destination without prompt. Recommended for CI. |

Global flags: `--env`, `--json`, `--workspace`.

**Arguments:** none

**Browser step required:** No

**Keys written** (exactly five — this is the sandbox contract):

| Key | Purpose |
|-----|---------|
| `VERIFY_TOKEN` | Per-session HMAC secret. Used as the webhook verify-GET response body AND the HMAC-SHA256 key for verifying `X-HookMyApp-Signature-256`. |
| `PORT` | Port your local server listens on (default `3000`). |
| `WHATSAPP_API_URL` | Sandbox proxy base URL. |
| `WHATSAPP_ACCESS_TOKEN` | Sandbox activation code. |
| `WHATSAPP_PHONE_NUMBER_ID` | Sandbox phone number ID (shared WABA). |

> **Safety:** The five keys are secrets scoped to your session. Never paste the contents of your `.env` file into a chat, ticket, or log.

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

# Skip session picker in CI + overwrite without prompt
hookmyapp sandbox env --phone +15551234567 --write --force
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
| `--phone` | E.164 string | no | — | Skip session picker by test phone. |
| `--session` | string | no | — | Skip session picker by session publicId (`ssn_XXXXXXXX`) — use when you have a session ID but not the phone. |
| `--verbose` | boolean | no | `false` | Print full request/response bodies. First-line diagnostic when "webhooks arrive at HookMyApp but nothing hits my server." |
| `--json` | boolean | no | `false` | Per-command machine-readable event log. NOT the same as the global `--json` flag. |
| `--reinstall-tunnel-binary` | boolean | no | `false` | Force re-download of cloudflared. Direct fix for "tunnel closed" cloudflared errors. |

Global flags: `--env`, `--workspace`.

**Arguments:** none

**Browser step required:** No

**Behavior:** Leaves the process running in the foreground. Ctrl-C terminates the tunnel. Defaults (`port 3000`, `path /webhook`) are aligned with the webhook-starter-kit's Express routes — a fresh `git clone` + `npm start` + `sandbox listen` round-trips Meta's verification GET out of the box.

**Examples:**

```bash
# Default: forwards to localhost:3000/webhook
hookmyapp sandbox listen

# Skip session picker by phone
hookmyapp sandbox listen --phone +15551234567 --port 3000

# Diagnostic mode — stream full request/response bodies
hookmyapp sandbox listen --path /webhook --verbose

# Force re-download cloudflared when tunnels keep dropping
hookmyapp sandbox listen --reinstall-tunnel-binary
```

**Exit codes:** `0` on graceful shutdown · `1` port in use · `2` tunnel provisioning failed · `3` session phone mismatch.

## sandbox send

Send a text message from the sandbox WABA **to the session phone**.

**Flags:**

| Flag | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `--phone` | E.164 string | no | — | Session phone (acts as both sender context and recipient — see note). CLI prompts interactively when omitted. |
| `--message` | string | no | — | Text body. CLI prompts interactively when omitted. |

Global flags: `--env`, `--workspace`.

**Arguments:** none

**Browser step required:** No

> **IMPORTANT:** There is NO `--to` flag. Recipient is pinned server-side to the session phone (sandbox-proxy rejects any outbound send whose `to` != session phone; see `proxy.controller.ts:50-64`). Template messages are also blocked on sandbox (`proxy.controller.ts:67-76`) — templates are production-only.

**Examples:**

```bash
# Interactive — prompts for both session and message
hookmyapp sandbox send

# Prompt only for session (message pre-filled)
hookmyapp sandbox send --message "hi"

# Fully-flagged (CI form)
hookmyapp sandbox send --phone +15551234567 --message "hi"
```

**Exit codes:** `0` success · `1` no active session · `2` message blocked by sandbox-proxy (recipient not session phone, or template attempt).
