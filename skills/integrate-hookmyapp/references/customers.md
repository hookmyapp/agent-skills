---
name: customers
description: "Manage SaaS customer workspaces and mint onboarding links (`customers`, `customers onboarding-links`) so end-customers connect their own channel with no HookMyApp account."
---

# Customers & Onboarding Links

**This surface is for END-CUSTOMERS' channels only.** If the channel being connected is the user's own team/product number or account, do NOT use customers or onboarding links — use `hookmyapp channels connect` instead. Onboarding links can only target customer workspaces; the backend rejects one pointed at a team workspace. When in doubt, ask the user: "your own team's channel, or a channel your customers will connect?"

HookMyApp's SaaS-management surface is available to every org, no plan gate. A **customer** is an end-customer of your org, represented as a customer workspace — strictly separate from your team workspaces. `workspace` commands never show customers and `customers` commands never show team workspaces; do not mix the two surfaces.

The customer's channel arrives via an **onboarding link**: you mint a persistent `https://app.hookmyapp.com/connect/<token>` URL with a fixed channel type and send it to the end-customer. They open it and complete the selected provider's flow — Meta Embedded Signup for WhatsApp or direct Instagram OAuth for Instagram. **No HookMyApp account is needed on their side.** The connected channel lands in the target customer workspace (or a new customer is created if the link wasn't pinned to one).

Related org-level concepts: the **org default destination** (a webhook URL that newly connected customer channels inherit automatically) and **bulk-apply** (apply that destination to existing channels in one action) are dashboard/MCP surfaces with no CLI verbs; **channel move** (move a channel between workspaces/customers) is `hookmyapp channels move <channel> <target>` — see [channels.md](channels.md).

## customers list

List your customers. Global `--json` applies.

```bash
hookmyapp customers list
hookmyapp customers list --json
```

## customers new

Create an empty customer; connect a channel later via an onboarding link. Does NOT switch the active workspace.

**Flags:**

| Flag | Type | Required | Description |
|------|------|----------|-------------|
| `--external-id <id>` | string | no | Your own identifier for this customer (CRM/system id). |
| `--json` | boolean | no | Machine-readable output. |

**Arguments:** `<name>` — the customer name.

```bash
hookmyapp customers new "Acme Corp"
hookmyapp customers new "Acme Corp" --external-id crm-123
```

The output nudges the natural next step: `customers onboarding-links create --label "Acme Corp" --channel-type whatsapp --customer <ws-id>`.

## customers use / customers current

Switch the active workspace to a customer (omit the argument for an interactive picker), or show the active workspace if it is a customer. Once a customer is active, the regular `channels` verbs (`list`, `env`, `webhook`, `logs`, …) operate on that customer's channels.

```bash
hookmyapp customers use "Acme Corp"
hookmyapp customers use ws_XXXXXXXX
hookmyapp customers current
```

## customers onboarding-links list

List the org's onboarding links (ID, label, channel type, status). Alias: `onboarding-link`. Global `--json` applies.

```bash
hookmyapp customers onboarding-links list
```

## customers onboarding-links create

Mint a connect link to share with an end-customer.

**Flags:**

| Flag | Type | Required | Description |
|------|------|----------|-------------|
| `--label <label>` | string | yes | Label for the link. |
| `--channel-type <type>` | `whatsapp\|instagram` | yes | Channel type the link connects. |
| `--customer <ws-id>` | string | no | Target an existing customer (`ws_XXXXXXXX`) — the connect lands in that customer. |
| `--json` | boolean | no | Machine-readable output. |

**Browser step required:** No for you — the end-customer opens the printed URL and completes WhatsApp Embedded Signup or Instagram OAuth.

Prints the link `id`, the shareable `url`, and the `verifyToken` the connected channel's webhook config will use for the verify-GET handshake (it is NOT the HMAC signing secret, and it never becomes a destination token).

```bash
hookmyapp customers onboarding-links create --label "Acme" --channel-type whatsapp
hookmyapp customers onboarding-links create --label "Acme" --channel-type whatsapp --customer ws_XXXXXXXX
hookmyapp customers onboarding-links create --label "Globex" --channel-type instagram --json
```
