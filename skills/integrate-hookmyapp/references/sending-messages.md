---
name: sending-messages
description: Send WhatsApp or Instagram messages from your app against Meta Graph API. Works identically for sandbox and your own channel; only env values and (for Instagram) the body shape change.
---

# Sending Messages

Once your env is populated (either `sandbox env --write` or `channels env <channel>`), sending a WhatsApp message is a single HTTP POST to `https://gateway.hookmyapp.com/meta/v22.0/${PHONE_NUMBER_ID}/messages` with a Bearer gateway access token (the `hmat_…` key minted automatically at connect; read it with `channels env <channel>` or `hookmyapp channels token <channel>`). The path after `/meta` is verbatim Meta Graph API: the gateway forwards your request to Meta using the underlying Meta token (which never leaves HookMyApp) and returns Meta's response unchanged. Our docs here are Meta's docs. Sandbox traffic still goes through `sandbox-proxy` (which rewrites the URL base at `WHATSAPP_API_URL`); your own channel routes through the gateway at `META_GRAPH_API_URL`. Your app code does not change between the two. Instagram uses a different endpoint base and body shape; see the Instagram section below.

> **Direct Meta access still works.** If you already call `https://graph.facebook.com/v22.0` with your own Meta token, that path is unaffected and keeps working. The gateway is the recommended path for new setups: you carry a revocable `hmat_` access token instead of the long-lived Meta token, scoped to a single connection.

## JavaScript / TypeScript (`fetch`)

```js
// sendMessage.js
// Real channel: META_GRAPH_API_URL is the versioned gateway base
// (https://gateway.hookmyapp.com/meta/v22.0). Sandbox: WHATSAPP_API_URL
// points at sandbox-proxy. The fallback below is the gateway default.
const API_URL =
  process.env.WHATSAPP_API_URL ||
  process.env.META_GRAPH_API_URL ||
  'https://gateway.hookmyapp.com/meta/v22.0';
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
// Real channel: a gateway access token (hmat_…). Sandbox: the sandbox-proxy key.
const HOOKMYAPP_KEY = process.env.WHATSAPP_ACCESS_TOKEN;

/**
 * Send a plain text WhatsApp message.
 * @param {string} to E.164 recipient (e.g. '+15551234567'). Sandbox ignores this — recipient is pinned to session phone server-side.
 * @param {string} text Message body.
 */
export async function sendMessage(to, text) {
  const res = await fetch(`${API_URL}/${PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${HOOKMYAPP_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text },
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`WhatsApp API ${res.status}: ${JSON.stringify(err)}`);
  }
  return res.json();
}
```

## Template messages (your own channel only)

Template messages are pre-approved marketing / notification messages. They require a `template` type body and are **rejected by sandbox-proxy** (`proxy.controller.ts:67-76`) — use them only on your own channel.

```js
// sendTemplate.js (your own channel only)
export async function sendTemplate(to, templateName, languageCode = 'en_US') {
  const res = await fetch(`${API_URL}/${PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${HOOKMYAPP_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: templateName,
        language: { code: languageCode },
      },
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`WhatsApp template send ${res.status}: ${JSON.stringify(err)}`);
  }
  return res.json();
}
```

## Python port (`httpx`)

```python
# send_message.py
import os
import httpx

API_URL = os.environ.get(
    "WHATSAPP_API_URL",
    os.environ.get("META_GRAPH_API_URL", "https://gateway.hookmyapp.com/meta/v22.0"),
)
PHONE_NUMBER_ID = os.environ["WHATSAPP_PHONE_NUMBER_ID"]
HOOKMYAPP_KEY = os.environ["WHATSAPP_ACCESS_TOKEN"]

def send_message(to: str, text: str) -> dict:
    resp = httpx.post(
        f"{API_URL}/{PHONE_NUMBER_ID}/messages",
        headers={"Authorization": f"Bearer {HOOKMYAPP_KEY}"},
        json={
            "messaging_product": "whatsapp",
            "to": to,
            "type": "text",
            "text": {"body": text},
        },
        timeout=10.0,
    )
    resp.raise_for_status()
    return resp.json()
```

The `requests` library works identically — swap `httpx.post` for `requests.post` and the signature is unchanged.

## Instagram (`{recipient,message}` shape)

Instagram outbound is a POST to the Instagram Graph API base. For a real channel `INSTAGRAM_GRAPH_API_URL` is the versioned gateway base (`https://gateway.hookmyapp.com/meta/v25.0`); for sandbox `INSTAGRAM_API_URL` points at the sandbox proxy. The body shape differs from WhatsApp. The recipient is the sender's IGSID (Instagram-scoped id), captured from the inbound webhook.

```js
// sendInstagram.js
const IG_API_URL = process.env.INSTAGRAM_API_URL || process.env.INSTAGRAM_GRAPH_API_URL;
const IG_ACCOUNT_ID = process.env.INSTAGRAM_ACCOUNT_ID || process.env.INSTAGRAM_USER_ID;
// Real channel: a gateway access token (hmat_…). Sandbox: the sandbox-proxy key.
const IG_HOOKMYAPP_KEY = process.env.INSTAGRAM_ACCESS_TOKEN;

export async function sendInstagram(recipientIgsid, text) {
  const res = await fetch(`${IG_API_URL}/${IG_ACCOUNT_ID}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${IG_HOOKMYAPP_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      recipient: { id: recipientIgsid },
      message: { text },
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Instagram API ${res.status}: ${JSON.stringify(err)}`);
  }
  return res.json();
}
```

The env-key fallbacks (`INSTAGRAM_API_URL` then `INSTAGRAM_GRAPH_API_URL`; `INSTAGRAM_ACCOUNT_ID` then `INSTAGRAM_USER_ID`) bridge the sandbox vs real-channel base-URL key split documented in [env.md](env.md), plus the legacy `INSTAGRAM_USER_ID` alias from older `.env` files (both contexts now emit `INSTAGRAM_ACCOUNT_ID`).

**Private replies to comments are not a messaging feature** — they live with the comment tooling in [instagram.md](instagram.md#private-replies), not here. A private reply DMs a commenter via `POST /{IG_ACCOUNT_ID}/messages` with `recipient: {"comment_id": "<id>"}` (one DM per comment; within 7 days for post/reel comments, Live comments only while the broadcast is live). The regular DM path above is unchanged: outside a private reply, you can only DM a user within Meta's standard 24-hour window after their last message. Meta's `HUMAN_AGENT` tag (which extends manual replies to 7 days) requires a separate app-level Human Agent permission that HookMyApp's Instagram integration does not currently include, so within HookMyApp treat the 24-hour window as the limit.
