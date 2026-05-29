---
name: webhook
description: "Set, inspect, and clear the production webhook override URL for a channel via `channels webhook`."
---

# Webhooks

Configure which URL Meta POSTs your production channel events to. Under the hood this writes Meta's `override_callback_uri` field via the Graph API — it takes precedence over any app-level webhook configured in the Meta App Dashboard's Webhooks card.

The canonical form is `hookmyapp channels webhook {show,set,clear} <channel>`. The bare top-level `hookmyapp webhook …` alias still works but prints a deprecation notice pointing at the `channels webhook` equivalent.

> **Scope:** These commands operate on **production** channels only. Sandbox webhook delivery is handled by `sandbox listen` (Cloudflare tunnel) or `sandbox webhook {show,set,clear}`.

## channels webhook set

Set the production webhook URL for a specific channel.

**Flags:**

| Flag | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `--url` | URL | yes | — | Public HTTPS URL. Must respond `200` with `VERIFY_TOKEN` body on Meta's verify GET. |
| `--verify-token` | string | no | (prior token) | HMAC key for `X-HookMyApp-Signature-256` signature verification on forwarded webhooks. In production, pick a strong random 32+ char token. Omitting the flag leaves the prior token in place (desirable for URL-only rotation; undesirable when you want to rotate the token itself). See SKILL.md "Signature verification" for how the token is used. |

Global flags: `--workspace`, `--json`.

**Arguments:** `<channel>` — a `ch_xxxxxxxx` publicId, `+<E164phone>`, or `@<handle>`. Example: `ch_AAAAAAAA`.

**Browser step required:** No

> **Safety:** Before `channels webhook set`, confirm the URL and channel ref with the human. Pointing production webhooks at a dev URL silently drops inbound messages.

**Examples:**

Either flag is optional except on first-time setup, where `--verify-token` is required (the forwarder has no prior token to preserve). Subsequent calls may omit either flag to keep the existing value on that field.

```bash
# First-time production setup — set URL and mint a verify token (both required)
hookmyapp channels webhook set ch_AAAAAAAA \
  --url https://api.acme.com/whatsapp/webhook \
  --verify-token $(openssl rand -hex 32)

# URL rotation only (keeps prior verify token)
hookmyapp channels webhook set ch_AAAAAAAA --url https://new-host.acme.com/webhook
```

### Rotating VERIFY_TOKEN

Server-side rotation is a two-step dance: the CLI changes the forwarder's signing key, and your server has to read the new token from `.env` simultaneously. A gap between the two breaks signature verification (your handler decides the response — the starter kit returns `401`; your implementation may differ) until both sides agree.

```bash
hookmyapp channels webhook set ch_AAAAAAAA \
  --url https://api.acme.com/whatsapp/webhook \
  --verify-token <new-token>
```

Roll your server's `VERIFY_TOKEN` env var at the same time (same deploy, ideally) — otherwise inbound traffic will fail signature verification during the window between server restart and `webhook set`, and your handler will reject each request with whatever status it returns on HMAC mismatch.

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
