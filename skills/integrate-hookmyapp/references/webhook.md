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
| `--verify-token` | string | no | (prior token) | HMAC key for `X-HookMyApp-Signature-256` signature verification on forwarded webhooks. In production, pick a strong random 32+ char token. Omitting the flag leaves the prior token in place (desirable for URL-only rotation; undesirable when you want to rotate the token itself). See SKILL.md "Signature verification" for how the token is used. |

Global flags: `--workspace`, `--env`, `--json`.

**Arguments:** `<waba-id>` — e.g. `1276334778010256`.

**Browser step required:** No

> **Safety:** Before `webhook set --env production`, confirm the URL and WABA ID with the human. Pointing production webhooks at a dev URL silently drops inbound messages.

**Examples:**

Either flag is optional except on first-time setup, where `--verify-token` is required (the forwarder has no prior token to preserve). Subsequent calls may omit either flag to keep the existing value on that field.

```bash
# First-time production setup — set URL and mint a verify token (both required)
hookmyapp webhook set 1276334778010256 \
  --url https://api.acme.com/whatsapp/webhook \
  --verify-token $(openssl rand -hex 32)

# URL rotation only (keeps prior verify token)
hookmyapp webhook set 1276334778010256 --url https://new-host.acme.com/webhook
```

### Rotating VERIFY_TOKEN

Server-side rotation is a two-step dance: the CLI changes the forwarder's signing key, and your server has to read the new token from `.env` simultaneously. A gap between the two breaks signature verification (your handler decides the response — the starter kit returns `401`; your implementation may differ) until both sides agree.

```bash
hookmyapp webhook set 1276334778010256 \
  --url https://api.acme.com/whatsapp/webhook \
  --verify-token <new-token>
```

Roll your server's `VERIFY_TOKEN` env var at the same time (same deploy, ideally) — otherwise inbound traffic will fail signature verification during the window between server restart and `webhook set`, and your handler will reject each request with whatever status it returns on HMAC mismatch.

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
