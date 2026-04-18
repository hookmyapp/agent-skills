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
| `--phone` | E.164 string | yes | — | Your phone number, e.g. `+15551234567`. |
| `--env` | `staging\|production` | no | `production` | Sandbox environment. |
| `--json` | boolean | no | `false` | JSON session record. |

**Arguments:** none

**Browser step required:** No (CLI provisions via API).

**Examples:**

```bash
hookmyapp sandbox start --phone +15551234567
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

**Flags:** `--workspace`.

**Examples:**

```bash
hookmyapp sandbox stop
```

## sandbox env --write

Write the sandbox's five env keys to a `.env`-style file.

**Flags:**

| Flag | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `--write` | path | yes | — | Destination file (e.g. `.env`). Overwrites in place. |
| `--workspace` | string | no | active | Target workspace. |
| `--env` | `staging\|production` | no | `production` | Environment. |

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
hookmyapp sandbox env --write .env
```

**Exit codes:** `0` success · `1` no active session (run `sandbox start` first).

## sandbox listen

Open a Cloudflare tunnel from a HookMyApp-managed public hostname to your local server. This replaces any third-party tunneling tool you may have used previously.

**Flags:**

| Flag | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `--phone` | E.164 string | yes | — | Session phone (same as `sandbox start`). |
| `--port` | integer | no | `3000` | Local port to forward to. |
| `--path` | path | no | `/webhook` | Local path the tunnel POSTs to. |
| `--env` | `staging\|production` | no | `production` | Sandbox environment. |

**Arguments:** none

**Browser step required:** No

**Behavior:** Leaves the process running in the foreground. Ctrl-C terminates the tunnel. Defaults (`port 3000`, `path /webhook`) are aligned with the webhook-starter-kit's Express routes — a fresh `git clone` + `npm start` + `sandbox listen` round-trips Meta's verification GET out of the box.

**Examples:**

```bash
# Default: forwards to localhost:3000/webhook
hookmyapp sandbox listen --phone +15551234567

# Custom port + path
hookmyapp sandbox listen --phone +15551234567 --port 4000 --path /hooks/whatsapp
```

**Exit codes:** `0` on graceful shutdown · `1` port in use · `2` tunnel provisioning failed · `3` session phone mismatch.

## sandbox send

Send a text message from the sandbox WABA **to the session phone**.

**Flags:**

| Flag | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `--phone` | E.164 string | yes | — | Session phone (acts as both sender context and recipient — see note). |
| `--message` | string | yes | — | Text body. |
| `--env` | `staging\|production` | no | `production` | Sandbox environment. |

**Arguments:** none

**Browser step required:** No

> **IMPORTANT:** There is NO `--to` flag. Recipient is pinned server-side to the session phone (sandbox-proxy rejects any outbound send whose `to` != session phone; see `proxy.controller.ts:50-64`). Template messages are also blocked on sandbox (`proxy.controller.ts:67-76`) — templates are production-only.

**Examples:**

```bash
hookmyapp sandbox send --phone +15551234567 --message "hello"
```

**Exit codes:** `0` success · `1` no active session · `2` message blocked by sandbox-proxy (recipient not session phone, or template attempt).
