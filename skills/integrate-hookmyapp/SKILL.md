---
name: integrate-hookmyapp
description: >
  Set up WhatsApp Business API integration with HookMyApp. Use when the user
  wants to connect WhatsApp, receive webhooks, or integrate WhatsApp Business
  API into their application. Guides through CLI installation, authentication,
  embedded signup, webhook configuration, and credential retrieval.
---

# Integrate HookMyApp

This skill guides you through connecting a WhatsApp Business account using HookMyApp and configuring webhook forwarding to your application. By the end, your app will have API credentials (WABA ID, access token, phone number ID) and be receiving WhatsApp webhook events at your specified URL.

## Prerequisites

- Node.js >= 18
- A HookMyApp account ([hookmyapp.com](https://hookmyapp.com))

## Step 1: Install the CLI

```bash
npm install -g hookmyapp
```

Verify the installation:

```bash
hookmyapp --version
```

## Step 2: Authenticate

```bash
hookmyapp login
```

> **HUMAN ACTION REQUIRED:** This command opens a browser window for authentication. The user must complete the login flow in the browser (sign in or create an account). Wait for the CLI to print "Logged in successfully" before continuing. Do not proceed until the CLI confirms successful login.

## Step 3: Select Workspace

List available workspaces:

```bash
hookmyapp workspace list
```

Select a workspace:

```bash
hookmyapp workspace use <workspace-name-or-id>
```

If the user has no workspace yet, create one:

```bash
hookmyapp workspace new <name>
```

## Step 4: Connect WhatsApp Account

```bash
hookmyapp accounts connect
```

> **HUMAN ACTION REQUIRED:** This command opens Meta's Embedded Signup in the browser. The user must:
> 1. Log in to Facebook
> 2. Select or create a WhatsApp Business Account (WABA)
> 3. Verify a phone number
> 4. Complete the signup flow
>
> The CLI polls for the new account automatically. Wait for the "Account connected" output with the WABA ID and phone number before proceeding. This can take a few minutes.

## Step 5: Verify Account

Confirm the account was connected successfully:

```bash
hookmyapp accounts list
```

You should see the newly connected account with its WABA ID, phone number, and status.

## Step 6: Configure Webhook

Set the webhook URL where WhatsApp messages and events will be forwarded:

```bash
hookmyapp webhook set <waba-id> --url <webhook-url>
```

- Replace `<waba-id>` with the WABA ID from the previous step.
- The URL must be a publicly accessible HTTPS endpoint that returns HTTP 200 OK.
- Optionally set a verify token: `hookmyapp webhook set <waba-id> --url <url> --verify-token <token>`

Need a webhook receiver? Use the starter kit: [hookmyapp/webhook-starter-kit](https://github.com/hookmyapp/webhook-starter-kit)

## Step 7: Get Credentials

Output environment variables for your application:

```bash
hookmyapp env <waba-id>
```

This outputs:

```
WABA_ID=<your-waba-id>
ACCESS_TOKEN=<your-access-token>
PHONE_NUMBER_ID=<your-phone-number-id>
```

Save these to your project's `.env` file. You can also pipe directly:

```bash
hookmyapp env <waba-id> >> .env
```

## Verification

Confirm everything is working:

```bash
hookmyapp accounts list
hookmyapp webhook show <waba-id>
hookmyapp health <waba-id>
```

- `accounts list` should show your account as connected and enabled.
- `webhook show` should display your configured webhook URL.
- `health` should confirm the account is healthy and tokens are valid.

## Webhook Payload Format

HookMyApp forwards Meta's WhatsApp Cloud API webhook payload to your URL as-is via HTTP POST. The JSON body matches the [Meta WhatsApp Cloud API webhook format](https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/components) exactly.

HookMyApp signs every forwarded webhook so your server can verify it genuinely came from HookMyApp and was not tampered with. **Always verify signatures in production** -- without verification, anyone who discovers your webhook URL could send fake payloads to your server.

### Signature header

- **`X-HookMyApp-Signature-256`**: `sha256=<hex-digest>` -- HMAC-SHA256 of the JSON request body, using your verify token as the secret key.

### Verification logic

Compute the same HMAC on your side and compare. Reject the request if they don't match.

```javascript
import crypto from 'node:crypto';

function verifySignature(body, signature, verifyToken) {
  const expected = 'sha256=' + crypto
    .createHmac('sha256', verifyToken)
    .update(JSON.stringify(body))
    .digest('hex');
  return signature === expected;
}

// In your route handler:
const sig = req.get('X-HookMyApp-Signature-256');
if (!verifySignature(req.body, sig, process.env.VERIFY_TOKEN)) {
  return res.sendStatus(401); // Not from HookMyApp
}
```

The [webhook-starter-kit](https://github.com/hookmyapp/webhook-starter-kit) includes this verification out of the box.

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Not logged in" | Run `hookmyapp login` to re-authenticate |
| "No active workspace" | Run `hookmyapp workspace list` and `hookmyapp workspace use <name>` |
| "Account not found" | Run `hookmyapp accounts list` to see available WABA IDs |
| Webhook not receiving events | Verify the URL is publicly accessible HTTPS and returns HTTP 200 |
| "Token expired" | Run `hookmyapp token show <waba-id>` to check token status; HookMyApp auto-refreshes tokens |
| Embedded signup timed out | Run `hookmyapp accounts connect` again to restart the signup flow |
