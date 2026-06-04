---
name: access-tokens
description: "Mint, list, and revoke gateway access tokens for a channel via `hookmyapp access-tokens`."
---

# API Keys

Your app talks to Meta through the HookMyApp gateway (`https://gateway.hookmyapp.com/meta/...`) using a gateway **access token**, not a raw Meta token. The key is HookMyApp's: it is scoped to one connection (channel), it is revocable at any time, and the underlying long-lived Meta token never leaves HookMyApp. You mint an access token with `hookmyapp access-tokens create <channel>`, carry it in your `.env`, and send it as `Authorization: Bearer hmat_...`. The gateway swaps it for the Meta token server-side and forwards your request verbatim.

## access-tokens create

Mint a fresh gateway access token for a channel. The plaintext token is shown **once** at creation time. Store it immediately (secret manager or `.env`); HookMyApp keeps only a hash and cannot re-display it. Mint a new access token if you lose it.

**Flags:**

| Flag | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `--workspace` | string | no | active | Target workspace. |
| `--json` | boolean | no | `false` | JSON `{channel_id, token}` (token shown once). |

**Arguments:** `<channel>` — a `ch_xxxxxxxx` publicId, `+<E164phone>`, or `@<handle>`. Example: `ch_AAAAAAAA`.

**Browser step required:** No

> **Safety:** The `hmat_` access token authenticates to the gateway as this one channel. A leaked access token lets the bearer send messages on that channel until you `access-tokens revoke` it. Because it is scoped and revocable, rotating it is a single CLI call (no Meta App Dashboard trip, no Meta-session impact). Never log it, never paste it into chat, never commit it.

**Examples:**

```bash
# Mint an access token and pipe it into a secret manager (plaintext shown once)
hookmyapp access-tokens create ch_AAAAAAAA --json \
  | jq -r .token \
  | gcloud secrets versions add hookmyapp-gateway-key --data-file=-

# One-shot curl call through the gateway (path after /meta is verbatim Meta Graph API)
curl -H "Authorization: Bearer $(hookmyapp access-tokens create ch_AAAAAAAA --json | jq -r .token)" \
  https://gateway.hookmyapp.com/meta/v22.0/1276334778010256
```

## access-tokens list

List the gateway access tokens for a channel. Shows access token id, label, and creation time, but **never** the plaintext token (which exists only at creation).

**Flags:**

| Flag | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `--workspace` | string | no | active | Target workspace. |
| `--json` | boolean | no | `false` | JSON rows `{token_id, prefix, created_at, last_used_at}`. |

**Arguments:** `<channel>` — e.g. `ch_AAAAAAAA`.

**Browser step required:** No

**Examples:**

```bash
hookmyapp access-tokens list ch_AAAAAAAA
hookmyapp access-tokens list ch_AAAAAAAA --json | jq '.[] | .token_id'
```

## access-tokens revoke

Revoke a gateway access token immediately. Requests bearing a revoked access token get rejected by the gateway from the next call. Revoking does not touch the underlying Meta token or any other access token on the channel.

**Flags:**

| Flag | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `--workspace` | string | no | active | Target workspace. |

**Arguments:** `<token-id>` — the access token id from `access-tokens list`.

**Browser step required:** No

**Examples:**

```bash
hookmyapp access-tokens revoke tok_AAAAAAAA
```

> **Direct Meta access still works.** Existing integrations that call `https://graph.facebook.com` with their own Meta token are unaffected. The gateway with a minted `hmat_` access token is the recommended path for new setups.

**Exit codes:** `0` success · `1` channel or access token not found · `2` access token minting failed (re-run `channels connect`).
