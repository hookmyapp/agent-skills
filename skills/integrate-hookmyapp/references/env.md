---
name: env
description: Print or write the env keys for a connected channel (`channels env`), distinct from the five sandbox keys.
---

# Channel Env

`hookmyapp channels env <channel>` prints the env keys your app reads to talk to Meta through the HookMyApp gateway for a real connected channel. This is distinct from `sandbox env`, which writes the sandbox-proxy key set. The key NAMES differ between the two contexts; teach the one matching the channel you are configuring.

| Context | Command | WhatsApp keys | Instagram keys |
|---|---|---|---|
| Real channel | `channels env <channel>` | `META_GRAPH_API_URL`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_WABA_ID`, `HOOKMYAPP_CHANNEL_ID`, `VERIFY_TOKEN`, `WEBHOOK_HMAC_SECRET` (no `PORT`) | `INSTAGRAM_GRAPH_API_URL`, `INSTAGRAM_ACCESS_TOKEN`, `INSTAGRAM_ACCOUNT_ID`, `HOOKMYAPP_CHANNEL_ID`, `VERIFY_TOKEN`, `WEBHOOK_HMAC_SECRET` (no `PORT`) |
| Sandbox | `sandbox env` | `WHATSAPP_API_URL`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `VERIFY_TOKEN`, `PORT` | `INSTAGRAM_API_URL`, `INSTAGRAM_ACCESS_TOKEN`, `INSTAGRAM_ACCOUNT_ID`, `VERIFY_TOKEN`, `PORT` |

> For a real channel `META_GRAPH_API_URL` is the **versioned** gateway base `https://gateway.hookmyapp.com/meta/v22.0` for WhatsApp, and `INSTAGRAM_GRAPH_API_URL` is `https://gateway.hookmyapp.com/meta/v25.0` for Instagram. The base-URL key is NAMED differently per context: real-channel WhatsApp uses `META_GRAPH_API_URL`, sandbox uses `WHATSAPP_API_URL`; real-channel Instagram uses `INSTAGRAM_GRAPH_API_URL`, sandbox uses `INSTAGRAM_API_URL`. The Instagram account-id key is `INSTAGRAM_ACCOUNT_ID` in both contexts (`INSTAGRAM_USER_ID` is a legacy alias that may linger in older `.env` files; the bundled scripts still accept it as a fallback). The table above is the complete key set for each context.

## channels env

Print (or write) credentials for a connected channel.

**Flags:**

| Flag | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `--workspace` | string | no | active | Target workspace. |
| `--write [path]` | string | no | | Write the keys to a `.env` file (default `.env`) instead of stdout. Exports the channel's current gateway access token — it does NOT mint or rotate. |
| `--json` | boolean | no | `false` | JSON `{channel_id, ...}` reflecting the channel shape. |

**Arguments:** `<channel>` — e.g. `ch_AAAAAAAA`.

**Browser step required:** No

**Keys printed:**

For WhatsApp channels (seven keys, no `PORT`):

| Key | Purpose |
|-----|---------|
| `META_GRAPH_API_URL` | Versioned gateway base for this channel (`https://gateway.hookmyapp.com/meta/v22.0`). The kit appends `/{phone_number_id}/messages`, so the version segment must be present. |
| `WHATSAPP_ACCESS_TOKEN` | The channel's gateway access token (`hmat_…`), minted automatically at connect. Send it as `Authorization: Bearer`. Rotate via `hookmyapp channels token <channel> --rotate` if leaked. |
| `WHATSAPP_PHONE_NUMBER_ID` | The phone number ID for this channel. A WABA can hold several numbers — each connects as its own channel, and each channel's env carries that channel's own number ID. |
| `WHATSAPP_WABA_ID` | WhatsApp Business Account ID. |
| `HOOKMYAPP_CHANNEL_ID` | HookMyApp channel public ID. |
| `VERIFY_TOKEN` | Webhook verify-GET handshake response value (what your endpoint returns on the verify GET). NOT the HMAC key. |
| `WEBHOOK_HMAC_SECRET` | Per-channel HMAC-SHA256 key for verifying `X-HookMyApp-Signature-256` on forwarded webhooks. |

Instagram channels print the six-key `INSTAGRAM_*` set: `INSTAGRAM_GRAPH_API_URL` (gateway base `https://gateway.hookmyapp.com/meta/v25.0`), `INSTAGRAM_ACCESS_TOKEN` (a gateway `hmat_…` access token), `INSTAGRAM_ACCOUNT_ID`, `HOOKMYAPP_CHANNEL_ID`, `VERIFY_TOKEN`, `WEBHOOK_HMAC_SECRET`. (Instagram accounts connected via Facebook Login additionally carry `META_PAGE_ID`.)

> **Safety:** `WHATSAPP_ACCESS_TOKEN` and `INSTAGRAM_ACCESS_TOKEN` carry a gateway `hmat_` access token, not a Meta token. It is scoped to one channel and rotatable via `hookmyapp channels token <channel> --rotate`, but still secret. Never log it, never paste it into a chat, never commit it. Store only in an environment-variable secret manager (e.g. GCP Secret Manager, AWS Secrets Manager, Vault).

## channels env --write

`--write` writes a ready-to-read `.env` carrying the channel's current gateway access token. The written WhatsApp file looks like this (Instagram swaps in the `INSTAGRAM_*` keys and `/meta/v25.0`):

```dotenv
# .env  (written by: hookmyapp channels env ch_AAAAAAAA --write)
META_GRAPH_API_URL=https://gateway.hookmyapp.com/meta/v22.0
WHATSAPP_ACCESS_TOKEN=hmat_live_AbCdEf0123456789AbCdEf0123456789
WHATSAPP_PHONE_NUMBER_ID=1080996501762047
WHATSAPP_WABA_ID=1276334778010256
HOOKMYAPP_CHANNEL_ID=ch_AAAAAAAA
VERIFY_TOKEN=0f47ac10b58cc4372a5670e02b2c3d47
WEBHOOK_HMAC_SECRET=9b2f1c8e4d6a0b3f5e7c9d1a2b4c6d8e
```

The base URL is always **versioned** (`/meta/v22.0` for WhatsApp, `/meta/v25.0` for Instagram) because your app appends `/{id}/messages` to it. A bare `/meta` base would produce `/{id}/messages` with no API version and Meta would reject it. Never put a bare `/meta` in a customer `.env`.

Re-running `--write` rewrites the file with the channel's current access token — it does NOT rotate. Each channel has exactly one active token; to replace it, run `hookmyapp channels token <channel> --rotate` (the old token dies immediately), then re-run `channels env <channel> --write` to refresh the file.

**Examples:**

```bash
# Write the keys (carrying the channel's current hmat_ gateway access token) straight into .env
hookmyapp channels env ch_AAAAAAAA --write

# Write to a named file (bundled scripts then need --dotenv .env.whatsapp, since they default to ./.env)
hookmyapp channels env ch_AAAAAAAA --write .env.whatsapp

# JSON for programmatic use (exports the current token — no minting)
hookmyapp channels env ch_AAAAAAAA --json
```

> **Direct Meta access still works.** Existing integrations that read a raw Meta token and call `https://graph.facebook.com` are unaffected. The gateway `.env` above is the recommended shape for new setups.

**Exit codes:** `0` success · `1` channel not found · `2` no token to export (re-run `channels connect`, which mints one).
