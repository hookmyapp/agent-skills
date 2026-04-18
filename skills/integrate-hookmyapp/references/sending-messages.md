---
name: sending-messages
description: Send WhatsApp messages from your app against Meta Graph API v19.0+ (works identically for sandbox and production — only env values change).
---

# Sending Messages

Once your env is populated (either `sandbox env --write` or `env <waba-id>`), sending a message is a single HTTP POST to `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages` with a Bearer token. Sandbox traffic goes through `sandbox-proxy` (which rewrites the URL base at `WHATSAPP_API_URL`); production traffic hits Meta directly. Your app code does not change between the two.

## JavaScript / TypeScript (`fetch`)

```js
// sendMessage.js
const API_URL = process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v19.0';
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

API_URL = os.environ.get("WHATSAPP_API_URL", "https://graph.facebook.com/v19.0")
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
