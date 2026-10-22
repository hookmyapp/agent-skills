---
name: whatsapp
description: "Send WhatsApp messages, manage templates and media, edit the business profile, and manage groups. CLI-first recipes with a script + raw-HTTP fallback (groups: CLI, MCP or REST), for your own connected channel."
---

# WhatsApp

Three ways to do everything below except groups, in order of preference (groups have their own options, see [WhatsApp groups](#whatsapp-groups)):

1. **CLI** (preferred when installed): `hookmyapp whatsapp …` (alias `wa`). Run any command with `--help` for the full flag list — don't memorize flags from here.
2. **Bundled scripts** (no CLI at runtime): `node scripts/wa-*.mjs`. Provision credentials once with `channels env --write .env`; the scripts then auto-load `./.env` (override with `--dotenv <path>` or `HOOKMYAPP_ENV_FILE`) and call the gateway directly.
3. **Raw HTTP** from your app: see [sending-messages.md](sending-messages.md).

All three hit the same gateway (`https://gateway.hookmyapp.com/meta/...`); the path after `/meta` is verbatim Meta Graph API. These act on **your own connected channel** — sandbox sends use `hookmyapp sandbox send` ([sandbox.md](sandbox.md)).

## Rules that aren't in `--help`

- **Channel resolution.** Every CLI command takes `--channel <ref>` accepting a `+E164phone`, an `@handle`, or a `ch_xxxxxxxx` id. Omit it and the CLI falls back to the `HOOKMYAPP_CHANNEL_ID` env var that `channels env --write` puts in your `.env` (so a project directory has a default channel). Neither present → `NO_CHANNEL`. The resolved channel must be a WhatsApp channel or you get `CHANNEL_TYPE_MISMATCH`. (The old global `config default-channel` key was removed — `HOOKMYAPP_CHANNEL_ID` replaced it.)
- **Builder flags XOR `--body`.** Commands that send a body accept either builder flags (`--to`, `--text`, profile fields) **or** a complete Meta body via `--body`/`-d` — never both (`BODY_AND_FLAGS`), never neither (`NO_PAYLOAD`). A `--body` value is inline JSON, `@file`, or `-` (stdin), forwarded verbatim — the escape hatch for any message type the flags don't cover.
- **Templates are WABA-scoped** — they belong to the whole business account, not one phone number.
- **Media is never stored** — HookMyApp stores nothing; media ids and bytes live in Meta.

## Recipes

### Send a text message

```bash
# CLI
hookmyapp whatsapp messages send --channel +15551234567 --to +15557654321 --text "hi"
# Script fallback (channel id + token come from .env)
node scripts/wa-send-message.mjs --to +15557654321 --text "hi"
```

For non-text (image, interactive, …) pass a complete body. Start from an asset:

```bash
hookmyapp whatsapp messages send --channel +15551234567 --body @assets/wa-send-interactive-buttons.json
node scripts/wa-send-message.mjs --file assets/wa-send-image.json     # after wa-upload-media gives you a media id
```

### Send a template message

Templates must be created and approved by Meta before they can be sent.

```bash
# 1. Create (draft from the asset, edit name/body/params)
hookmyapp whatsapp templates create --channel +15551234567 --body @assets/wa-template-utility.json
# 2. Watch for approval
hookmyapp whatsapp templates list --channel +15551234567 --status APPROVED
# 3. Send (draft the send-time body from the asset)
hookmyapp whatsapp messages send --channel +15551234567 --body @assets/wa-send-template.json
```

Script fallback: `node scripts/wa-create-template.mjs --file assets/wa-template-utility.json`, then `node scripts/wa-send-template.mjs --file assets/wa-send-template.json`.

**Template rules:** prefer `parameter_format: "NAMED"` with `{{param_name}}`; use `language` (not `language_code`); include `example` values for any variables; at send time include `parameter_name` on each param for NAMED templates.

**If create fails with `Invalid parameter` / subcode `2494160`:** Meta has restricted that account from creating or editing templates — the body is fine. Don't retry variations or reconnect the channel; see [troubleshooting.md](troubleshooting.md).

### Upload media and send it

```bash
hookmyapp whatsapp media upload --channel +15551234567 --file ./photo.jpg      # → returns a media id
# put that id into assets/wa-send-image.json, then:
hookmyapp whatsapp messages send --channel +15551234567 --body @assets/wa-send-image.json
```

Script fallback: `node scripts/wa-upload-media.mjs --file ./photo.jpg --type image/jpeg`.

Download / inspect / delete media: `hookmyapp whatsapp media {get,download,delete} <media-id> --channel <ref>` (`download` needs `--out <path>` or `--out -`).

### Mark an inbound message read

```bash
hookmyapp whatsapp messages read wamid.ABC123 --channel +15551234567
node scripts/wa-mark-read.mjs --message-id wamid.ABC123
```

### View / update the business profile

```bash
hookmyapp whatsapp profile get --channel +15551234567
hookmyapp whatsapp profile update --channel +15551234567 --about "We ship fast"
node scripts/wa-update-profile.mjs --about "We ship fast"
```

`profile update` builder flags: `--about --description --address --email --vertical --website` (repeatable, max 2), or a complete `--body`.

### WhatsApp groups

Groups need a number Meta has approved as an Official Business Account on the Cloud API. Numbers that also run in the WhatsApp Business app, and test numbers, cannot use them. **Check before building anything:**

```bash
hookmyapp channels show +15551234567 --json     # read whatsappGroups
```

Over MCP, `get_channel` returns the same `whatsappGroups: { available, reason }`. If `available` is `false`, tell the user the plain reason and do not build on groups:

| `reason` | Say |
|----------|-----|
| `whatsapp_business_app_number` | This number is also used in the WhatsApp Business app, so groups are not available on it |
| `not_on_cloud_api` | This number is not on the WhatsApp Cloud API, so groups are not available on it |
| `not_official_business_account` | Meta has not approved this number as an Official Business Account yet |
| `unknown` | HookMyApp has not been able to read the approval yet |

Exception: if the user says the number was just approved, one real `hookmyapp whatsapp groups list --channel <ref>` settles it, and `channels show` reflects the result right after. This is a hint, not a gate: Meta decides, so a stale `false` never blocks the call itself.

Groups have no bundled script and no raw-gateway recipe here. Without the CLI, use the MCP tools listed below or the REST routes under `https://api.hookmyapp.com/channels/{ch}/whatsapp/groups` (reference: https://docs.hookmyapp.com/whatsapp/groups/manage).

**Commands.** Every command takes `--channel <ref>` and `--json`.

```bash
hookmyapp whatsapp groups create --channel +15551234567 --subject "Order 1042" --approval required
hookmyapp whatsapp groups list --channel +15551234567                  # --cursor <cursor> for the next page
hookmyapp whatsapp groups get <groupId> --channel +15551234567
hookmyapp whatsapp groups update <groupId> --channel +15551234567 --subject "New name" --description "Order updates"
hookmyapp whatsapp groups photo <groupId> --channel +15551234567 --file ./group.jpg
hookmyapp whatsapp groups invite-link <groupId> --channel +15551234567              # --reset for a new link, --revoke to remove it
hookmyapp whatsapp groups remove <groupId> +15557654321 --channel +15551234567      # 1 to 8 members
hookmyapp whatsapp groups join-requests <groupId> --channel +15551234567            # --approve <id...> or --reject <id...>
hookmyapp whatsapp groups delete <groupId> --channel +15551234567
```

`--approval` is `auto` or `required`. The photo is a JPEG, square, at least 192px, up to 5MB, and is CLI and REST only (no MCP tool). Over MCP the eight tools are `create_whatsapp_group`, `list_whatsapp_groups`, `get_whatsapp_group`, `update_whatsapp_group`, `delete_whatsapp_group`, `whatsapp_group_invite_link` (`action`: `get`, `reset`, `revoke`), `remove_whatsapp_group_participants` and `whatsapp_group_join_requests` (`action`: `list`, `approve`, `reject`); see [mcp.md](mcp.md).

**Rules that bite:**

- A group holds up to 8 participants. You cannot add people directly: they join through the invite link, and with `--approval required` you approve each join request.
- Create, update, photo, remove and delete are asynchronous. They return a `requestId`; the outcome arrives later as a `whatsapp.group.updated` event carrying the same `requestId`.
- Send to a group with the normal send call: `recipient_type: "group"` and `to: <groupId>`. Text, media and templates work. Interactive messages and authentication templates do not.
- Inbound message and status events from a group carry a `groupId`. Group status events carry a `participant` (the member the status is about).

**Recipe: a group per case (ticket, order, booking).** Full walkthrough: https://docs.hookmyapp.com/whatsapp/groups/automated-groups

1. Check `whatsappGroups.available` (above).
2. Subscribe to `whatsapp.group.updated` with an event subscription, or read it from the channel webhook.
3. Create the group (`groups create`), keep the returned `requestId` next to your case id, and wait for the event with `change: "created"` and that `requestId`. It carries `groupId`, `subject` and `inviteLink`. A `change: "create_failed"` with that `requestId` means it failed.
4. Send the invite link to each person 1:1. Inside an open conversation a text message with the link works. Otherwise use Meta's "Group invite upon request" utility template; the docs page has the exact steps.
5. React to `change` values as people arrive and leave: `member_joined` (carries `waId` and `userId`, greet them with a send to `groupId`), `join_requested` (approve or reject), `member_left`, `member_removed`. When the case closes, `groups delete`; the `deleted` event with that `requestId` and `succeeded: true` confirms it.

All `change` values: `created`, `create_failed`, `deleted`, `member_joined`, `member_left`, `member_removed`, `join_requested`, `join_request_revoked`, `settings_updated`, `suspended`, `suspension_cleared`.

## Scripts

| Script | Does | Env it reads |
|--------|------|--------------|
| `wa-send-message.mjs` | Send text or a complete-body message | `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `META_GRAPH_API_URL` |
| `wa-send-template.mjs` | Send a template (`--file`) | same |
| `wa-mark-read.mjs` | Mark a message read (`--message-id`) | same |
| `wa-upload-media.mjs` | Upload media (`--file --type`) → media id | same |
| `wa-list-templates.mjs` | List templates (`--status --category --limit`) | `WHATSAPP_WABA_ID` |
| `wa-create-template.mjs` | Create a template (`--file`) | `WHATSAPP_WABA_ID` |
| `wa-update-profile.mjs` | Update profile (builder flags or `--file`) | `WHATSAPP_PHONE_NUMBER_ID` |

Run any script with `--help` for its exact usage. Scripts auto-load `./.env` (override with `--dotenv <path>`) and print a JSON `{ok,...}` envelope, exit `0` on success, `2` on error.

## Assets

`wa-send-text.json` · `wa-send-image.json` · `wa-send-interactive-buttons.json` · `wa-template-utility.json` (create) · `wa-send-template.json` (send-time). Copy, edit, pass via `--body @assets/<file>` (CLI) or `--file assets/<file>` (script).
