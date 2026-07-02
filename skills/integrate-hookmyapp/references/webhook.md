---
name: webhook
description: "Set, inspect, and clear the webhook override URL for a channel via `channels webhook`."
---

# Webhooks

Configure which URL Meta POSTs your channel's events to. Under the hood this writes Meta's `override_callback_uri` field via the Graph API — it takes precedence over any app-level webhook configured in the Meta App Dashboard's Webhooks card.

Use `hookmyapp channels webhook {show,set,clear} <channel>`.

> **Scope:** These commands operate on your own (connected) channels only. Sandbox webhook delivery is handled by `sandbox listen` (Cloudflare tunnel) or `sandbox webhook {show,set,clear}`.

## channels webhook set

Set the webhook URL for a specific channel.

**Flags:**

| Flag | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `--url` | URL | yes | — | Public HTTPS URL. Must respond `200` with `VERIFY_TOKEN` body on Meta's verify GET. |
| `--verify-token` | string | no | (prior token) | Plain-text value your endpoint must return on the webhook verify GET. Pick a strong random 32+ char token. NOT the HMAC signing key — `X-HookMyApp-Signature-256` is keyed on the channel's separate `WEBHOOK_HMAC_SECRET` (exported by `channels env`), which this command never touches. Omitting the flag leaves the prior token in place (desirable for URL-only rotation; undesirable when you want to rotate the token itself). See SKILL.md "Signature verification". |

Global flags: `--workspace`, `--json`.

**Arguments:** `<channel>` — a `ch_xxxxxxxx` publicId, `+<E164phone>`, or `@<handle>`. Example: `ch_AAAAAAAA`.

**Browser step required:** No

> **Safety:** Before `channels webhook set`, confirm the URL and channel ref with the human. Pointing your channel's webhooks at a dev URL silently drops inbound messages.

**Examples:**

Either flag is optional except on first-time setup, where `--verify-token` is required (the forwarder has no prior token to preserve). Subsequent calls may omit either flag to keep the existing value on that field.

```bash
# First-time setup — set URL and mint a verify token (both required)
hookmyapp channels webhook set ch_AAAAAAAA \
  --url https://api.acme.com/whatsapp/webhook \
  --verify-token $(openssl rand -hex 32)

# URL rotation only (keeps prior verify token)
hookmyapp channels webhook set ch_AAAAAAAA --url https://new-host.acme.com/webhook
```

### Rotating VERIFY_TOKEN

Two distinct secrets, only one of which this command rotates:

- **`VERIFY_TOKEN`** (rotated by `--verify-token`) — the verify-GET handshake value. Roll your server's `VERIFY_TOKEN` env var in the same deploy; the URL re-verification probe fails until your endpoint returns the new value.
- **`WEBHOOK_HMAC_SECRET`** (NOT touched by this command) — the HMAC-SHA256 key for `X-HookMyApp-Signature-256`. Signature verification keeps working across a verify-token rotation. Re-pull it any time with `hookmyapp channels env <channel>`.

```bash
hookmyapp channels webhook set ch_AAAAAAAA \
  --url https://api.acme.com/whatsapp/webhook \
  --verify-token <new-token>
```

**Exit codes:** `0` success · `1` URL did not pass Meta's verify GET · `2` WABA not found in workspace · `3` not authorized for WABA.

## channels webhook show

Print the current `override_callback_uri` for a channel.

**Flags:**

| Flag | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `--workspace` | string | no | active | Target workspace. |
| `--json` | boolean | no | `false` | JSON output `{channel_id, url, verified}`. |

**Arguments:** `<channel>`

**Browser step required:** No

**Examples:**

```bash
hookmyapp channels webhook show ch_AAAAAAAA
# → https://api.acme.com/whatsapp/webhook  (verified)
```

**Exit codes:** `0` success (even if unset — prints `<none>`) · `1` channel not found.

## channels webhook clear

Clear the channel's override URL and revert delivery to the HookMyApp CLI tunnel destination (HookMyAppCLI). Idempotent: clearing an already-cleared channel is a no-op success.

**Arguments:** `<channel>`

**Examples:**

```bash
hookmyapp channels webhook clear ch_AAAAAAAA
```

After clearing, the channel awaits a `hookmyapp channels listen` to pick up inbound webhooks, or you can `channels webhook set` a new URL.
