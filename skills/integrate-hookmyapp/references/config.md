---
name: config
description: Manage persistent CLI configuration (e.g. default --env). Distinct from per-invocation flag overrides.
---

# Config

Manage **persistent** CLI configuration. Values written by `config set` live in the CLI's config file (implementation detail — don't script against the path) and affect every subsequent `hookmyapp` invocation in every shell until `config unset`. This is distinct from the per-invocation `--env`/`--workspace` overrides.

## config show

Print the active environment profile and resolved URLs.

**Flags:** none per-command. Global `--json` is accepted.

**Arguments:** none

**Browser step required:** No

**Examples:**

```bash
hookmyapp config show
hookmyapp config show --json
```

Observed output (human form):

```
env:               production
source:            default          # or "config" if set via `config set env`
apiUrl:            https://api.hookmyapp.com
appUrl:            https://app.hookmyapp.com
workosClientId:    client_01KM5S4D10TKG4VJEXSCRVAMG7
```

`source: default` means no persistent override is set; the CLI uses its built-in default (`production`). `source: config` means `config set env` has been run.

## config set

Persist a config value.

**Flags:** none per-command.

**Arguments:**
- `<key>` — the config key (see "Known keys" below).
- `<value>` — the new value.

**Browser step required:** No

**Examples:**

```bash
hookmyapp config set env production
hookmyapp config set env staging
hookmyapp config set env local
```

### Known keys

| Key | Allowed values | Effect |
|---|---|---|
| `env` | `local`, `staging`, `production` | Default environment profile for all future invocations (until `config unset env`). Overridable per-call via the global `--env <name>` flag. |

> **Safety:** `config set env staging` affects every shell the user has open, and every future shell they open, until explicitly unset. This is a **persistent** change, not a session-scoped one. If the user only wants to target staging for one command, use `hookmyapp --env staging <command>` instead. Surface this explicitly before running `config set`.

## config get

Print the active value for a single config key. Always returns the effective value (persisted value if one was written by `config set`, otherwise the CLI's built-in default) — never errors on unset.

**Flags:** none per-command. Global `--json` is accepted.

**Arguments:** `<key>` — the config key.

**Browser step required:** No

**Examples:**

```bash
hookmyapp config get env
# → production (default — no value persisted)

hookmyapp config set env staging
hookmyapp config get env
# → staging

hookmyapp config get env --json
# → {"key":"env","value":"staging","active":"staging","default":"production"}
```

Exits `0` whether the key was persisted or not. Use `--json` and read `value` (null when unset) vs `active` (effective value including default) to distinguish.

## config unset

Remove a persistent config value; the CLI reverts to its built-in default for that key.

**Flags:** none per-command. Global `--json` is accepted.

**Arguments:** `<key>` — the config key.

**Browser step required:** No

**Examples:**

```bash
hookmyapp config unset env
hookmyapp config unset env --json
```

## Common workflows

**Working primarily in staging:**

```bash
hookmyapp config set env staging
# every subsequent hookmyapp call uses staging until unset
hookmyapp config unset env       # when done
```

**One-off staging call while persistent default is production:**

```bash
hookmyapp --env staging channels list
```

## See also

- SKILL.md "Global Options" — the per-invocation `--env` flag.
- [references/auth.md](auth.md) — `hookmyapp login` inherits `config get env` as the login target environment when `--env` is not passed.
