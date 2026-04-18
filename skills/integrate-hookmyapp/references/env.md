---
name: env
description: Print the three production env keys for a WABA (distinct from the five sandbox keys).
---

# Production Env

`hookmyapp env <waba-id>` prints the three env keys your app needs to call Meta's Graph API directly against a production WABA. This is distinct from `sandbox env --write`, which writes five keys for the sandbox-proxy flow.

| Flow | Command | Keys |
|------|---------|------|
| Sandbox (dev) | `sandbox env --write .env` | 5 keys: `VERIFY_TOKEN`, `PORT`, `WHATSAPP_API_URL`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` |
| Production | `env <waba-id>` | 3 keys: `WABA_ID`, `ACCESS_TOKEN`, `PHONE_NUMBER_ID` |

## env

Print production credentials for a WABA.

**Flags:**

| Flag | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `--workspace` | string | no | active | Target workspace. |
| `--json` | boolean | no | `false` | JSON `{waba_id, access_token, phone_number_id}`. |

**Arguments:** `<waba-id>` — e.g. `1276334778010256`.

**Browser step required:** No

**Keys printed:**

| Key | Purpose |
|-----|---------|
| `WABA_ID` | WhatsApp Business Account ID (matches the positional arg). |
| `ACCESS_TOKEN` | Long-lived system-user access token minted during `channels connect`. Rotate via the Meta App Dashboard if leaked. |
| `PHONE_NUMBER_ID` | The default phone number ID. If the WABA has multiple numbers, use `channels list --json` to enumerate. |

> **Safety:** `ACCESS_TOKEN` is a long-lived system-user token. Never log it, never paste it into a chat, never commit it. Store only in an environment-variable secret manager (e.g. GCP Secret Manager, AWS Secrets Manager, Vault).

**Examples:**

```bash
# Write to your app's .env file
hookmyapp env 1276334778010256 > .env.whatsapp

# Use in a shell pipeline
export ACCESS_TOKEN=$(hookmyapp env 1276334778010256 --json | jq -r .access_token)
```

**Exit codes:** `0` success · `1` WABA not found · `2` token minting failed (re-run `channels connect`).
