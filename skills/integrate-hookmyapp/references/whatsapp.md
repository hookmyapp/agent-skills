---
name: whatsapp
description: "Send WhatsApp messages, manage templates and media, and edit the business profile. CLI-first recipes with a script + raw-HTTP fallback, for your own connected channel."
---

# WhatsApp

Three ways to do everything below, in order of preference:

1. **CLI** (preferred when installed): `hookmyapp whatsapp …` (alias `wa`). Run any command with `--help` for the full flag list — don't memorize flags from here.
2. **Bundled scripts** (no CLI at runtime): `node scripts/wa-*.mjs`. Provision credentials once with `channels env --write .env`; the scripts then auto-load `./.env` (override with `--dotenv <path>` or `HOOKMYAPP_ENV_FILE`) and call the gateway directly.
3. **Raw HTTP** from your app: see [sending-messages.md](sending-messages.md).

All three hit the same gateway (`https://gateway.hookmyapp.com/meta/...`); the path after `/meta` is verbatim Meta Graph API. These act on **your own connected channel** — sandbox sends use `hookmyapp sandbox send` ([sandbox.md](sandbox.md)).

## Rules that aren't in `--help`

- **Channel resolution.** Every CLI command takes `--channel <ref>` accepting a `+E164phone`, an `@handle`, or a `ch_xxxxxxxx` id. Omit it and the CLI falls back to the `HOOKMYAPP_CHANNEL_ID` env var that `channels env --write` puts in your `.env` (so a project directory has a default channel). Neither present → `NO_CHANNEL`. The resolved channel must be a WhatsApp channel or you get `CHANNEL_TYPE_MISMATCH`. (The old global `config default-channel` key was removed — `HOOKMYAPP_CHANNEL_ID` replaced it.)
- **Builder flags XOR `--body`.** Commands that send a body accept either builder flags (`--to`, `--text`, profile fields) **or** a complete Meta body via `--body`/`-d` — never both (`BODY_AND_FLAGS`), never neither (`NO_PAYLOAD`). A `--body` value is inline JSON, `@file`, or `-` (stdin), forwarded verbatim — the escape hatch for any message type the flags don't cover.
- **Templates are WABA-scoped** — they belong to the whole business account, not one phone number.
- **Media is passthrough** — HookMyApp stores nothing; media ids and bytes live in Meta.

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
