---
name: billing
description: Show subscription status, open the Stripe Customer Portal, or upgrade the plan.
---

# Billing

Show subscription status, open the Stripe Customer Portal, or upgrade the plan.

All `billing` subcommands are workspace-scoped via the global `--workspace <slug>` flag (name, slug, or `ws_XXXXXXXX`). None of them accept per-command flags beyond `-h/--help`.

## billing status

Show the active workspace's subscription tier, usage counters, and renewal date.

**Flags:** none per-command. Global `--json` and `--workspace` are accepted.

**Arguments:** none

**Browser step required:** No

**Examples:**

```bash
hookmyapp billing status
hookmyapp billing status --json           # machine-readable
hookmyapp billing status --workspace acme-corp
```

Output shape (human form): tier (`free` | `starter` | `pro` | `enterprise`), WABA count vs limit, message count vs limit, next invoice date.

Use `--json` for CI/monitoring (e.g., "alert when free-tier usage > 80%"). Do NOT parse the human form — it is not a stable contract.

## billing manage

Open the Stripe Customer Portal in a browser tab — payment methods, invoices, tax IDs, plan changes for existing subscribers.

**Flags:** none per-command. Global `--workspace` is accepted.

**Arguments:** none

**Browser step required:** Yes

**Examples:**

```bash
hookmyapp billing manage
hookmyapp billing manage --workspace acme-corp
```

> **HUMAN ACTION REQUIRED:** Browser tab opens to `billing.stripe.com/session/<session-id>`. The session is short-lived; if idle too long, re-run to mint a new link.

Free-tier workspaces have no Stripe customer yet — `billing manage` on a free workspace errors with a hint to run `billing upgrade` first.

## billing upgrade

Interactive plan picker for free-tier workspaces; opens the Stripe Customer Portal for existing subscribers to change plan.

**Flags:** none per-command. Global `--workspace` is accepted.

**Arguments:** none

**Browser step required:** Mixed (see below)

**Examples:**

```bash
hookmyapp billing upgrade
hookmyapp billing upgrade --workspace acme-corp
```

> **HUMAN ACTION REQUIRED:** Either a terminal-interactive picker (free-tier first upgrade — CLI prompts for plan + emits a Stripe Checkout URL) or a browser tab to the Customer Portal (existing subscribers). Hand the terminal back; do not attempt to drive the browser flow programmatically.

## Safety notes

- `billing manage` and `billing upgrade` both open external (Stripe-hosted) browser tabs. Do not share the Session URLs in chat or logs — they grant temporary billing access.
- `billing status --json` is the safe form to pipe into CI/monitoring. Do NOT parse the human form.
- If the user hits a "plan WABA limit" error on `channels connect` (observed exit `3`), the fix path is `billing upgrade` — surface that connection.

## See also

- SKILL.md "Command Reference" — top-level billing group entry.
- [references/workspace.md](workspace.md) — pick the right workspace BEFORE running any `billing` subcommand; `--workspace` override applies per-call.
