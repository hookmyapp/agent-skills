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

**Flags:**

| Flag | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `--json` | boolean | no | `false` | JSON output. |

**Arguments:** `<id>` — workspace ID (from `workspace list`).

**Browser step required:** No

**Examples:**

```bash
hookmyapp workspace use ws_01J7Q3YB3E5R6A7M8N9P0QRSTU
```

> **Safety:** Before `workspace use`, confirm the target ID with the human. Running commands against the wrong workspace can target the wrong WABA.

**Exit codes:** `0` success · `1` not a member of that workspace · `2` workspace does not exist.

## workspace new

Create a new workspace and switch into it.

**Flags:**

| Flag | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `--json` | boolean | no | `false` | JSON output. |

**Arguments:** `<name>` — human-readable workspace name.

**Browser step required:** No

**Examples:**

```bash
hookmyapp workspace new "Acme Production"
```

**Exit codes:** `0` success · `1` name already exists for this user · `2` billing / plan restriction.
