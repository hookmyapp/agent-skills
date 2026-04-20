---
name: workspace
description: List, select, and create HookMyApp workspaces (tenancy scope for all other commands).
---

# Workspaces

A workspace is the top-level tenancy unit — every WABA, sandbox session, and token lives inside exactly one workspace. All subsequent commands implicitly target your active workspace unless overridden with `--workspace <id>`.

## workspace list

Print the workspaces the current user belongs to.

**Flags:**

| Flag | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `--json` | boolean | no | `false` | Emit JSON rows `{id, name, role, active}` for scripting. |

**Arguments:** none

**Browser step required:** No

**Examples:**

```bash
hookmyapp workspace list
hookmyapp workspace list --json | jq '.[] | select(.active)'
```

**Exit codes:** `0` success · `1` not authenticated (run `hookmyapp login`).

## workspace use

Switch the active workspace.

**Flags:** none per-command. Global `--json` is accepted.

**Arguments:** `[name-or-id]` — workspace **name, slug, OR publicId** (`ws_XXXXXXXX`). **Optional**: omit the positional to get an interactive picker.

**Browser step required:** No

**Examples:**

```bash
hookmyapp workspace use acme-corp            # by slug
hookmyapp workspace use ws_abc12345          # by publicId
hookmyapp workspace use                       # interactive picker
```

> **Safety:** Before `workspace use`, confirm the target with the human. Running commands against the wrong workspace can target the wrong WABA.
>
> **Disambiguation:** When a name is passed as a positional it must be an exact match or the CLI errors. If the user has multiple workspaces with similar names, prefer slug or `ws_XXXXXXXX` to avoid ambiguity.

**Exit codes:** `0` success · `1` not a member of that workspace · `2` workspace does not exist.

## workspace new

Create a new workspace and switch into it.

**Flags:** none per-command. Global `--json` is accepted.

**Arguments:** `<name>` — human-readable workspace name.

**Browser step required:** No

**Examples:**

```bash
hookmyapp workspace new "Acme Production"
hookmyapp workspace new "Personal"
```

**Exit codes:** `0` success · `1` name already exists for this user · `2` billing / plan restriction.

## workspace current

Show the active workspace's details.

**Flags:** none per-command. Global `--json` is accepted.

**Arguments:** none

**Browser step required:** No

**Examples:**

```bash
hookmyapp workspace current
hookmyapp workspace current --json
```

Agents should call this after `login` to confirm which workspace is active before running any destructive command.

## workspace rename

Rename the currently active workspace. Mutates in place.

**Flags:** none per-command.

**Arguments:** `<new-name>` — the new human-readable name.

**Browser step required:** No

**Examples:**

```bash
hookmyapp workspace rename "New Name"
hookmyapp workspace rename "Acme Inc."
```

## workspace members list

List members of the active workspace plus any pending invites.

**Flags:** none per-command. Global `--json` is accepted.

**Examples:**

```bash
hookmyapp workspace members list
hookmyapp workspace members list --json
```

## workspace members invite

Invite an email address to the active workspace.

**Flags:**

| Flag | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `--role` | `admin\|member` | no | `member` | Role for the invitee. |

**Arguments:** `<email>` — the invitee's email.

**Examples:**

```bash
hookmyapp workspace members invite teammate@acme.com
hookmyapp workspace members invite teammate@acme.com --role admin
```

## workspace members remove

Remove a member from the active workspace. Destructive.

**Flags:**

| Flag | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `-y, --yes` | boolean | no | `false` | Skip confirmation prompt. Pass this in scripted/CI runs or the command will hang on the confirm. |

**Arguments:** `<email>` — the member's email.

**Examples:**

```bash
hookmyapp workspace members remove teammate@acme.com            # interactive confirm
hookmyapp workspace members remove teammate@acme.com --yes      # scripted
```

## workspace members role

Update a member's role.

**Flags:**

| Flag | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `--role` | `admin\|member` | yes | — | New role. |

**Arguments:** `<email>` — the member's email.

**Examples:**

```bash
hookmyapp workspace members role teammate@acme.com --role admin
hookmyapp workspace members role teammate@acme.com --role member
```

## workspace invites cancel

Cancel a pending invite.

**Flags:**

| Flag | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `-y, --yes` | boolean | no | `false` | Skip confirmation prompt. |

**Arguments:** `<id-or-email>` — the invite ID or the invited email.

**Examples:**

```bash
hookmyapp workspace invites cancel teammate@acme.com
hookmyapp workspace invites cancel 3f4b1c4e-... --yes
```
