---
name: env
description: Print the env keys for a connected channel (`channels env`), distinct from the five sandbox keys.
---

# Channel Env

`hookmyapp channels env <channel>` prints the env keys your app reads to talk to Meta directly for a real connected channel. This is distinct from `sandbox env`, which writes the sandbox-proxy key set. The key NAMES differ between the two contexts; teach the one matching the channel you are configuring.

| Context | Command | WhatsApp keys | Instagram keys |
|---|---|---|---|
| Real channel | `channels env <channel>` | `META_GRAPH_API_URL`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_WABA_ID`, `HOOKMYAPP_CHANNEL_ID`, `VERIFY_TOKEN` (no `PORT`) | `INSTAGRAM_GRAPH_API_URL`, `INSTAGRAM_ACCESS_TOKEN`, `INSTAGRAM_USER_ID`, `HOOKMYAPP_CHANNEL_ID`, `VERIFY_TOKEN` (no `PORT`) |
| Sandbox | `sandbox env` | `WHATSAPP_API_URL`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `VERIFY_TOKEN`, `PORT` | `INSTAGRAM_API_URL`, `INSTAGRAM_ACCESS_TOKEN`, `INSTAGRAM_ACCOUNT_ID`, `VERIFY_TOKEN`, `PORT` |

> The base-URL key and the account-id key are NAMED differently per context: real-channel WhatsApp uses `META_GRAPH_API_URL`, sandbox uses `WHATSAPP_API_URL`; real-channel Instagram uses `INSTAGRAM_GRAPH_API_URL` + `INSTAGRAM_USER_ID`, sandbox uses `INSTAGRAM_API_URL` + `INSTAGRAM_ACCOUNT_ID`. The table above is the complete key set for each context. No additional version or graph-version keys exist.

## channels env

Print credentials for a connected channel.

**Flags:**

| Flag | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `--workspace` | string | no | active | Target workspace. |
| `--json` | boolean | no | `false` | JSON `{channel_id, ...}` reflecting the channel shape. |

**Arguments:** `<channel>` — e.g. `ch_AAAAAAAA`.

**Browser step required:** No

**Keys printed:**

For WhatsApp channels (six keys, no `PORT`):

| Key | Purpose |
|-----|---------|
| `META_GRAPH_API_URL` | Meta Graph API base URL for this channel. |
| `WHATSAPP_ACCESS_TOKEN` | Long-lived system-user access token minted during `channels connect`. Rotate via the Meta App Dashboard if leaked. |
| `WHATSAPP_PHONE_NUMBER_ID` | The phone number ID for this channel. |
| `WHATSAPP_WABA_ID` | WhatsApp Business Account ID. |
| `HOOKMYAPP_CHANNEL_ID` | HookMyApp channel public ID. |
| `VERIFY_TOKEN` | Per-channel HMAC secret for webhook verification. |

Instagram channels print the five-key `INSTAGRAM_*` set: `INSTAGRAM_GRAPH_API_URL`, `INSTAGRAM_ACCESS_TOKEN`, `INSTAGRAM_USER_ID`, `HOOKMYAPP_CHANNEL_ID`, `VERIFY_TOKEN`.

> **Safety:** `WHATSAPP_ACCESS_TOKEN` and `INSTAGRAM_ACCESS_TOKEN` are long-lived system-user tokens. Never log them, never paste them into a chat, never commit them. Store only in an environment-variable secret manager (e.g. GCP Secret Manager, AWS Secrets Manager, Vault).

**Examples:**

```bash
# Write to your app's .env file
hookmyapp channels env ch_AAAAAAAA > .env.whatsapp

# Use in a shell pipeline
export ACCESS_TOKEN=$(hookmyapp channels env ch_AAAAAAAA --json | jq -r .access_token)
```

**Exit codes:** `0` success · `1` channel not found · `2` token minting failed (re-run `channels connect`).
