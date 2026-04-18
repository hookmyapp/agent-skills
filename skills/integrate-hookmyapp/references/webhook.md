---
name: webhook
description: Set and inspect the production webhook override URL for a WABA.
---

# Webhooks

Configure which URL Meta POSTs your production WABA events to. Under the hood this writes Meta's `override_callback_uri` field on the WABA via the Graph API — it takes precedence over any app-level webhook configured in the Meta App Dashboard's Webhooks card.

> **Scope:** These commands operate on **production** WABAs only. Sandbox webhook delivery is handled by `sandbox listen` (Cloudflare tunnel).

## webhook set

Set the production webhook URL for a specific WABA.

**Flags:**

| Flag | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `--url` | URL | yes | — | Public HTTPS URL. Must respond `200` with `VERIFY_TOKEN` body on Meta's verify GET. |
| `--workspace` | string | no | active | Target workspace. |
| `--env` | `staging\|production` | no | `production` | Environment (must be `production`). |
| `--json` | boolean | no | `false` | JSON output. |

**Arguments:** `<waba-id>` — e.g. `1276334778010256`.

**Browser step required:** No

> **Safety:** Before `webhook set --env production`, confirm the URL and WABA ID with the human. Pointing production webhooks at a dev URL silently drops inbound messages.

**Examples:**

```bash
hookmyapp webhook set 1276334778010256 --url https://api.acme.com/whatsapp/webhook
```

**Exit codes:** `0` success · `1` URL did not pass Meta's verify GET · `2` WABA not found in workspace · `3` not authorized for WABA.

## webhook show

Print the current `override_callback_uri` for a WABA.

**Flags:**

| Flag | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `--workspace` | string | no | active | Target workspace. |
| `--json` | boolean | no | `false` | JSON output `{waba_id, url, verified}`. |

**Arguments:** `<waba-id>`

**Browser step required:** No

**Examples:**

```bash
hookmyapp webhook show 1276334778010256
# → https://api.acme.com/whatsapp/webhook  (verified)
```

**Exit codes:** `0` success (even if unset — prints `<none>`) · `1` WABA not found.
