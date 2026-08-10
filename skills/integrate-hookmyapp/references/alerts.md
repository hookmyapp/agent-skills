---
name: alerts
description: Set and verify the phone number HookMyApp texts when something stops working.
---

# Alerts

The alert phone is where HookMyApp reaches the human when their integration breaks: a channel disconnecting, webhooks failing, an organization running out of its message allowance.

It is **user-scoped, not workspace-scoped**: the number belongs to the authenticated person, every teammate sets their own, and no command can set it on someone else's behalf. The global `--workspace` flag has no effect here.

A number only starts receiving alerts after it is verified with a 6-digit code HookMyApp sends to it.

## alerts phone status

Show the verified alert phone (masked) and what it is signed up to receive.

**Flags:** none per-command. Global `--json` is accepted.

**Arguments:** none

**Browser step required:** No

**Examples:**

```bash
hookmyapp alerts phone status
hookmyapp alerts phone status --json
```

With no verified number, the human form points at `alerts phone set`. `--json` returns `phone` (masked, `null` when unset), `verified`, `consents` (`operational`, `product`, `marketing`), and `channelPreference`.

**Exit codes:** `0` success · `1` not authenticated (run `hookmyapp login`).

## alerts phone set

Start verification for a phone number. HookMyApp sends a 6-digit code to it; the command then asks for the code and finishes the job.

**Flags:**

| Flag | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `--sms` | boolean | no | `false` | Deliver the code and future alerts by SMS instead of WhatsApp |
| `--product` | boolean | no | `false` | Also receive product news |
| `--marketing` | boolean | no | `false` | Also receive offers |
| `--code <code>` | string | no | none | Skip the prompt and verify with a code already in hand |

**Arguments:** `<phone>`, in international format, e.g. `+14155552671`. A national number (`07700900123`) is rejected before anything is sent.

**Browser step required:** No

**Examples:**

```bash
hookmyapp alerts phone set +14155552671
hookmyapp alerts phone set +14155552671 --sms
hookmyapp alerts phone set +14155552671 --product --marketing
hookmyapp alerts phone set +14155552671 --json    # sends the code, no prompt
```

Alerts about problems are on as soon as the number is verified. Product news and offers stay off unless `--product` / `--marketing` are passed. Never assume them on the human's behalf.

**No prompt without a terminal.** Under `--json`, or in CI / with redirected stdin, the command cannot ask for the code. Use one of:

```bash
hookmyapp alerts phone set +14155552671 --json     # then read the code from the phone
hookmyapp alerts phone verify 123456
```

or pass it in one go with `--code 123456`. Running `set` with no terminal and neither flag is refused up front, so no code is spent on a prompt nobody can answer.

If HookMyApp could not deliver the code, the command says so and stops rather than asking for a code that never arrived. Try again in a moment.

**Exit codes:** `0` success · `1` not authenticated, bad number format, no terminal for the prompt, or too many codes requested for that number.

## alerts phone verify

Finish verification with the code that arrived.

**Flags:** none per-command. Global `--json` is accepted.

**Arguments:** `<code>`, the 6 digits from the message.

**Browser step required:** No

**Examples:**

```bash
hookmyapp alerts phone verify 123456
hookmyapp alerts phone verify 123456 --json
```

**Exit codes:** `0` success · `1` wrong or expired code, or no verification in progress (start again with `alerts phone set`).

## Notes for agents

- Never invent a phone number. Ask the human for theirs, or leave the alert phone unset.
- The code is delivered to the human's phone, not to the terminal, and there is no way to read it from the CLI. Ask them for it.
- Sending codes to one number is capped. Do not loop on `set` to retry; if delivery failed, wait and try once more.
