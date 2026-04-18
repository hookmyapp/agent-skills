---
name: token
description: Print the long-lived system-user access token for a WABA.
---

# Token

`hookmyapp token <waba-id>` is a convenience command that prints just the `ACCESS_TOKEN` value — useful for shell pipelines and one-shot curl calls without wanting the full three-key output of `env`.

## token

Print the long-lived system-user access token.

**Flags:**

| Flag | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `--workspace` | string | no | active | Target workspace. |
| `--json` | boolean | no | `false` | JSON `{waba_id, access_token}`. |

**Arguments:** `<waba-id>` — e.g. `1276334778010256`.

**Browser step required:** No

> **Safety:** Long-lived system-user tokens survive rotations of the human's Meta session. Treat the token as the crown jewel; a leaked token lets the bearer send arbitrary WhatsApp messages as your business until it is manually revoked in the Meta App Dashboard. Never log it, never paste it into chat, never commit it.

**Examples:**

```bash
# Plain print (to a secret manager command, not a file)
gcloud secrets versions add whatsapp-access-token \
  --data-file=<(hookmyapp token 1276334778010256)

# One-shot curl call
curl -H "Authorization: Bearer $(hookmyapp token 1276334778010256)" \
  https://graph.facebook.com/v19.0/1276334778010256
```

**Exit codes:** `0` success · `1` WABA not found · `2` token minting failed (re-run `channels connect`).
