---
name: integrate-hookmyapp
description: "Use when the user wants to integrate WhatsApp Cloud API / Meta webhooks into their app via HookMyApp, set up a sandbox WhatsApp session, connect their own WhatsApp number or Instagram account via Meta embedded signup, or debug HookMyApp CLI errors. Triggers: hookmyapp, whatsapp cloud api, meta webhook, sandbox whatsapp, gethookmyapp, waba integration."
license: Apache-2.0
metadata:
  author: hookmyapp
  version: "0.8.0"
  cli-package: "@gethookmyapp/cli"
---

# Integrate HookMyApp

HookMyApp is a passthrough for WhatsApp and Instagram: the user keeps their own Meta token, and HookMyApp forwards inbound messages to their code and sends their replies straight through Meta (it is not a BSP middleman). This skill teaches AI coding agents how to drive the `@gethookmyapp/cli` to integrate a user's app with either a sandbox account (for dev and testing) or the user's own WhatsApp number / Instagram account (connected via Meta embedded signup). The CLI owns credential issuance, tunnel lifecycle, and webhook configuration — your code never needs to call the HookMyApp API directly.

## Agent Guidance

### Key Principles

- **The CLI is the source of truth.** Never embed credentials inline in generated code. Run `hookmyapp sandbox env --write .env` or `hookmyapp channels env <channel>` and let the user's app read from environment variables.
- **There is no environment to select.** Every command runs against the live HookMyApp service. Pass `--workspace <id>` only when the user has multiple workspaces and a command must hit one other than the active default.
- **Browser steps cannot be automated.** `login` and `channels connect` both open browser tabs the human must complete. Do not pretend to automate them — hand the terminal back with a clear instruction.
- **Sandbox is not your own channel.** Sandbox is a HookMyApp-hosted test account with 5 env keys, no templates, and recipient pinned to the session phone. Your own channel is your WhatsApp number or Instagram account, with 6 env keys (from `channels env`) and full template support. The two are not interchangeable — pick one based on the user's goal before generating code.
- **Your own channel has two webhook-delivery flavors: CLI tunnel OR your own URL.** A connected channel can receive inbound webhooks via either (a) `hookmyapp channels listen` (the CLI provisions a per-channel Cloudflare tunnel — no public HTTPS URL required, designed for local dev / self-hosted agents / 24/7 hobby projects) or (b) `hookmyapp channels webhook set <channel> --url https://...` (your own public HTTPS endpoint, the classic deployed pattern). Pick CLI when the user is developing on localhost or running an always-on local agent (e.g. an OpenClaude-style installation); pick URL when the user has a deployed backend ready to accept inbound webhooks. The two are mutually exclusive per channel — setting a URL while the CLI is listening evicts the CLI (it exits cleanly with a notice).

### When to Prompt the Human

Use a `> **HUMAN ACTION REQUIRED:** <action>` blockquote whenever the next step is not automatable:

- `hookmyapp login` — opens a browser tab for sign-in.
- `hookmyapp channels connect` — opens Meta's embedded-signup popup; user picks business, WABA, and phone number.
- `hookmyapp channels listen` — long-running foreground process; the human must keep the terminal open (or background it via `nohup …  &` for 24/7 use). Test inbound webhook delivery by sending a real WhatsApp message to the channel's number.
- Any destructive operation (`webhook set`, `logout`); confirm intent before running.
- Rotating a leaked `ACCESS_TOKEN` — must happen in the Meta App Dashboard, not via CLI.

### Safety Rules

- **Never paste `channels env <channel>` or `channels token <channel>` output into chat, tickets, or logs.** Redirect to a secret manager or `.env` file the user controls.
- **Never run `workspace use` without confirming the target ID.** Running commands against the wrong workspace can mutate the wrong WABA.
- **Never run `webhook set` without explicit human confirmation of the URL.** Pointing your channel's webhooks at a dev URL silently drops inbound customer messages.
- **Never generate sandbox template-message examples.** Templates are rejected by sandbox-proxy; generating such code only wastes the user's time.
- **Never run `hookmyapp channels disable <channel>` without explicit human confirmation.** Forwarding off = silent message drop on inbound; no error surfaces to the customer. Use `channels show <channel>` or `channels health <channel>` to verify state before and after.
- **Never run `hookmyapp channels listen` without explicit human confirmation.** Listening on a real channel routes inbound customer messages to the developer's localhost. That is the intended behavior for local dev and self-hosted agents, but a misclicked channel hijacks live traffic for as long as the CLI is up. Confirm the channel publicId before launching.

## Prerequisites

- Node.js 18 or newer (for the CLI and the typical webhook server).
- A HookMyApp account. Sign up at <https://app.hookmyapp.com/signup>.
- To connect your own channel: a Facebook Business Manager account (for `channels connect` embedded signup).

## Skill Setup (run once before any CLI command)

Before invoking any `hookmyapp` CLI command on the user's machine, write the skill version marker so the CLI can advertise which skill is driving it. The CLI sends this version on every backend request, and the backend uses it to gate compatibility — without the marker, the skill-version check is skipped and the user can drift onto an out-of-date skill silently.

```bash
mkdir -p ~/.config/hookmyapp && echo "0.8.0" > ~/.config/hookmyapp/skill-version
```

The version string MUST match this skill's `metadata.version` in the frontmatter above. If you re-run `npx skills add hookmyapp/agent-skills@latest`, re-run the command above with the new version. The file is one-line UTF-8 text, no JSON, no comments — exactly a semver string. Re-running with the same value is a safe no-op.

## Two paths: sandbox vs your own channel

| Aspect | Sandbox (dev / testing) | Your own channel |
|--------|-------------------------|------------------|
| Account | HookMyApp-hosted test account | Yours, connected via Meta embedded signup |
| Setup step | `sandbox start [whatsapp|instagram]` | `channels connect [whatsapp|instagram]` (browser popup) |
| Env keys | 5 (WhatsApp): `WHATSAPP_API_URL`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `VERIFY_TOKEN`, `PORT` | 6 (WhatsApp, from `channels env`): `META_GRAPH_API_URL`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_WABA_ID`, `HOOKMYAPP_CHANNEL_ID`, `VERIFY_TOKEN` (no `PORT`). Instagram emits the `INSTAGRAM_*` equivalents. |
| Inbound tunnel | `sandbox listen` (Cloudflare) | Your own public HTTPS URL + `webhook set --verify-token` |
| Recipient | Pinned to session phone server-side | Any WhatsApp user who messaged you first |
| Templates | Blocked (text only) | Supported |
| Meta dashboard | Not needed | Required for app review and template approval |

**Pick sandbox** when the user is building or debugging on localhost and wants zero Meta paperwork for day-to-day iteration. **Pick your own channel** when the user is deploying to a real WhatsApp number or Instagram account (Meta embedded signup required once, per channel).

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

**Alternative — zero-browser via bootstrap code (for AI-paste / CI):**

```bash
hookmyapp login --code <bootstrap>
```

If the human already minted a bootstrap code from the HookMyApp dashboard (Settings → CLI → "Mint bootstrap code"), they can paste it into this flag and skip the browser tab entirely. The code is single-use and expires quickly — surface a `> **HUMAN ACTION REQUIRED:**` only for the paste. Exits non-zero if the code is expired or consumed. See [references/auth.md](references/auth.md) for full flag syntax.

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

## Full setup: your own channel

Seven steps to connect your own WhatsApp number or Instagram account:

**1. Log in**

```bash
hookmyapp login
```

**2. Select a workspace**

```bash
hookmyapp workspace list
hookmyapp workspace use <workspace-id>

# Or create a new one:
hookmyapp workspace new "Acme Inc"
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

**5. Pull your channel's env keys**

```bash
hookmyapp channels env ch_AAAAAAAA > .env.whatsapp
```

`hookmyapp channels env <channel>` emits the six WhatsApp keys your app reads directly (no hand-mapping needed):

| Key | Notes |
|---|---|
| `META_GRAPH_API_URL` | Meta Graph API base (e.g. `https://graph.facebook.com/v22.0`). |
| `WHATSAPP_ACCESS_TOKEN` | Long-lived system-user access token. |
| `WHATSAPP_PHONE_NUMBER_ID` | Meta phone number id. |
| `WHATSAPP_WABA_ID` | WhatsApp Business Account id (reference). |
| `HOOKMYAPP_CHANNEL_ID` | The HookMyApp channel publicId. |
| `VERIFY_TOKEN` | HMAC key for `X-HookMyApp-Signature-256`; set when you configure the webhook (step 6). |

There is NO `PORT` key in `channels env` output (that key only appears in `sandbox env`). For Instagram, `channels env <channel>` emits `INSTAGRAM_GRAPH_API_URL`, `INSTAGRAM_ACCESS_TOKEN`, `INSTAGRAM_USER_ID`, `HOOKMYAPP_CHANNEL_ID`, `VERIFY_TOKEN`. See [references/env.md](references/env.md) for both shapes and secrets-management guidance.

**6. Configure the webhook URL**

```bash
hookmyapp channels webhook set ch_AAAAAAAA \
  --url https://api.acme.com/whatsapp/webhook \
  --verify-token <your-chosen-token>
```

Pick a strong random `VERIFY_TOKEN` (32+ chars) and pass it via `--verify-token`. This is the HMAC key the forwarder will sign every inbound webhook with (`X-HookMyApp-Signature-256`).

**On first-time setup, `--verify-token` is required** — the forwarder has no prior token to preserve. On subsequent `channels webhook set` calls, you may omit `--verify-token` for URL-only rotation (the previously-set token stays in effect).

> **HUMAN ACTION REQUIRED:** Before running this, confirm with the human that the URL is the intended endpoint. A typo here silently drops inbound customer messages.

The URL must respond `200 OK` with `VERIFY_TOKEN` as the plain-text body on Meta's verify GET (HookMyApp performs this check on your behalf when you run `channels webhook set`).

- `hookmyapp channels webhook clear <channel>` clears the configured override URL and reverts the channel to the HookMyApp CLI tunnel destination (HookMyAppCLI). It is idempotent. This is the command-line equivalent of clicking "Go back to HookMyAppCLI" in the dashboard before re-running `hookmyapp channels listen`.

**7. Verify health**

```bash
hookmyapp channels health ch_AAAAAAAA
```

Check that all phone numbers are `VERIFIED`, webhook is `verified: true`, and quality rating is `GREEN`.

Your own channel supports template messages — see [references/sending-messages.md](references/sending-messages.md) for the `type: "template"` payload shape and approval workflow.

**Instagram works the same way.** Connect a real IG channel with `hookmyapp channels connect instagram` (Meta OAuth: Instagram login or Instagram-via-Facebook), or start a sandbox IG session with `hookmyapp sandbox start instagram` (or `--type=instagram`) and DM the configured sandbox IG handle. Every `channels.*` verb (`show`, `env`, `token`, `health`, `webhook`, `logs`, `enable`, `disable`, `disconnect`, `listen`) works on an IG channel by passing its `<channel>` ref. Across `sandbox env|send|stop|listen|logs|webhook`, select an IG session by handle with `--username <@handle>` (WhatsApp sessions use `--phone +<E164>`; either context also accepts `--session ssn_XXXXXXXX`).

## Quickstart: your own channel with CLI tunnel (no public URL required)

An alternative inbound-delivery path for your own channels: instead of pointing the channel at the user's own HTTPS endpoint (`webhook set --url ...`), the CLI provisions a per-channel Cloudflare Tunnel and pipes inbound webhooks straight to `localhost`. The channel's dashboard destination shows as **HookMyAppCLI** for as long as the CLI is running. This is the intended path for:

- Local development against a real WABA without standing up a public endpoint.
- Self-hosted agentic deployments (OpenClaude on a personal laptop / friend's NUC / Raspberry Pi). Tunnels can stay up 24/7.
- Quick demos and customer pairing sessions.

**Prerequisites:** Steps 1-4 of the "your own channel" setup above (logged in, workspace selected, channel connected via `channels connect`, forwarding enabled). Skip steps 5-7 (no `env`/`webhook set` needed for the CLI-tunnel path — the CLI handles tunnel provisioning, and your local code only needs to listen on a localhost port).

**1. Pick a channel to listen on**

```bash
hookmyapp channels list                            # find the publicId (ch_XXXXXXXX)
```

**2. Run the listen command** (foreground, long-running)

```bash
hookmyapp channels listen ch_XXXXXXXX --port 3000 --path /webhook
```

> **HUMAN ACTION REQUIRED:** The CLI runs in the foreground until Ctrl-C. The human must keep the terminal open, or background it via `nohup hookmyapp channels listen ... &` for 24/7 use.

The CLI does five things on startup: provisions a Cloudflare Tunnel for the channel, prints the tunnel hostname, starts a local proxy server, registers the proxy's port with the backend so inbound webhooks route to it, and begins a 30s heartbeat loop to keep the tunnel marked live. Stop with Ctrl-C — the destination returns to its default (HookMyAppCLI awaiting a CLI, or your previously-configured webhook URL if one was set).

**3. Test inbound delivery**

> **HUMAN ACTION REQUIRED:** Send a real WhatsApp message from your personal account to the channel's WABA phone number. You should see the inbound payload logged in the CLI's terminal AND on your local server (whatever responds on `localhost:3000/webhook`).

**Mid-listen URL-set behavior (important).** If the user (or anyone else with dashboard access) sets a webhook URL on the channel while the CLI is mid-listen, the URL wins — the CLI exits cleanly with code 0 on its next heartbeat, printing the userMessage from the backend's `410 CHANNEL_TUNNEL_RECLAIMED` response. This is expected behavior, not an error. If the user wants to switch back to CLI delivery, they click "Go back to HookMyAppCLI" in the dashboard (clears the URL), or run `hookmyapp channels webhook clear <channel>`, and re-run `hookmyapp channels listen`.

**No env keys for inbound.** The CLI-tunnel path does not require any `WHATSAPP_*` env keys for inbound webhooks — the local server just needs to listen on the port passed to `--port`. **Outbound** message sending still uses `hookmyapp channels env <channel>` env keys (Meta's Graph API; HookMyApp doesn't proxy outbound for real channels).

## Command Reference

| Group | Purpose | Full reference |
|-------|---------|----------------|
| auth | Log in and log out. | [references/auth.md](references/auth.md) |
| billing | Show subscription status, open Stripe portal, upgrade plan. | [references/billing.md](references/billing.md) |
| channels | Connect `[whatsapp|instagram]`, list, show, enable/disable, disconnect, `env`/`token`/`health`, `webhook {show,set,clear}`, `logs {list,show}`, and `listen [channel]` (per-channel CLI tunnel for inbound webhooks → localhost). | [references/channels.md](references/channels.md) |
| config | Set/get/unset persistent CLI config (e.g., `telemetry` crash-reporting on/off). | [references/config.md](references/config.md) |
| sandbox | Start a session `[whatsapp|instagram]`, write the env file, open a tunnel, send test messages, `webhook {show,set,clear}`, `logs`. | [references/sandbox.md](references/sandbox.md) |
| workspace | List, select, rename, and manage workspace members (tenancy scope). | [references/workspace.md](references/workspace.md) |

## Global Options

Every command accepts these flags:

- `--json` — emit JSON instead of formatted tables (pipe through `jq`).
- `--human` — force human-readable output (default when stdout is a TTY).
- `--workspace <slug>` — override the active workspace for this invocation. Accepts workspace **name, slug, OR id** (`ws_XXXXXXXX`).
- `--debug` — print full HTTP request/response bodies and stack traces for troubleshooting.
- `--help` — print usage and available flags for the command.

## Sending Messages

Once env is populated, sending is a single HTTP POST to Meta's Graph API v22.0 (or the sandbox proxy, when `WHATSAPP_API_URL` is overridden). Bearer token in the Authorization header, JSON body with `messaging_product: "whatsapp"`, destination number (E.164), and `type: "text"` or `type: "template"`.

Your app code does not change between sandbox and your own channel — only the env values change. Full code samples (JS with `fetch`, Python with `httpx`, template payloads) live in [references/sending-messages.md](references/sending-messages.md).

Instagram outbound uses a different body shape (`{"recipient":{"id":"<IGSID>"},"message":{"text":"..."}}`) against the Instagram Graph API base, not WhatsApp's `messaging_product`/`to` shape. See [references/sending-messages.md](references/sending-messages.md) for both.

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

HookMyApp's forwarder signs every outbound webhook — **in both sandbox and your own channel** — with an HMAC-SHA256 signature sent as:

- Header: `X-HookMyApp-Signature-256`
- Format: `sha256=<hex>`
- HMAC key: the customer's `VERIFY_TOKEN` (sandbox: CLI-issued per session; your own channel: set via `hookmyapp channels webhook set <channel> --verify-token <token>`)
- Body: `JSON.stringify(parsedBody)` on the forwarder's side (deterministic in V8)

Meta's own `X-Hub-Signature-256` / `APP_SECRET` path is **internal to the forwarder** — the forwarder verifies Meta's signature before re-signing with the customer's `VERIFY_TOKEN`. Customers never see `X-Hub-Signature-256` and do not need `APP_SECRET`. `hookmyapp channels env <channel>` does NOT emit `APP_SECRET`.

Two byte-equivalent verification shapes (pick based on your server's middleware):

**If your server uses `express.json()`** (the starter kit's default):

```js
import { createHmac } from 'node:crypto';

function verifySignature(parsedBody, signatureHeader, verifyToken) {
  const expected =
    'sha256=' +
    createHmac('sha256', verifyToken).update(JSON.stringify(parsedBody)).digest('hex');
  return signatureHeader === expected;
}
```

**If your server uses `express.raw({ type: 'application/json' })`:**

```js
import { createHmac } from 'node:crypto';

function verifySignature(rawBody, signatureHeader, verifyToken) {
  const expected =
    'sha256=' +
    createHmac('sha256', verifyToken).update(rawBody).digest('hex');
  return signatureHeader === expected;
}
```

Both work because V8's `JSON.stringify` is deterministic — the bytes the forwarder hashes are identical to the bytes your server receives. What you must NOT do is MIX the two (e.g., parse the body, mutate or reformat it, then hash the re-serialized version).

## Verification

Three commands to confirm a healthy integration before handing off to real traffic:

```bash
hookmyapp channels list                          # WABA appears with expected phone numbers
hookmyapp channels webhook show <channel>        # prints your webhook URL, "verified"
hookmyapp channels health <channel>              # status: healthy, quality: GREEN
```

For sandbox, the equivalent smoke is `sandbox status` plus sending a WhatsApp message to the sandbox number and confirming your server logs the inbound webhook.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `401 invalid_token` from Meta | Re-run `hookmyapp channels token <channel>`; if still fails, `channels connect` to re-mint. |
| `403 forbidden_waba` | WABA was disconnected in Meta dashboard — reconnect via `channels connect`. |
| Webhook verify GET returns `404` | Ensure your server serves `GET /webhook` (default) with `VERIFY_TOKEN` body. |
| `sandbox listen: tunnel closed` / cloudflared errors | Re-run with `hookmyapp sandbox listen --reinstall-tunnel-binary` to force re-download cloudflared. Then check outbound 443 to `*.trycloudflare.com` is not firewalled. |
| `channels listen` exits with "destination was changed" notice | Expected — the dashboard webhook URL was set while the CLI was listening, so the URL wins (spec D3). Either re-run after clicking "Go back to HookMyAppCLI" in the dashboard, or run `hookmyapp channels webhook clear <channel>`, or accept the URL handoff and stop. |
| `channels listen: NO_FORWARDING_CHANNELS` | The channel exists but forwarding is disabled. Run `hookmyapp channels enable <channel>` first, then re-run `channels listen`. |
| `channels listen: CHANNEL_MISMATCH` | The positional channel doesn't match any channel in the active workspace. Run `hookmyapp channels list` to get the right publicId, OR omit the positional channel to use the picker. |
| Webhook arrives at HookMyApp but nothing in server logs | Re-run `hookmyapp sandbox listen --verbose` or `hookmyapp channels listen --verbose` to stream full request/response bodies in the CLI terminal. |
| `sandbox send` rejected (recipient not session phone) | Sandbox pins recipient; no destination flag exists. Use your own channel for multi-recipient. |
| `channels connect: popup blocked` | Allow popups from `app.hookmyapp.com` or open the printed URL manually. |

Full decision tree and error table: [references/troubleshooting.md](references/troubleshooting.md)
