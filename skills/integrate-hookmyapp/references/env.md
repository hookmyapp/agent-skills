---
name: env
description: Print or write the env keys for a connected channel (`channels env`), distinct from the five sandbox keys.
---

# Channel Env

`hookmyapp channels env <channel>` prints the env keys your app reads to talk to Meta through the HookMyApp gateway for a real connected channel. This is distinct from `sandbox env`, which writes the sandbox-proxy key set. The key NAMES differ between the two contexts; teach the one matching the channel you are configuring.

| Context | Command | WhatsApp keys | Instagram keys |
|---|---|---|---|
| Real channel | `channels env <channel>` | `META_GRAPH_API_URL`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_WABA_ID`, `HOOKMYAPP_CHANNEL_ID`, `VERIFY_TOKEN` (no `PORT`) | `INSTAGRAM_GRAPH_API_URL`, `INSTAGRAM_ACCESS_TOKEN`, `INSTAGRAM_USER_ID`, `HOOKMYAPP_CHANNEL_ID`, `VERIFY_TOKEN` (no `PORT`) |
| Sandbox | `sandbox env` | `WHATSAPP_API_URL`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `VERIFY_TOKEN`, `PORT` | `INSTAGRAM_API_URL`, `INSTAGRAM_ACCESS_TOKEN`, `INSTAGRAM_ACCOUNT_ID`, `VERIFY_TOKEN`, `PORT` |

> For a real channel `META_GRAPH_API_URL` is the **versioned** gateway base `https://gateway.hookmyapp.com/meta/v22.0` for WhatsApp, and `INSTAGRAM_GRAPH_API_URL` is `https://gateway.hookmyapp.com/meta/v25.0` for Instagram. The base-URL key and the account-id key are NAMED differently per context: real-channel WhatsApp uses `META_GRAPH_API_URL`, sandbox uses `WHATSAPP_API_URL`; real-channel Instagram uses `INSTAGRAM_GRAPH_API_URL` + `INSTAGRAM_USER_ID`, sandbox uses `INSTAGRAM_API_URL` + `INSTAGRAM_ACCOUNT_ID`. The table above is the complete key set for each context.

## channels env

Print (or write) credentials for a connected channel.

**Flags:**

| Flag | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `--workspace` | string | no | active | Target workspace. |
| `--write [path]` | string | no | | Write the keys to a `.env` file (default `.env`) instead of stdout. Mints a fresh gateway API key in the process. |
| `--json` | boolean | no | `false` | JSON `{channel_id, ...}` reflecting the channel shape. |

**Arguments:** `<channel>` — e.g. `ch_AAAAAAAA`.

**Browser step required:** No

**Keys printed:**

For WhatsApp channels (six keys, no `PORT`):

| Key | Purpose |
|-----|---------|
| `META_GRAPH_API_URL` | Versioned gateway base for this channel (`https://gateway.hookmyapp.com/meta/v22.0`). The kit appends `/{phone_number_id}/messages`, so the version segment must be present. |
| `WHATSAPP_ACCESS_TOKEN` | A gateway API key (`hmp_…`), minted for this channel. Send it as `Authorization: Bearer`. Rotate via `hookmyapp keys revoke` + `hookmyapp keys create` if leaked. |
| `WHATSAPP_PHONE_NUMBER_ID` | The phone number ID for this channel. |
| `WHATSAPP_WABA_ID` | WhatsApp Business Account ID. |
| `HOOKMYAPP_CHANNEL_ID` | HookMyApp channel public ID. |
| `VERIFY_TOKEN` | Per-channel HMAC secret for webhook verification. |

Instagram channels print the five-key `INSTAGRAM_*` set: `INSTAGRAM_GRAPH_API_URL` (gateway base `https://gateway.hookmyapp.com/meta/v25.0`), `INSTAGRAM_ACCESS_TOKEN` (a gateway `hmp_…` key), `INSTAGRAM_USER_ID`, `HOOKMYAPP_CHANNEL_ID`, `VERIFY_TOKEN`.

> **Safety:** `WHATSAPP_ACCESS_TOKEN` and `INSTAGRAM_ACCESS_TOKEN` carry a gateway `hmp_` API key, not a Meta token. It is scoped to one channel and revocable via `hookmyapp keys revoke`, but still secret. Never log it, never paste it into a chat, never commit it. Store only in an environment-variable secret manager (e.g. GCP Secret Manager, AWS Secrets Manager, Vault).

## channels env --write

`--write` mints a fresh gateway API key and writes a ready-to-read `.env`. The written WhatsApp file looks like this (Instagram swaps in the `INSTAGRAM_*` keys and `/meta/v25.0`):

```dotenv
# .env  (written by: hookmyapp channels env ch_AAAAAAAA --write)
META_GRAPH_API_URL=https://gateway.hookmyapp.com/meta/v22.0
WHATSAPP_ACCESS_TOKEN=hmp_live_AbCdEf0123456789AbCdEf0123456789
WHATSAPP_PHONE_NUMBER_ID=1080996501762047
WHATSAPP_WABA_ID=1276334778010256
HOOKMYAPP_CHANNEL_ID=ch_AAAAAAAA
VERIFY_TOKEN=replace-with-your-32-char-webhook-token
```

The base URL is always **versioned** (`/meta/v22.0` for WhatsApp, `/meta/v25.0` for Instagram) because your app appends `/{id}/messages` to it. A bare `/meta` base would produce `/{id}/messages` with no API version and Meta would reject it. Never put a bare `/meta` in a customer `.env`.

Because `--write` mints a fresh key on every run, re-running it rotates the key in that file. The previously written key keeps working until you `hookmyapp keys revoke` it.

**Examples:**

```bash
# Write the keys (and a fresh hmp_ gateway key) straight into .env
hookmyapp channels env ch_AAAAAAAA --write

# Write to a named file
hookmyapp channels env ch_AAAAAAAA --write .env.whatsapp

# JSON for programmatic use (mints a key)
hookmyapp channels env ch_AAAAAAAA --json
```

> **Direct Meta access still works.** Existing integrations that read a raw Meta token and call `https://graph.facebook.com` are unaffected. The gateway `.env` above is the recommended shape for new setups.

**Exit codes:** `0` success · `1` channel not found · `2` key minting failed (re-run `channels connect`).
