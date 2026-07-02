---
name: getting-started
description: "Zero-to-first-message walkthroughs — the sandbox quickstart and the connect-your-own-channel setup, plus the CLI-tunnel inbound path. Read this when starting a fresh HookMyApp integration."
---

# Getting Started

HookMyApp is a passthrough: the user keeps their own Meta token inside HookMyApp, inbound messages are forwarded to their code, and replies go straight through Meta. Pick one of two paths before generating code:

- **Sandbox** — a HookMyApp-hosted test account. Zero Meta paperwork; build and debug on localhost. Recipient is pinned to the session phone; no templates.
- **Your own channel** — your real WhatsApp number or Instagram account, connected via Meta embedded signup (once per channel). Full template support; send to anyone who messaged you first.

See [env.md](env.md) for the exact env-key shapes each path produces, and the "Two paths" table in SKILL.md for a side-by-side.

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

If the human already minted a bootstrap code from the HookMyApp dashboard (Settings → CLI → "Mint bootstrap code"), they can paste it into this flag and skip the browser tab entirely. The code is single-use and expires quickly — surface a `> **HUMAN ACTION REQUIRED:**` only for the paste. Exits non-zero if the code is expired or consumed. See [auth.md](auth.md) for full flag syntax.

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
hookmyapp channels env ch_AAAAAAAA --write .env
```

Write to `.env` so the bundled scripts ([whatsapp.md](whatsapp.md), [instagram.md](instagram.md)) auto-load it (they default to `./.env`; use `--dotenv <path>` if you keep credentials elsewhere). `hookmyapp channels env <channel> --write` mints a fresh gateway `hmat_` access token and writes the seven WhatsApp keys your app reads directly (no hand-mapping needed):

| Key | Notes |
|---|---|
| `META_GRAPH_API_URL` | Versioned gateway base (`https://gateway.hookmyapp.com/meta/v22.0`); your app appends `/{phone_number_id}/messages`. |
| `WHATSAPP_ACCESS_TOKEN` | The channel's gateway access token (`hmat_…`), sent as `Authorization: Bearer`. Rotate via `hookmyapp channels token <channel> --rotate`. |
| `WHATSAPP_PHONE_NUMBER_ID` | Meta phone number id. Always this channel's own number — a WABA can hold several numbers, each connected as its own channel. |
| `WHATSAPP_WABA_ID` | WhatsApp Business Account id (reference). |
| `HOOKMYAPP_CHANNEL_ID` | The HookMyApp channel publicId. |
| `VERIFY_TOKEN` | Verify-GET handshake response value; set when you configure the webhook (step 6). NOT the HMAC key. |
| `WEBHOOK_HMAC_SECRET` | HMAC-SHA256 key for verifying `X-HookMyApp-Signature-256` on forwarded webhooks. |

There is NO `PORT` key in `channels env` output (that key only appears in `sandbox env`). For Instagram, `channels env <channel>` emits `INSTAGRAM_GRAPH_API_URL`, `INSTAGRAM_ACCESS_TOKEN`, `INSTAGRAM_USER_ID`, `HOOKMYAPP_CHANNEL_ID`, `VERIFY_TOKEN`, `WEBHOOK_HMAC_SECRET`. See [env.md](env.md) for both shapes and secrets-management guidance.

**6. Configure the webhook URL**

```bash
hookmyapp channels webhook set ch_AAAAAAAA \
  --url https://api.acme.com/whatsapp/webhook \
  --verify-token <your-chosen-token>
```

Pick a strong random verify token (32+ chars) and pass it via `--verify-token`. This is ONLY the plain-text value your endpoint returns on the webhook verify GET. It is NOT the HMAC key — the forwarder signs every inbound webhook (`X-HookMyApp-Signature-256`) with the separate `WEBHOOK_HMAC_SECRET`, which `channels env <channel>` exports alongside the other keys.

**On first-time setup, `--verify-token` is required** — the forwarder has no prior token to preserve. On subsequent `channels webhook set` calls, you may omit `--verify-token` for URL-only rotation (the previously-set token stays in effect).

> **HUMAN ACTION REQUIRED:** Before running this, confirm with the human that the URL is the intended endpoint. A typo here silently drops inbound customer messages.

The URL must respond `200 OK` with `VERIFY_TOKEN` as the plain-text body on Meta's verify GET (HookMyApp performs this check on your behalf when you run `channels webhook set`).

- `hookmyapp channels webhook clear <channel>` clears the configured override URL and reverts the channel to the HookMyApp CLI tunnel destination (HookMyAppCLI). It is idempotent. This is the command-line equivalent of clicking "Go back to HookMyAppCLI" in the dashboard before re-running `hookmyapp channels listen`.

**7. Verify health**

```bash
hookmyapp channels health ch_AAAAAAAA
```

Check that all phone numbers are `VERIFIED`, webhook is `verified: true`, and quality rating is `GREEN`.

Your own channel supports template messages — see [whatsapp.md](whatsapp.md) for the create/approve/send recipe and [sending-messages.md](sending-messages.md) for the raw `type: "template"` payload shape.

**Instagram works the same way.** Connect a real IG channel with `hookmyapp channels connect instagram` (Meta OAuth: Instagram login or Instagram-via-Facebook), or start a sandbox IG session with `hookmyapp sandbox start instagram` (or `--type=instagram`) and DM the configured sandbox IG handle. Every `channels.*` verb (`show`, `env`, `token`, `health`, `webhook`, `logs`, `enable`, `disable`, `disconnect`, `listen`) works on an IG channel by passing its `<channel>` ref. Across `sandbox env|send|stop|listen|logs|webhook`, select an IG session by handle with `--username <@handle>` (WhatsApp sessions use `--phone +<E164>`; either context also accepts `--session ssn_XXXXXXXX`).

## Inbound on your own channel without a public URL (CLI tunnel)

Instead of `webhook set --url …`, the CLI can provision a per-channel Cloudflare Tunnel that pipes inbound webhooks straight to `localhost` — for local dev against a real WABA, self-hosted 24/7 agents, and demos. After `channels connect` (forwarding enabled), just:

```bash
hookmyapp channels listen ch_XXXXXXXX --port 3000 --path /webhook
```

> **HUMAN ACTION REQUIRED:** Foreground, long-running until Ctrl-C. Keep the terminal open (or `nohup … &` for 24/7). Test by sending a real message to the channel's number — it lands in the CLI terminal and on `localhost:3000/webhook`.

No `WHATSAPP_*` env keys are needed for inbound on this path (outbound sending still uses `channels env`). If a webhook URL gets set while the CLI is listening, the URL wins and the CLI exits cleanly. Full lifecycle, flags, and the reclaim behavior: [channels.md](channels.md) and [troubleshooting.md](troubleshooting.md).

## Next steps

- Send messages, templates, media, profile: [whatsapp.md](whatsapp.md) · Instagram DMs + comments: [instagram.md](instagram.md)
- Webhook payload format + signature verification: SKILL.md "Webhook Payload Format", and [webhook.md](webhook.md)
- Env-key shapes and secrets handling: [env.md](env.md)
- Health checks before going live: [health.md](health.md)
