---
name: health
description: "Check channel health (Meta connection, forwarding, quality rating, webhook failures) via `channels health`."
---

# Health

`hookmyapp channels health <channel>` surfaces the pieces that routinely break WhatsApp integrations: a lost Meta connection, forwarding turned off, a flagged quality rating, or a failing webhook endpoint. Run it first when triaging "my webhooks stopped arriving." Instagram channels report the same shape with the Instagram identity fields populated instead.

## channels health

Print channel health status.

**Flags:**

| Flag | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `--workspace` | string | no | active | Target workspace. |
| `--json` | boolean | no | `false` | JSON output (see schema below). |

**Arguments:** `<channel>` — a `ch_xxxxxxxx` publicId, `+<E164phone>`, or `@<handle>`. Example: `ch_AAAAAAAA`.

**Browser step required:** No

**JSON schema (`--json`):**

```json
{
  "metaConnected": true,
  "forwardingEnabled": true,
  "connectionType": "cloud_api",
  "whatsappWabaName": "Acme Corp",
  "whatsappVerifiedName": "Acme Corp",
  "whatsappQualityRating": "GREEN",
  "consecutiveForwardFailures": 0,
  "tokenExpiresAt": null
}
```

Fields are omitted when absent for the channel type (Instagram channels populate `instagramUsername` / `instagramProfileName` instead of the WhatsApp fields). A channel that is no longer connected at Meta returns `{"status": "not_connected", "detail": "Channel is no longer connected at Meta."}`.

**What to read:** `metaConnected: false` — the channel lost its Meta connection (re-run `channels connect`). `forwardingEnabled: false` — inbound events are dropped (run `channels enable`). `whatsappQualityRating` — `GREEN`/`YELLOW`/`RED` from Meta. `consecutiveForwardFailures` — how many times in a row your webhook endpoint failed to accept delivery.

**Examples:**

```bash
hookmyapp channels health ch_AAAAAAAA

# Gate a CI deploy on channel health
h=$(hookmyapp channels health ch_AAAAAAAA --json)
test "$(echo "$h" | jq -r .metaConnected)" = "true" \
  && test "$(echo "$h" | jq -r .forwardingEnabled)" = "true" \
  || { echo "Channel not healthy -- aborting deploy"; exit 1; }
```

**Exit codes:** `0` the health read succeeded (regardless of what it reports) · `1` channel not found. The exit code does not encode health status — gate on the JSON fields, not the exit code.

> **Caveat:** For CI gates, parse `--json` and test the fields that exist -- `metaConnected` and `forwardingEnabled` (as in the example above). There is no `status` field on a healthy response, and the exit code carries no health information beyond success/failure of the read itself (SKILL.md § Exit codes).
