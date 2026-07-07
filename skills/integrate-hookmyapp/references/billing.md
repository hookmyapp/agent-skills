---
name: billing
description: Show subscription status, open the app Billing page, or upgrade the plan.
---

# Billing

Show subscription status, open the Billing page in the HookMyApp app, or upgrade the plan.

Billing is **organization-scoped**: one subscription and one pooled message allowance cover every workspace and customer in your organization. The CLI resolves your organization automatically from the active workspace, so the global `--workspace <slug>` flag only affects which workspace's usage counters `billing status` reads.

## billing status

Show the organization's subscription (plan, status, billing interval, renewal date) plus the active workspace's message usage.

**Flags:** none per-command. Global `--json` and `--workspace` are accepted.

**Arguments:** none

**Browser step required:** No

**Examples:**

```bash
hookmyapp billing status
hookmyapp billing status --json           # machine-readable
hookmyapp billing status --workspace acme-corp
```

Output shape (human form): plan name, subscription status, billing interval, renewal date, and messages used vs limit with a percentage. The CLI warns at 80% usage and errors at 100% with a pointer to `billing upgrade`.

Plans: `free`, `starter` ("Build", 500 messages), `growth` ("Scale", 1,200 messages), `pro` ("Business", 2,500 messages).

Use `--json` for CI/monitoring (e.g., "alert when usage > 80%"). Do NOT parse the human form — it is not a stable contract.

## billing manage

Open your organization's Billing page in the HookMyApp app — plan, payment method, invoices.

**Flags:** none per-command.

**Arguments:** none

**Browser step required:** Yes

**Examples:**

```bash
hookmyapp billing manage
```

> **HUMAN ACTION REQUIRED:** A browser tab opens to the app's Billing page (`https://app.hookmyapp.com/org/<org-id>/billing`). Hand the terminal back; the human completes any changes there.

## billing upgrade

Upgrade the organization's plan. Free organizations get a terminal-interactive plan picker that ends in a Stripe Checkout browser tab; organizations with an active subscription are sent to the app Billing page to change plan.

**Flags:** none per-command. `--json` is rejected — the command is interactive end-to-end.

**Arguments:** none

**Browser step required:** Yes

**Examples:**

```bash
hookmyapp billing upgrade
```

> **HUMAN ACTION REQUIRED:** Requires an interactive terminal (the CLI refuses to run without a TTY). The free-org path prompts for a plan (`starter`/`growth`/`pro`) and billing interval (annual/monthly), then opens Stripe Checkout in the browser; existing subscribers get the app Billing page instead. Hand the terminal back; do not attempt to drive the browser flow programmatically.

## Safety notes

- `billing upgrade` ends in a Stripe-hosted Checkout page. Do not share Checkout URLs in chat or logs.
- `billing status --json` is the safe form to pipe into CI/monitoring. Do NOT parse the human form.
- If the user hits a plan-limit error on `channels connect`, the fix path is `billing upgrade` — surface that connection.

## See also

- SKILL.md "Command Reference" — top-level billing group entry.
- [references/workspace.md](workspace.md) — `--workspace` only changes which workspace's usage counters appear; the subscription itself is organization-wide.
