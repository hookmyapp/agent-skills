---
name: integrate-hookmyapp
description: Use when the user wants to integrate WhatsApp Cloud API / Meta webhooks into their app via HookMyApp, set up a sandbox WhatsApp session, connect a production WABA via embedded signup, or debug HookMyApp CLI errors. Triggers: "hookmyapp", "whatsapp cloud api", "meta webhook", "sandbox whatsapp", "gethookmyapp", "waba integration".
license: Apache-2.0
metadata:
  author: hookmyapp
  version: "0.6.1"
  cli-package: "@gethookmyapp/cli"
---

# Integrate HookMyApp

HookMyApp is a WhatsApp Business API broker. This skill teaches AI coding agents how to drive the `@gethookmyapp/cli` to integrate a user's app with either a shared sandbox WABA (for dev and testing) or a provisioned production WABA (via Meta embedded signup). The CLI owns credential issuance, tunnel lifecycle, and webhook configuration — your code never needs to call the HookMyApp API directly.

## Agent Guidance

### Key Principles

- **The CLI is the source of truth.** Never embed credentials inline in generated code. Run `hookmyapp sandbox env --write .env` or `hookmyapp env <waba-id>` and let the user's app read from environment variables.
- **Workspace and environment flags scope every call.** When the user has multiple workspaces or operates in both staging and production, pass `--workspace <id>` and `--env staging|production` explicitly rather than relying on defaults.
- **Browser steps cannot be automated.** `login` and `channels connect` both open browser tabs the human must complete. Do not pretend to automate them — hand the terminal back with a clear instruction.
- **Sandbox is not production.** Sandbox is a shared WABA with 5 env keys, no templates, and recipient pinned to the session phone. Production is your own WABA with 3 env keys and full template support. The two are not interchangeable — pick one based on the user's goal before generating code.

### When to Prompt the Human

Use a `> **HUMAN ACTION REQUIRED:** <action>` blockquote whenever the next step is not automatable:

- `hookmyapp login` — opens a browser tab for sign-in.
- `hookmyapp channels connect` — opens Meta's embedded-signup popup; user picks business, WABA, and phone number.
- Selecting `--env production` on any destructive operation (`webhook set`, `logout`).
- Rotating a leaked `ACCESS_TOKEN` — must happen in the Meta App Dashboard, not via CLI.

### Safety Rules

- **Never paste `env <waba-id>` or `token <waba-id>` output into chat, tickets, or logs.** Redirect to a secret manager or `.env` file the user controls.
- **Never run `workspace use` without confirming the target ID.** Running commands against the wrong workspace can mutate the wrong WABA.
- **Never run `webhook set --env production` without explicit human confirmation of the URL.** Pointing production webhooks at a dev URL silently drops inbound customer messages.
- **Never generate sandbox template-message examples.** Templates are rejected by sandbox-proxy; generating such code only wastes the user's time.

## Prerequisites

- Node.js 18 or newer (for the CLI and the typical webhook server).
- A HookMyApp account. Sign up at <https://app.hookmyapp.com/signup>.
- For production: a Facebook Business Manager account (for `channels connect` embedded signup).

## Two Paths: Sandbox vs Production

| Aspect | Sandbox (dev / testing) | Production |
|--------|-------------------------|------------|
| WABA | Shared, managed by HookMyApp | Yours, provisioned via Meta embedded signup |
| Setup step | `sandbox start --phone +<E164>` | `channels connect` (browser popup) |
| Env keys | 5: `VERIFY_TOKEN`, `PORT`, `WHATSAPP_API_URL`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` | 3: `WABA_ID`, `ACCESS_TOKEN`, `PHONE_NUMBER_ID` |
| Inbound tunnel | `sandbox listen` (Cloudflare) | Your own public HTTPS URL + `webhook set` |
| Recipient | Pinned to session phone server-side | Any WhatsApp user who messaged you first |
| Templates | Blocked (text only) | Supported |
| Meta dashboard | Not needed | Required for app review and template approval |

**Pick sandbox** when the user is building or debugging on localhost and wants zero Meta paperwork. **Pick production** when the user is deploying to real customers.

## Quickstart: Sandbox

Seven steps from zero to a running webhook receiver that echoes inbound WhatsApp messages:

**1. Install the CLI**

```bash
npm install -g @gethookmyapp/cli
```

**2. Log in**

```bash
hookmyapp login
```

> **HUMAN ACTION REQUIRED:** A browser tab opens for HookMyApp sign-in. Complete sign-in there; the CLI polls for the callback and stores credentials locally.

**3. Clone the starter kit**

```bash
git clone https://github.com/hookmyapp/webhook-starter-kit.git
cd webhook-starter-kit
npm install
```

The starter kit is a minimal Express app with a verified-signature receiver on `/webhook` and a `sendMessage` helper. It reads the five env keys `sandbox env --write` produces.

**4. Pull env values**

```bash
hookmyapp sandbox env --write .env
```

Writes `VERIFY_TOKEN`, `PORT`, `WHATSAPP_API_URL`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` into `.env`.

**5. Start the server (terminal 1)**

```bash
npm start
```

Express listens on `localhost:3000/webhook` by default.

**6. Start the sandbox tunnel (terminal 2)**

```bash
hookmyapp sandbox listen --phone +<your-phone>
```

Opens a Cloudflare tunnel from a HookMyApp-managed public hostname to `localhost:3000/webhook`. The CLI tunnel defaults (`--port 3000`, `--path /webhook`) match the starter-kit out of the box, so no flags are needed for the common case.

**7. (Optional) Send a test reply**

```bash
hookmyapp sandbox send --phone +<your-phone> --message "hello"
```

You will receive the message on the session phone. (Sandbox pins recipient to session phone — there is no destination flag; sandbox-proxy rejects sends to any other number.)

Now send a WhatsApp message from your personal account to the sandbox number — you will see the inbound payload logged in terminal 1 and receive the starter-kit's auto-reply on WhatsApp.

## Full Setup: Production

Seven steps to integrate a real WABA for production use:

**1. Log in**

```bash
hookmyapp login
```

**2. Select a workspace**

```bash
hookmyapp workspace list
hookmyapp workspace use <workspace-id>

# Or create a new one:
hookmyapp workspace new "Acme Production"
```

**3. Connect a WABA**

```bash
hookmyapp channels connect
```

> **HUMAN ACTION REQUIRED:** Meta's embedded-signup popup opens. Sign in to Facebook Business, pick or create a WABA, pick a phone number, and grant HookMyApp's app access. If the popup is blocked, the CLI prints the URL to open manually.

**4. Find the WABA ID**

```bash
hookmyapp channels list
# waba_id: 1276334778010256
# business_name: Acme Inc
# phone_numbers: [+15551234567]
```

**5. Pull production env keys**

```bash
hookmyapp env 1276334778010256 > .env.whatsapp
```

Writes the three production keys: `WABA_ID`, `ACCESS_TOKEN`, `PHONE_NUMBER_ID`. See [references/env.md](references/env.md) for the full schema and secrets-management guidance.

**6. Configure the webhook URL**

```bash
hookmyapp webhook set 1276334778010256 --url https://api.acme.com/whatsapp/webhook
```

> **HUMAN ACTION REQUIRED:** Before running this, confirm with the human that the URL is the intended production endpoint. A typo here silently drops inbound customer messages.

The URL must respond `200 OK` with `VERIFY_TOKEN` as the plain-text body on Meta's verify GET.

**7. Verify health**

```bash
hookmyapp health 1276334778010256
```

Check that all phone numbers are `VERIFIED`, webhook is `verified: true`, and quality rating is `GREEN`.

Production supports template messages — see [references/sending-messages.md](references/sending-messages.md) for the `type: "template"` payload shape and approval workflow.

## Command Reference

| Group | Purpose | Full reference |
|-------|---------|----------------|
| auth | Log in and log out. | [references/auth.md](references/auth.md) |
| workspace | List, select, and create workspaces (tenancy scope). | [references/workspace.md](references/workspace.md) |
| channels | Connect WABAs via Meta embedded signup. | [references/channels.md](references/channels.md) |
| sandbox | Start session, write 5-key env, open tunnel, send test messages. | [references/sandbox.md](references/sandbox.md) |
| webhook | Set and show the production webhook URL on a WABA. | [references/webhook.md](references/webhook.md) |
| env | Print the 3 production env keys for a WABA. | [references/env.md](references/env.md) |
| token | Print just the long-lived `ACCESS_TOKEN`. | [references/token.md](references/token.md) |
| health | Check WABA health (phone numbers, webhook, quality rating). | [references/health.md](references/health.md) |

## Global Options

Every command accepts these flags:

- `--json` — emit JSON instead of formatted tables (pipe through `jq`).
- `--workspace <id>` — override the active workspace for this invocation.
- `--env staging|production` — override the default environment (defaults to `production`).
- `--debug` — verbose logging for troubleshooting.
- `--help` — print usage and available flags for the command.

## Sending Messages

Once env is populated, sending is a single HTTP POST to Meta's Graph API v19.0+ (or the sandbox proxy, when `WHATSAPP_API_URL` is overridden). Bearer token in the Authorization header, JSON body with `messaging_product: "whatsapp"`, destination number (E.164), and `type: "text"` or `type: "template"`.

Your app code does not change between sandbox and production — only the three `WHATSAPP_*` env values change. Full code samples (JS with `fetch`, Python with `httpx`, template payloads) live in [references/sending-messages.md](references/sending-messages.md).

## Webhook Payload Format

HookMyApp forwards Meta's webhook body verbatim. The envelope has `entry[].changes[].value.messages[]` for inbound messages:

```json
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "1276334778010256",
      "changes": [
        {
          "field": "messages",
          "value": {
            "messaging_product": "whatsapp",
            "metadata": { "phone_number_id": "1080996501762047" },
            "messages": [
              {
                "from": "15551234567",
                "id": "wamid.abc123...",
                "timestamp": "1716300000",
                "type": "text",
                "text": { "body": "hello" }
              }
            ]
          }
        }
      ]
    }
  ]
}
```

### Signature verification

Every forwarded webhook includes an HMAC-SHA256 signature header you must verify or reject:

- **Sandbox:** `X-HookMyApp-Signature-256`, keyed on `VERIFY_TOKEN`.
- **Production:** `X-Hub-Signature-256`, keyed on Meta's `APP_SECRET` (from `hookmyapp env`).

```js
import { createHmac } from 'node:crypto';

function verifySignature(rawBody, signatureHeader, secret) {
  const expected =
    'sha256=' + createHmac('sha256', secret).update(rawBody).digest('hex');
  return signatureHeader === expected;
}
```

The `rawBody` must be the exact raw request body, not a re-serialized object — a single whitespace change invalidates the HMAC. Use `express.raw({ type: 'application/json' })` or equivalent middleware to preserve the raw bytes.

## Verification

Three commands to confirm a healthy integration before handing off to real traffic:

```bash
hookmyapp channels list               # WABA appears with expected phone numbers
hookmyapp webhook show <waba-id>      # prints your production URL, "verified"
hookmyapp health <waba-id>            # status: healthy, quality: GREEN
```

For sandbox, the equivalent smoke is `sandbox status` plus sending a WhatsApp message to the sandbox number and confirming your server logs the inbound webhook.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `401 invalid_token` from Meta | Re-run `hookmyapp token <waba-id>`; if still fails, `channels connect` to re-mint. |
| `403 forbidden_waba` | WABA was disconnected in Meta dashboard — reconnect via `channels connect`. |
| Webhook verify GET returns `404` | Ensure your server serves `GET /webhook` (default) with `VERIFY_TOKEN` body. |
| `sandbox listen: tunnel closed` | Re-run; check outbound 443 to `*.trycloudflare.com` is not firewalled. |
| `sandbox send` rejected (recipient not session phone) | Sandbox pins recipient; no destination flag exists. Move to production for multi-recipient. |
| `channels connect: popup blocked` | Allow popups from `app.hookmyapp.com` or open the printed URL manually. |

Full decision tree and error table: [references/troubleshooting.md](references/troubleshooting.md)
