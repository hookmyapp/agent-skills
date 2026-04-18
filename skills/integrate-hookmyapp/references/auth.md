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
| `--env` | `staging\|production` | no | `production` | Target environment. Use `staging` for pre-release testing. |
| `--json` | boolean | no | `false` | Emit JSON instead of the interactive wizard (machine-readable). |
| `--debug` | boolean | no | `false` | Verbose logging for troubleshooting. |

**Arguments:** none

**Browser step required:** Yes

> **HUMAN ACTION REQUIRED:** `hookmyapp login` opens your default browser to the HookMyApp sign-in page. Complete sign-in there; the CLI polls for the callback and then stores a session token locally. Agents cannot complete this step — hand the terminal back to the human.

**Examples:**

```bash
# Production login (default)
hookmyapp login

# Staging (pre-release testing)
hookmyapp login --env staging
```

**Exit codes:** `0` success · `1` browser callback timed out or user cancelled.

## logout

Clear locally-stored credentials.

**Flags:**

| Flag | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `--env` | `staging\|production` | no | `production` | Environment whose session to clear. |

**Arguments:** none

**Browser step required:** No

**Examples:**

```bash
hookmyapp logout
hookmyapp logout --env staging
```

**Exit codes:** `0` success (even if already logged out).
