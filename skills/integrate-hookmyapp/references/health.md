---
name: health
description: Check WABA health (phone numbers, webhook subscription, quality rating).
---

# Health

`hookmyapp health <waba-id>` surfaces the pieces that routinely break WhatsApp integrations: unregistered phone numbers, stale webhook subscriptions, or a flagged quality rating. Run it first when triaging "my webhooks stopped arriving."

## health

Print WABA health status.

**Flags:**

| Flag | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `--workspace` | string | no | active | Target workspace. |
| `--json` | boolean | no | `false` | JSON output (see schema below). |

**Arguments:** `<waba-id>` — e.g. `1276334778010256`.

**Browser step required:** No

**JSON schema (`--json`):**

```json
{
  "waba_id": "1276334778010256",
  "status": "healthy",
  "phone_numbers": [
    {
      "id": "1080996501762047",
      "display_number": "+1 555 123 4567",
      "code_verification_status": "VERIFIED",
      "quality_rating": "GREEN"
    }
  ],
  "webhook": {
    "override_callback_uri": "https://api.acme.com/whatsapp/webhook",
    "subscribed_fields": ["messages"],
    "verified": true
  }
}
```

**Status values:** `healthy` · `degraded` (e.g. quality rating YELLOW) · `unhealthy` (verification failed or webhook unreachable).

**Examples:**

```bash
hookmyapp health 1276334778010256

# Gate a CI deploy on healthy status
test "$(hookmyapp health 1276334778010256 --json | jq -r .status)" = "healthy" \
  || { echo "WABA not healthy — aborting deploy"; exit 1; }
```

**Exit codes:** `0` healthy · `1` degraded · `2` unhealthy · `3` WABA not found.
