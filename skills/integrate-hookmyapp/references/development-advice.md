---
name: development-advice
description: How to build a HookMyApp integration that can see its own failures, and the health pass to run when one breaks.
---

# Development Advice

Apply this when you are building or changing a HookMyApp integration. It is not general
advice: skip it entirely when the project has no HookMyApp channel in it.

## 1. Log every failed HookMyApp call, to a file the agent can read

`hookmyapp channels logs` records what HookMyApp forwarded to the app's webhook URL and
what the endpoint answered. It does not record the calls the app makes to HookMyApp, so
the app has to record those itself, or a failed send leaves no trace to debug from.

**Already logging somewhere?** Use what is there. Make sure four fields land in the
record: HTTP `status`, the HookMyApp error `code`, the `x-request-id` response header, and
which direction the call went.

**Nothing in place yet?** One function, no dependency:

```js
// logs/hookmyapp.jsonl: one JSON line per HookMyApp call.
import { appendFileSync, mkdirSync } from 'node:fs';

mkdirSync('logs', { recursive: true });

export function logHookMyApp(entry) {
  const line = JSON.stringify({ ts: new Date().toISOString(), ...entry });
  console.log(line);                                    // the host's log stream
  appendFileSync('logs/hookmyapp.jsonl', line + '\n');  // what an agent can read
}
```

Call it on every non-2xx:

```js
const res = await fetch(`${process.env.META_GRAPH_API_URL}/${phoneNumberId}/messages`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});

if (!res.ok) {
  const body = await res.text();
  logHookMyApp({
    dir: 'out',
    status: res.status,
    requestId: res.headers.get('x-request-id'),
    path: `/${phoneNumberId}/messages`,
    body: body.slice(0, 500),
  });
}
```

Write to a file, not only to stdout. An agent working in the project can read a file in the
repo; it cannot read the hosting provider's log stream.

Two notes worth passing to the human:

- The gateway sets `x-request-id` on every response and honors one the caller sends. A
  support ticket that names a request id gets answered in one hop instead of five.
- The file keeps growing. Nothing depends on old entries, so it can be deleted whenever it
  gets large. Add it to `.gitignore`.

## 2. Set the alert phone

`hookmyapp alerts phone set` plus `alerts phone verify`, values from the human. This is how
HookMyApp reaches them when their integration breaks and nobody is watching the logs. See
[references/alerts.md](alerts.md) and Step 2b in
[references/getting-started.md](getting-started.md).

## 3. Never retry a usage-limit rejection

A `429` with code `CHANNEL_USAGE_LIMIT_EXCEEDED` means the organization is over its plan
allowance. Retrying cannot fix it. Waiting cannot fix it inside the current period. Only an
upgrade or a top-up lifts the pause.

Every rejected call already says so. The gateway envelope is
`{ statusCode, code, error, message, requestId }`, and on this rejection `message` reads
"This channel is over its usage limit. Upgrade your plan or add a top-up to resume." Note the shape: `code` is the uppercase machine code at the TOP level, and `error`
is its lowercase string twin, NOT an object. Branch on `code`.

The correct handling: log it, stop that work, and pass `message` through to the human.

```js
if (res.status === 429) {
  const err = JSON.parse(body);
  if (err.code === 'CHANNEL_USAGE_LIMIT_EXCEEDED') {
    // Do not retry. Do not schedule a retry. Surface it.
    logHookMyApp({ dir: 'out', status: 429, code: err.code, requestId: err.requestId, path });
    await notifyOwner(err.message);
    return;
  }
}
```

Note what else breaks: once the channel is over its limit the access token is refused for
**every** call, including read-only GETs. The app looks entirely dead rather than "sending
is paused". Say that plainly when reporting it to the human.

## 4. Keep the webhook route out of the auth middleware

HookMyApp's forwarder is not a logged-in user of the customer's app. If their webhook path
sits behind session auth, an API-key gate, or a WAF rule, HookMyApp gets `401` or `403` and
every inbound message is lost.

```js
// Mount the webhook BEFORE the auth middleware, not after.
app.post('/webhooks/hookmyapp', express.json(), handleWebhook);
app.use(requireAuth);
```

Authenticate the webhook with the HMAC signature instead: verify
`X-HookMyApp-Signature-256` against `WEBHOOK_HMAC_SECRET`. See "Signature verification" in
SKILL.md.

The route should also answer fast. Return `200`, then do the work: a slow handler turns into
`504` on the forwarder side and the message is recorded as undelivered.

## 5. Use the CLI tunnel, not a hand-rolled one

An always-on self-hosted deployment is a legitimate production pattern: a personal server, a
Raspberry Pi, a long-running agent. `hookmyapp channels listen` is built for it. The tunnel
is per-channel, access-controlled, and keeps a stable hostname.

A hand-rolled tunnel is not. Free tunnel services hand out a new random hostname on every
restart, so the URL stored by `webhook set` stops working the moment the tunnel restarts,
with nothing to announce it.

So: `channels listen` for a self-hosted or local destination, a real HTTPS URL for a deployed
backend, and never a hand-rolled tunnel URL in `webhook set`.

## Health pass

Run this when finishing a build or change that touched HookMyApp code, and again whenever
the human reports a HookMyApp symptom: messages not arriving, sends failing, the bot gone
quiet.

Do not run it at session start, on a timer, or in a loop. One pass, report what it found,
done. If the project has no HookMyApp channel in it, there is nothing to check.

```bash
hookmyapp channels health <channel>       # channel state and quality
hookmyapp channels logs list <channel>    # did HookMyApp deliver, and what answered
hookmyapp notifications                   # has HookMyApp already diagnosed this
```

Then read the app's own log from section 1 for the outbound side, which delivery logs do not
cover.

### Reading the result

| What you see | What it means | Next step |
|---|---|---|
| `502` or `504` in delivery logs | Their app is down, cold-starting, too slow, or the tunnel died | Check the destination is up; if it is a tunnel, confirm it is still running |
| `401` or `403` in delivery logs | Their own middleware is rejecting HookMyApp on their own route | Move the webhook route outside the auth middleware (section 4) |
| `404` in delivery logs | The saved webhook URL does not match a route the app serves | Compare `channels webhook show` against the app's actual route |
| Deliveries exist, none ever delivered | The integration has never worked once | Verify the destination URL and that the app was deployed at all |
| `429 CHANNEL_USAGE_LIMIT_EXCEEDED` in their log | Over the plan allowance | Tell the human to upgrade. Do not retry (section 3) |
| Nothing in delivery logs at all | Forwarding is off, or no inbound traffic arrived | `channels show <channel>` for `forwarding: enabled` |

### Symptom to command

| The human says | Look here first |
|---|---|
| "messages stopped arriving" | `hookmyapp channels logs list <channel>` |
| "it never worked" | `hookmyapp channels logs list <channel>`, then `channels webhook show <channel>` |
| "sending is failing" | The app's own log file, then `hookmyapp channels health <channel>` |
| "everything is dead" | `hookmyapp notifications`, then `channels health <channel>` |
| "it worked yesterday" | `hookmyapp channels logs list <channel>` for where the successes stop |

Relay any open notification to the human before acting on it, then acknowledge it. See
[references/notifications.md](notifications.md).
