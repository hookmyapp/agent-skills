---
name: channels
description: Connect and list WhatsApp Business Accounts (WABAs) via Meta embedded signup.
---

# Channels

A "channel" is a WABA (WhatsApp Business Account) attached to your workspace. Connecting a channel runs the Meta embedded-signup flow, which provisions the WABA inside Meta's systems and hands HookMyApp the system-user access token.

> **Note:** This command was previously named `accounts` (in CLI versions before 0.6.1). If you find older docs referencing `accounts connect` / `accounts list`, the current name is `channels`.

## channels connect

Run Meta embedded signup. Produces a new WABA attached to the current workspace.

**Flags:**

| Flag | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `--workspace` | string | no | active | Target workspace ID (overrides active). |
| `--env` | `staging\|production` | no | `production` | Environment. |
| `--json` | boolean | no | `false` | JSON output of the final WABA record. |

**Arguments:** none

**Browser step required:** Yes

> **HUMAN ACTION REQUIRED:** `channels connect` opens a Meta-hosted popup window. The human must sign in to Facebook Business, select or create a WABA, select a phone number, and grant HookMyApp's app access. The popup may be blocked by pop-up blockers — if so the CLI prints the URL for the human to open manually.

**Examples:**

```bash
hookmyapp channels connect
hookmyapp channels connect --workspace ws_01J7Q3YB3E5R6A7M8N9P0QRSTU
```

**Exit codes:** `0` success · `1` popup blocked / closed before completion · `2` Meta returned an error (see CLI output) · `3` workspace has reached plan WABA limit.

## channels list

Print the WABAs connected to the current workspace.

**Flags:**

| Flag | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `--workspace` | string | no | active | Target workspace ID. |
| `--json` | boolean | no | `false` | JSON rows `{waba_id, business_name, phone_numbers[], status}`. |

**Arguments:** none

**Browser step required:** No

**Examples:**

```bash
hookmyapp channels list
hookmyapp channels list --json | jq '.[] | .waba_id'
# → "1276334778010256"
```

**Exit codes:** `0` success · `1` not authenticated · `2` workspace has zero channels (empty table is exit 0, but `--json` prints `[]`).
