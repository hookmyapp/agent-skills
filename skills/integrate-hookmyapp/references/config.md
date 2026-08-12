---
name: config
description: Manage persistent CLI configuration (telemetry crash-reporting). Distinct from per-invocation flag overrides.
---

# Config

Manage **persistent** CLI configuration. Values written by `config set` live in the CLI's config file (implementation detail — don't script against the path) and affect every subsequent `hookmyapp` invocation in every shell until `config unset`. This is distinct from the per-invocation `--workspace` override.

## config show

Print the active configuration and resolved URLs.

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
  source:          default
apiUrl:            https://api.hookmyapp.com
appUrl:            https://app.hookmyapp.com
workosClientId:    client_01KM5S4D10TKG4VJEXSCRVAMG7
telemetry:         on
  source:          default
```

`workosClientId` is the CLI's public sign-in client identifier — it is not a secret and is the same for every install. Treat the output as diagnostics to read, not values to copy into code.

## config set

Persist a config value.

**Flags:** none per-command.

**Arguments:**
- `<key>` — the config key (see "Known keys" below).
- `<value>` — the new value.

**Browser step required:** No

**Examples:**

```bash
hookmyapp config set telemetry off
hookmyapp config set telemetry on
```

### Known keys

| Key | Allowed values | Effect |
|---|---|---|
| `telemetry` | `on`, `off` | Crash-reporting on/off. Defaults to `on`; `config set telemetry off` opts out persistently. |

> **Safety:** `config set` writes a **persistent** default that affects every shell the user has open, and every future shell they open, until explicitly unset. It is not session-scoped. Surface this explicitly before running `config set`.

## config get

Print the active value for a single config key. Always returns the effective value (persisted value if one was written by `config set`, otherwise the CLI's built-in default) — never errors on unset.

**Flags:** none per-command. Global `--json` is accepted.

**Arguments:** `<key>` — the config key.

**Browser step required:** No

**Examples:**

```bash
hookmyapp config get telemetry
# → on (default; no value persisted)

hookmyapp config set telemetry off
hookmyapp config get telemetry
# → off

hookmyapp config get telemetry --json
# → {"key":"telemetry","value":"off","active":"off","default":"on"}
```

Exits `0` whether the key was persisted or not. Use `--json` and read `value` (null when unset) vs `active` (effective value including default) to distinguish.

## config unset

Remove a persistent config value; the CLI reverts to its built-in default for that key.

**Flags:** none per-command. Global `--json` is accepted.

**Arguments:** `<key>` — the config key.

**Browser step required:** No

**Examples:**

```bash
hookmyapp config unset telemetry
hookmyapp config unset telemetry --json
```

## Common workflows

**Opt out of crash reporting:**

```bash
hookmyapp config set telemetry off
hookmyapp config unset telemetry   # re-enable later (or: config set telemetry on)
```

## See also

- SKILL.md "Global Options" — the per-invocation `--workspace` flag.
