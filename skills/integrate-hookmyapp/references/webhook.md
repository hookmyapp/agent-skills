---
name: webhook
description: "Set, inspect, and clear the webhook destination URL for a channel via `channels webhook`."
---

# Webhooks

Configure which URL HookMyApp delivers your channel's events to. Meta always delivers to HookMyApp; HookMyApp forwards each event to your configured URL, scoped to the one phone number it belongs to, signed with the channel's `WEBHOOK_HMAC_SECRET` as `X-HookMyApp-Signature-256`. Nothing is configured on Meta's side, and there is no per-channel setting in the Meta App Dashboard.

Use `hookmyapp channels webhook {show,set,clear} <channel>`.

> **Scope:** These commands operate on your own (connected) channels only. Sandbox webhook delivery is handled by `sandbox listen` (Cloudflare tunnel) or `sandbox webhook {show,set,clear}`.

## channels webhook set

Set the webhook URL for a specific channel.

**Flags:**

| Flag | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `--url` | URL | yes | — | Public HTTPS URL. Must respond `200` with `VERIFY_TOKEN` body on HookMyApp's verify GET probe. |
| `--verify-token` | string | no | (prior token, or auto-generated) | Plain-text value your endpoint must return on the webhook verify GET. NOT the HMAC signing key — `X-HookMyApp-Signature-256` is keyed on the channel's separate `WEBHOOK_HMAC_SECRET` (exported by `channels env`), which this command never touches. Omitting the flag keeps the prior token (URL-only rotation); if the channel has none yet, the backend auto-generates one (the same `VERIFY_TOKEN` that `channels env` exports). See SKILL.md "Signature verification". |

Global flags: `--workspace`, `--json`.

**Arguments:** `<channel>` — a `ch_xxxxxxxx` publicId, `+<E164phone>`, or `@<handle>`. Example: `ch_AAAAAAAA`.

**Browser step required:** No

> **Safety:** Before `channels webhook set`, confirm the URL and channel ref with the human. Pointing your channel's webhooks at a dev URL silently drops inbound events.

**Examples:**

`--verify-token` is always optional — the backend auto-generates a verify token when the channel has none (the same value `channels env` exports as `VERIFY_TOKEN`). Omit it on later calls to keep the existing token; `--url` is required on every call.

```bash
# First-time setup — URL only (verify token auto-generated; read it via `channels env`)
hookmyapp channels webhook set ch_AAAAAAAA \
  --url https://api.acme.com/whatsapp/webhook

# Choose your own verify token instead
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

**Exit codes:** `0` success · `2` URL did not pass the verify GET probe (validation) · `1` channel not found · `3` not authorized for the channel.

## channels webhook show

Print the channel's configured destination URL.

**Flags:**

| Flag | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `--workspace` | string | no | active | Target workspace. |
| `--json` | boolean | no | `false` | JSON output `{channelId, webhookUrl, verifyToken}` (`webhookUrl`/`verifyToken` are `null` when unset). |

**Arguments:** `<channel>`

**Browser step required:** No

**Examples:**

```bash
hookmyapp channels webhook show ch_AAAAAAAA
# → https://api.acme.com/whatsapp/webhook  (verified)
```

**Exit codes:** `0` success (even if unset — prints `<none>`) · `1` channel not found.

## channels webhook clear

Clear the channel's destination URL and revert delivery to the HookMyApp CLI tunnel destination (HookMyAppCLI). Idempotent: clearing an already-cleared channel is a no-op success.

**Arguments:** `<channel>`

**Examples:**

```bash
hookmyapp channels webhook clear ch_AAAAAAAA
```

After clearing, the channel awaits a `hookmyapp channels listen` to pick up inbound webhooks, or you can `channels webhook set` a new URL.
