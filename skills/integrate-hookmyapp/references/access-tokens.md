---
name: channel-tokens
description: "Read and rotate a channel's gateway access token via `hookmyapp channels token [--rotate]`."
---

# Channel Tokens

Your app talks to Meta through the HookMyApp gateway (`https://gateway.hookmyapp.com/meta/...`) using a gateway **access token**, not a raw Meta token. The key is HookMyApp's: it is scoped to one connection (channel) — and to that channel's own phone number (a WABA can hold several numbers; each connects as its own channel with its own token) — it is rotatable at any time, and the underlying long-lived Meta token never leaves HookMyApp. Every channel is born with exactly one active access token, minted automatically at `channels connect`. You read it with `hookmyapp channels token <channel>` (or `channels env <channel>`), carry it in your `.env`, and send it as `Authorization: Bearer hmat_...`. The gateway swaps it for the Meta token server-side and forwards your request verbatim.

There is no create/list/revoke surface: one channel, one active token. Rotation replaces it atomically.

## channels token

Print the channel's current gateway access token.

**Flags:**

| Flag | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `--rotate` | boolean | no | `false` | Revoke the current token and issue a new one, then print it. |
| `--workspace` | string | no | active | Target workspace. |
| `--json` | boolean | no | `false` | JSON `{channel_id, token}`. |

**Arguments:** `<channel>` — a `ch_xxxxxxxx` publicId, `+<E164phone>`, or `@<handle>`. Example: `ch_AAAAAAAA`.

**Browser step required:** No

> **Safety:** The `hmat_` access token authenticates to the gateway as this one channel, and the gateway only accepts calls scoped to that channel's own phone number — sibling numbers on the same WABA are separate channels with separate tokens. A leaked access token lets the bearer act on that channel until you rotate it. Because it is scoped and rotatable, recovery is a single CLI call (no Meta App Dashboard trip, no Meta-session impact). Never log it, never paste it into chat, never commit it.

**Examples:**

```bash
# Read the channel's token and pipe it into a secret manager
hookmyapp channels token ch_AAAAAAAA --json \
  | jq -r .token \
  | gcloud secrets versions add hookmyapp-gateway-key --data-file=-

# One-shot curl call through the gateway (path after /meta is verbatim Meta Graph API)
curl -H "Authorization: Bearer $(hookmyapp channels token ch_AAAAAAAA --json | jq -r .token)" \
  https://gateway.hookmyapp.com/meta/v22.0/1276334778010256
```

## channels token --rotate

Rotate the channel's gateway access token: the current token is revoked and a fresh one is minted in one atomic step, then printed. Requests bearing the old token get rejected by the gateway from the next call. Rotating does not touch the underlying Meta token.

Use it when a token leaks, or on whatever rotation cadence your security policy demands. Update your `.env` / secret manager with the new value immediately — and remember every copy of the old token (CI secrets, teammate `.env` files) stops working the moment you rotate.

**Examples:**

```bash
hookmyapp channels token ch_AAAAAAAA --rotate
```

> **Direct Meta access still works.** Existing integrations that call `https://graph.facebook.com` with their own Meta token are unaffected. The gateway with the channel's `hmat_` access token is the recommended path for new setups.

**Exit codes:** `0` success · `1` channel not found · `2` token read/rotate failed (re-run `channels connect`).
