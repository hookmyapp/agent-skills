---
name: keys
description: "Mint, list, and revoke gateway API keys for a channel via `hookmyapp keys`."
---

# API Keys

Your app talks to Meta through the HookMyApp gateway (`https://gateway.hookmyapp.com/meta/...`) using a gateway **API key**, not a raw Meta token. The key is HookMyApp's: it is scoped to one connection (channel), it is revocable at any time, and the underlying long-lived Meta token never leaves HookMyApp. You mint a key with `hookmyapp keys create <channel>`, carry it in your `.env`, and send it as `Authorization: Bearer hmp_...`. The gateway swaps it for the Meta token server-side and forwards your request verbatim.

## keys create

Mint a fresh gateway API key for a channel. The plaintext key is shown **once** at creation time. Store it immediately (secret manager or `.env`); HookMyApp keeps only a hash and cannot re-display it. Mint a new key if you lose it.

**Flags:**

| Flag | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `--workspace` | string | no | active | Target workspace. |
| `--json` | boolean | no | `false` | JSON `{channel_id, key}` (key shown once). |

**Arguments:** `<channel>` — a `ch_xxxxxxxx` publicId, `+<E164phone>`, or `@<handle>`. Example: `ch_AAAAAAAA`.

**Browser step required:** No

> **Safety:** The `hmp_` key authenticates to the gateway as this one channel. A leaked key lets the bearer send messages on that channel until you `keys revoke` it. Because it is scoped and revocable, rotating it is a single CLI call (no Meta App Dashboard trip, no Meta-session impact). Never log it, never paste it into chat, never commit it.

**Examples:**

```bash
# Mint a key and pipe it into a secret manager (plaintext shown once)
hookmyapp keys create ch_AAAAAAAA --json \
  | jq -r .key \
  | gcloud secrets versions add hookmyapp-gateway-key --data-file=-

# One-shot curl call through the gateway (path after /meta is verbatim Meta Graph API)
curl -H "Authorization: Bearer $(hookmyapp keys create ch_AAAAAAAA --json | jq -r .key)" \
  https://gateway.hookmyapp.com/meta/v22.0/1276334778010256
```

## keys list

List the gateway API keys for a channel. Shows key id, label, and creation time, but **never** the plaintext key (which exists only at creation).

**Flags:**

| Flag | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `--workspace` | string | no | active | Target workspace. |
| `--json` | boolean | no | `false` | JSON rows `{key_id, prefix, created_at, last_used_at}`. |

**Arguments:** `<channel>` — e.g. `ch_AAAAAAAA`.

**Browser step required:** No

**Examples:**

```bash
hookmyapp keys list ch_AAAAAAAA
hookmyapp keys list ch_AAAAAAAA --json | jq '.[] | .key_id'
```

## keys revoke

Revoke a gateway API key immediately. Requests bearing a revoked key get rejected by the gateway from the next call. Revoking does not touch the underlying Meta token or any other key on the channel.

**Flags:**

| Flag | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `--workspace` | string | no | active | Target workspace. |

**Arguments:** `<key-id>` — the key id from `keys list`.

**Browser step required:** No

**Examples:**

```bash
hookmyapp keys revoke key_AAAAAAAA
```

> **Direct Meta access still works.** Existing integrations that call `https://graph.facebook.com` with their own Meta token are unaffected. The gateway with a minted `hmp_` key is the recommended path for new setups.

**Exit codes:** `0` success · `1` channel or key not found · `2` key minting failed (re-run `channels connect`).
