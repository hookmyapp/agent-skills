---
name: auth
description: Authenticate the HookMyApp CLI against your account and sign out.
---

# Authentication

Log in and out of `@gethookmyapp/cli`. Credentials are stored locally by the CLI; never embed tokens inline in code or commit them to version control.

## login

Authenticate against HookMyApp. Opens a browser tab for sign-in, then auto-selects (or prompts for) your active workspace.

**Flags:**

| Flag | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `--code` | string | no | — | Exchange a dashboard-minted bootstrap code for a session — zero browser interaction. Single-use, short TTL. |
| `--email` | string | no | — | Browser-free login: sends a one-time code (OTP) to this email, mints an org-scoped agent credential on completion. See "Browser-free flow: email OTP" below. |
| `--registration-id` | string | no | — | Second step of the non-interactive `--email` flow: the `registrationId` returned by the first call. Requires `--otp`. |
| `--otp` | string | no | — | The 6-digit code from the email. Only valid together with `--registration-id`. |
| `--phone` | E.164 string | no | — | Skip sandbox session picker; use this phone. |
| `--wizard` | boolean | no | `false` | Explicitly re-run the post-login wizard. (Browser sign-in auto-runs the wizard already; this flag is useful for re-prompting workspace selection without logging out.) |
| `--next` | `sandbox\|channels\|exit` | no | — | Non-interactive next-action for scripts/CI. || `--json` | boolean | no | `false` | Emit JSON instead of the interactive wizard (machine-readable). |
| `--debug` | boolean | no | `false` | Full HTTP request/response + stack traces. |

**Arguments:** none

**Browser step required:** Yes (except when `--code` or `--email` is used)

> **HUMAN ACTION REQUIRED:** `hookmyapp login` opens your default browser to the HookMyApp sign-in page. Complete sign-in there; the CLI polls for the callback and then stores a session token locally. Agents cannot complete this step — hand the terminal back to the human.

**Examples:**

```bash
hookmyapp login
```

### Zero-browser flow (AI-paste / CI)

For AI coding agents or headless CI where a browser tab is unwelcome, a human can mint a bootstrap code from the HookMyApp dashboard (Settings → CLI → "Mint bootstrap code") and paste it into `--code`:

```bash
hookmyapp login --code hma_boot_xxx
```

The code is single-use and short-TTL. Exits non-zero (silently) if the code is expired or consumed — prompt the human to mint a fresh one.

> **HUMAN ACTION REQUIRED:** Paste a freshly-minted bootstrap code after `--code`. The agent cannot mint its own; the human must copy from the dashboard.

### Browser-free flow: email OTP (`login --email`)

The preferred agent login: no browser and no dashboard trip. The CLI sends a one-time code to the human's email; completing it mints an **org-scoped agent credential** the CLI stores and uses as a Bearer token.

Interactive terminal — one command, the CLI prompts for the code:

```bash
hookmyapp login --email you@example.com
```

Non-interactive / `--json` — the OTP arrives out-of-band, so the flow splits into two calls:

```bash
# 1) Initiate: prints { registrationId, expiresAt }; the code lands in the inbox
hookmyapp login --email you@example.com --json

# 2) Complete with the code the human relays
hookmyapp login --email you@example.com --registration-id <id> --otp <code> --json
```

Run the initiation command exactly once and retain its `registrationId`. Any unexpired code sent to the same email during the current 10-minute login window can complete that login. If completion fails, preserve the registration ID, stop, and report the exact error. Do not initiate again or request another code unless all existing codes are expired or locked and the human explicitly approves another email.

> **HUMAN ACTION REQUIRED:** The one-time code goes to the human's email inbox. The agent cannot read it — ask the human to paste the 6-digit code.

The minted credential is scoped to one organization and appears in `hookmyapp credentials list`. Revoking it (or `logout`) ends the session.

### CI / scripts (non-interactive next-action)

For scripted runs that want the post-login wizard behavior without interactive prompts:

```bash
hookmyapp login --next sandbox --phone +15551234567
```

`--next sandbox` auto-chains into `sandbox listen` after login; `--next channels` into a `channels` prompt; `--next exit` returns to the shell with no further steps.

**Exit codes:** `0` success · `1` browser callback timed out or user cancelled / bootstrap code expired or consumed.

## logout

Clear locally-stored credentials.

**Flags:** none per-command. Global `--json` is accepted for machine-readable output.

**Arguments:** none

**Browser step required:** No

**Examples:**

```bash
hookmyapp logout
hookmyapp logout --json
```

**Exit codes:** `0` success (even if already logged out).

## credentials

Manage the agent credentials minted by `login --email` (org-scoped Bearer tokens).

```bash
hookmyapp credentials list                    # one row per credential: publicId + scopes
hookmyapp credentials revoke ac_ab12cd34 -y   # revoke; -y skips the confirm prompt
```

- `credentials list` — lists your agent credentials in the active org. Empty state points to `login --email`. Global `--json` returns the raw array.
- `credentials revoke <publicId>` — revokes a credential (confirm prompt unless `-y/--yes` or `--json`). If you revoke the credential the CLI is currently authenticated with, the CLI also clears it from disk so the next command prompts a fresh login.

**Browser step required:** No

**Exit codes:** `0` success · non-zero on unknown credential or network error.
