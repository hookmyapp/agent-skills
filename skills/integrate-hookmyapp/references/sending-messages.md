---
name: sending-messages
description: Send WhatsApp or Instagram messages from your app against Meta Graph API. Works identically for sandbox and production; only env values and (for Instagram) the body shape change.
---

# Sending Messages

Once your env is populated (either `sandbox env --write` or `channels env <channel>`), sending a WhatsApp message is a single HTTP POST to `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages` with a Bearer token. Sandbox traffic goes through `sandbox-proxy` (which rewrites the URL base at `WHATSAPP_API_URL`); production traffic hits Meta directly. Your app code does not change between the two. Instagram uses a different endpoint base and body shape; see the Instagram section below.

## JavaScript / TypeScript (`fetch`)

```js
// sendMessage.js
const API_URL = process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v22.0';
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

/**
 * Send a plain text WhatsApp message.
 * @param {string} to E.164 recipient (e.g. '+15551234567'). Sandbox ignores this — recipient is pinned to session phone server-side.
 * @param {string} text Message body.
 */
export async function sendMessage(to, text) {
  const res = await fetch(`${API_URL}/${PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
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

## Template messages (PRODUCTION ONLY)

Template messages are pre-approved marketing / notification messages. They require a `template` type body and are **rejected by sandbox-proxy** (`proxy.controller.ts:67-76`) — use them only against a production WABA.

```js
// sendTemplate.js (production only)
export async function sendTemplate(to, templateName, languageCode = 'en_US') {
  const res = await fetch(`${API_URL}/${PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
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

API_URL = os.environ.get("WHATSAPP_API_URL", "https://graph.facebook.com/v22.0")
PHONE_NUMBER_ID = os.environ["WHATSAPP_PHONE_NUMBER_ID"]
ACCESS_TOKEN = os.environ["WHATSAPP_ACCESS_TOKEN"]

def send_message(to: str, text: str) -> dict:
    resp = httpx.post(
        f"{API_URL}/{PHONE_NUMBER_ID}/messages",
        headers={"Authorization": f"Bearer {ACCESS_TOKEN}"},
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

Instagram outbound is a POST to the Instagram Graph API base (`INSTAGRAM_GRAPH_API_URL` for a real channel, `INSTAGRAM_API_URL` for sandbox) with a different body shape than WhatsApp. The recipient is the sender's IGSID (Instagram-scoped id), captured from the inbound webhook.

```js
// sendInstagram.js
const IG_API_URL = process.env.INSTAGRAM_API_URL || process.env.INSTAGRAM_GRAPH_API_URL;
const IG_ACCOUNT_ID = process.env.INSTAGRAM_ACCOUNT_ID || process.env.INSTAGRAM_USER_ID;
const IG_ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN;

export async function sendInstagram(recipientIgsid, text) {
  const res = await fetch(`${IG_API_URL}/${IG_ACCOUNT_ID}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${IG_ACCESS_TOKEN}`,
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

The env-key fallbacks (`INSTAGRAM_API_URL` then `INSTAGRAM_GRAPH_API_URL`; `INSTAGRAM_ACCOUNT_ID` then `INSTAGRAM_USER_ID`) bridge the sandbox vs real-channel key-name split documented in [env.md](env.md).
