---
name: billing
description: Show subscription status, open the app Billing page, or upgrade the plan.
---

# Billing

Show subscription status, open the Billing page in the HookMyApp app, or upgrade the plan.

Billing is **organization-scoped**: one subscription and one pooled action allowance cover every workspace and customer in your organization. The CLI resolves your organization automatically from the active workspace, so the global `--workspace <slug>` flag only affects which workspace's usage counters `billing status` reads.

## Plans

| Plan | Price | Actions | Channels | Team |
|---|---|---|---|---|
| Trial | Free, 7 days | 100,000 for the 7-day trial | Unlimited | 1 user |
| Build | $1/mo ($10/yr) | 200/mo | Unlimited | Included |
| Scale | $24/mo ($240/yr) | 15,000/mo | Unlimited | Included |
| Business | $97/mo ($970/yr) | 100,000/mo | Unlimited | Included |
| Above Business | Talk to us | Custom | n/a | n/a |

The trial starts at signup, needs no card, and runs 7 days on Business with a 100,000-action cap. At day 7 the trial-window action count picks the plan, in disjoint bands: under 200 rolls the organization into Build, 200 to 14,999 into Scale, and 15,000 or more into Business. Add a credit card before day 7 and the organization rolls into its plan automatically with no pause. No card by day 7 pauses every channel until a plan is chosen.

**What counts as an action:** sending a message, replying to a comment, hiding or unhiding a comment, publishing a post, reel, or story. Free: everything you receive, reads and insights, deleting a comment, a failed send, and uploads or drafts before publishing.

## billing status

Show the organization's subscription (plan, status, billing interval, renewal date) plus the active workspace's usage. Usage reads in actions on a Build, Scale, or Business plan, and in messages on an older message-metered plan.

**Flags:** none per-command. Global `--json` and `--workspace` are accepted.

**Arguments:** none

**Browser step required:** No

**Examples:**

```bash
hookmyapp billing status
hookmyapp billing status --json           # machine-readable
hookmyapp billing status --workspace acme-corp
```

Output shape (human form): plan name, subscription status, billing interval, renewal date, and actions used vs limit with a percentage. A trialing organization reports its actions used against the 100,000-action trial cap. The CLI warns at 80% usage and errors at 100% with a pointer to `billing upgrade`.

Plans: `trial` (free, 7 days on Business, 100,000 actions), `build` (200 actions/mo), `scale` (15,000 actions/mo), `business` (100,000 actions/mo). See Plans above for what counts as an action.

Use `--json` for CI/monitoring (e.g., "alert when usage > 80%"). Do NOT parse the human form, it is not a stable contract.

## billing manage

Open your organization's Billing page in the HookMyApp app: plan, payment method, invoices.

**Flags:** none per-command.

**Arguments:** none

**Browser step required:** Yes

**Examples:**

```bash
hookmyapp billing manage
```

> **HUMAN ACTION REQUIRED:** A browser tab opens to the app's Billing page (`https://app.hookmyapp.com/org/<org-id>/billing`). Hand the terminal back; the human completes any changes there.

## billing upgrade

Change the organization's plan. Free organizations get a terminal-interactive plan picker that ends in a Stripe Checkout browser tab. Organizations that already pay change plan entirely in the terminal: the CLI states what is charged today and when the next bill lands, then asks for confirmation. A Custom plan, a pending cancellation, or an already-scheduled plan change still opens the app Billing page.

**Flags:** none per-command. `--json` is rejected; the command is interactive end-to-end.

**Arguments:** none

**Browser step required:** Only for free organizations (Stripe Checkout), and for the three Billing-page cases above.

**Examples:**

```bash
hookmyapp billing upgrade
```

> **HUMAN ACTION REQUIRED:** Requires an interactive terminal (the CLI refuses to run without a TTY). The free-org path prompts for a plan (`build`/`scale`/`business`) and billing interval (annual/monthly), then opens Stripe Checkout in the browser. A paying organization is prompted to pick a plan and confirm the charge in the terminal. Either way, hand the terminal back; do not answer a billing confirmation on the human's behalf, and do not attempt to drive the browser flow programmatically.

## Billing eligibility (REST)

`GET /organizations/{orgId}/billing/eligibility` (`hmok_` org API key, see [references/api.md](api.md#authentication)) reports where an organization stands without opening a browser: `eligiblePlan` (`build`, `scale`, or `business`, computed from the trial-window action count), `trialActions` (actions used so far in the trial window), and `trialStatus` (`not_started` / `active` / `expired`). Use it to tell the human where they stand before they run `billing upgrade`. Never use it to gate a send or decide whether to retry one.

## Paused-organization errors

A gateway call against a paused organization returns one of two stable codes, never an internal reason string:

- `TRIAL_ENDED`: "Your trial ended. Pick a plan to resume: `<billing url>`"
- `PLAN_ENDED`: "Your previous plan ended. Choose a plan to resume: `<billing url>`"

Both mean every channel in the organization is paused; nothing sends until a plan is chosen. On either code: surface the billing URL to the human and stop. Never retry the call and never treat it as a transient failure. A paused organization stays paused until the human acts in the app.

## Safety notes

- `billing upgrade` on a free organization ends in a Stripe-hosted Checkout page. Do not share Checkout URLs in chat or logs.
- `billing upgrade` on a paying organization asks the human to confirm a charge in the terminal. That confirmation is the human's to give.
- `billing status --json` is the safe form to pipe into CI/monitoring. Do NOT parse the human form.
- `TRIAL_ENDED` / `PLAN_ENDED` mean the organization is paused, not a transient error. Surface the billing URL and stop; do not retry through it.

## See also

- SKILL.md "Command Reference": top-level billing group entry.
- [references/workspace.md](workspace.md): `--workspace` only changes which workspace's usage counters appear; the subscription itself is organization-wide.
