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
| `--phone` | E.164 string | no | — | Skip sandbox session picker; use this phone. |
| `--wizard` | boolean | no | `true` | Run the post-login wizard. Default after browser sign-in. |
| `--next` | `sandbox\|channels\|exit` | no | — | Non-interactive next-action for scripts/CI. |
| `--env` | `local\|staging\|production` | no | `config get env` or `production` | Target environment. Use `staging` for pre-release testing. |
| `--json` | boolean | no | `false` | Emit JSON instead of the interactive wizard (machine-readable). |
| `--debug` | boolean | no | `false` | Full HTTP request/response + stack traces. |

**Arguments:** none

**Browser step required:** Yes (except when `--code` is used)

> **HUMAN ACTION REQUIRED:** `hookmyapp login` opens your default browser to the HookMyApp sign-in page. Complete sign-in there; the CLI polls for the callback and then stores a session token locally. Agents cannot complete this step — hand the terminal back to the human.

**Examples:**

```bash
# Production login (default)
hookmyapp login

# Staging (pre-release testing)
hookmyapp login --env staging
```

### Zero-browser flow (AI-paste / CI)

For AI coding agents or headless CI where a browser tab is unwelcome, a human can mint a bootstrap code from the HookMyApp dashboard (Settings → CLI → "Mint bootstrap code") and paste it into `--code`:

```bash
hookmyapp login --code hma_boot_xxx
```

The code is single-use and short-TTL. Exits non-zero (silently) if the code is expired or consumed — prompt the human to mint a fresh one.

> **HUMAN ACTION REQUIRED:** Paste a freshly-minted bootstrap code after `--code`. The agent cannot mint its own; the human must copy from the dashboard.

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
