---
name: channels
description: Connect and list WhatsApp or Instagram channels via Meta embedded signup.
---

# Channels

A "channel" is a WhatsApp Business Account (WABA) or an Instagram account attached to your workspace. Connecting a channel runs the Meta embedded-signup flow, which provisions the account inside Meta's systems and hands HookMyApp the long-lived Meta system-user token. That token stays inside HookMyApp; your app authenticates to the gateway with a minted `hmat_` access token instead (see [access tokens](access-tokens.md)). Instagram channels connect the same way via `channels connect instagram` (Meta OAuth: Instagram login or Instagram-via-Facebook).

> **Direct Meta access still works.** Existing integrations that call `https://graph.facebook.com` with their own Meta token are unaffected by the gateway. Routing through `https://gateway.hookmyapp.com/meta/...` with a minted `hmat_` access token is the recommended path for new setups.

> **Note:** This command was previously named `accounts` (in CLI versions before 0.6.1). If you find older docs referencing `accounts connect` / `accounts list`, the current name is `channels`.

## channels connect

Run Meta embedded signup. Produces a new channel attached to the current workspace.

**Arguments:** `[whatsapp|instagram]` (optional) — channel type to connect. When omitted the CLI prompts interactively. Pass `whatsapp` or `instagram` explicitly to skip the type prompt. There is no default; the CLI always asks if the type is omitted.

**Flags:**

| Flag | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `--workspace` | string | no | active | Target workspace ID (overrides active). |
| `--json` | boolean | no | `false` | JSON output of the final channel record. |

**Browser step required:** Yes

> **HUMAN ACTION REQUIRED:** `channels connect` opens a Meta-hosted popup window. The human must sign in to Facebook Business, select or create a WABA, select a phone number, and grant HookMyApp's app access. The popup may be blocked by pop-up blockers — if so the CLI prints the URL for the human to open manually.

**Examples:**

```bash
hookmyapp channels connect
hookmyapp channels connect whatsapp
hookmyapp channels connect instagram
hookmyapp channels connect --workspace acme-corp
```

**Exit codes:** `0` success · `1` popup blocked / closed before completion · `2` Meta returned an error (see CLI output) · `3` workspace has reached plan channel limit *(observed behavior; not enumerated in `--help`)*.

## channels list

Print the WABAs connected to the current workspace.

**Flags:**

| Flag | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `--workspace` | string | no | active | Target workspace ID. |
| `--json` | boolean | no | `false` | JSON array of channel objects (camelCase): `id`, `type`, `metaWabaId`, `forwardingEnabled`, plus provider-explicit fields like `whatsappDisplayPhoneNumber`, `whatsappWabaName`, `instagramUsername`. |

**Arguments:** none

**Browser step required:** No

**Examples:**

```bash
hookmyapp channels list
hookmyapp channels list --json | jq '.[] | .id'
# → "ch_7xGvkTR8"
```

**Exit codes:** `0` success · `1` not authenticated · `2` workspace has zero channels (empty table is exit 0, but `--json` prints `[]`).

## channels show

Display details for a single WABA.

**Flags:**

| Flag | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `--workspace` | string | no | active | Target workspace (global flag; name, slug, or id). |
| `--json` | boolean | no | `false` | JSON output. |

**Arguments:** `<channel>` — a `ch_xxxxxxxx` publicId, `+<E164phone>`, or `@<handle>`. Example: `ch_AAAAAAAA`.

**Browser step required:** No

**Examples:**

```bash
hookmyapp channels show ch_AAAAAAAA
hookmyapp channels show ch_AAAAAAAA --json
```

Output includes `forwarding: enabled|disabled` — use this to verify state before running `channels disable`/`enable`.

## channels disconnect

Detach a WABA from the workspace. Destructive.

**Flags:** only `-h/--help` per `--help`. Global `--workspace` is accepted.

> **NOTE:** No `--yes` flag exists to skip confirmation — inconsistent with `workspace members remove` which does expose `--yes`. Treat as interactive-confirm. Do not run in non-interactive scripts without a TTY-wrap.

**Arguments:** `<channel>`

**Examples:**

```bash
hookmyapp channels disconnect ch_AAAAAAAA
hookmyapp channels disconnect ch_AAAAAAAA --workspace acme-corp
```

## channels enable

Re-enable forwarding for a previously-disabled channel.

**Flags:** only `-h/--help` per `--help`.

**Arguments:** `<channel>`

**Examples:**

```bash
hookmyapp channels enable ch_AAAAAAAA
```

## channels disable

Disable inbound webhook forwarding for a channel. Outbound sends still work; inbound messages are **silently dropped** by the forwarder until re-enabled.

**Flags:** only `-h/--help` per `--help`. No `--yes` flag.

**Arguments:** `<channel>`

> **Safety:** `channels disable` produces no customer-facing error on inbound messages — they are silently dropped. See SKILL.md "Safety Rules" for why this needs explicit human confirmation before running, and use `channels show <channel>` (or `hookmyapp channels health <channel>`) to verify state before and after.

**Examples:**

```bash
hookmyapp channels disable ch_AAAAAAAA
```

## channels move

Move a channel to another workspace or customer in the same organization.

```bash
hookmyapp channels move ch_AAAAAAAA "Acme Cafe"     # target by name
hookmyapp channels move ch_AAAAAAAA ws_BBBBBBBB     # target by publicId
```

**Arguments:** `<channel>` (`ch_xxxxxxxx`, phone number, or `@<username>`) and `<target>` (workspace/customer `ws_xxxxxxxx` or name). Cross-kind moves (team workspace ↔ customer) are allowed. Global `--json` returns the machine-readable result.

**Browser step required:** No

## Other channel subcommands

`channels` also exposes per-channel `env`, `health`, `token [--rotate]`, `webhook {show,set,clear}`, `logs {list,show}`, and `listen [channel]`; the channel's gateway access token is read and rotated with `channels token` (one active token per channel — there is no separate access-tokens command group). Each has its own reference: [env](env.md), [access tokens](access-tokens.md), [health](health.md), [webhook](webhook.md). `logs` and `listen` are documented inline in [SKILL.md](../SKILL.md).
