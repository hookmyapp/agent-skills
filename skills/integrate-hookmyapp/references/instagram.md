---
name: instagram
description: "Send Instagram DMs and moderate comments. CLI-first recipes with a script + raw-HTTP fallback, for your own connected Instagram channel."
---

# Instagram

Three ways to do everything below, in order of preference:

1. **CLI** (preferred): `hookmyapp instagram …` (alias `ig`). Run any command with `--help` for the full flag list.
2. **Bundled scripts** (no CLI at runtime): `node scripts/ig-*.mjs`. Provision credentials once with `channels env --write .env`; the scripts then auto-load `./.env` (override with `--dotenv <path>` or `HOOKMYAPP_ENV_FILE`) and call the gateway directly.
3. **Raw HTTP** from your app: see [sending-messages.md](sending-messages.md).

All hit the same gateway; the path after `/meta` is verbatim Meta Graph API. These act on **your own connected IG channel** — sandbox sends use `hookmyapp sandbox send` ([sandbox.md](sandbox.md)).

## Rules that aren't in `--help`

- **Channel resolution.** `--channel <ref>` accepts an `@handle` or a `ch_xxxxxxxx` id (no `+phone` — IG channels have no phone), falling back to `HOOKMYAPP_CHANNEL_ID`. Wrong type → `CHANNEL_TYPE_MISMATCH`; none → `NO_CHANNEL`.
- **Body shape is `{recipient,message}`** — not WhatsApp's `messaging_product`/`to` shape. `messages send` accepts builder flags (`--to`, `--text`) or a complete `--body`/`-d` (inline JSON, `@file`, or `-`).
- **You can only DM someone who messaged you first.** The recipient is an IGSID (Instagram-scoped id) captured from the inbound webhook; Meta's 24-hour window applies.

## Recipes

### Send / read a DM

```bash
hookmyapp instagram messages send --channel @acme --to <igsid> --text "thanks!"
hookmyapp instagram messages read --channel @acme --to <igsid>           # mark thread seen
# Script fallback:
node scripts/ig-send-dm.mjs --to <igsid> --text "thanks!"
node scripts/ig-send-dm.mjs --file assets/ig-send-dm.json
node scripts/ig-mark-seen.mjs --to <igsid>
```

### Moderate comments

```bash
hookmyapp instagram comments list --channel @acme --media <ig-media-id>
hookmyapp instagram comments get <comment-id> --channel @acme
hookmyapp instagram comments reply --channel @acme --comment <id> --text "thanks!"          # public reply
hookmyapp instagram comments private-reply --channel @acme --comment <id> --text "DM'd you"  # private DM
hookmyapp instagram comments hide --channel @acme --comment <id>            # add --unhide to reverse
hookmyapp instagram comments delete <comment-id> --channel @acme
```

Script fallback for the two most common:

```bash
node scripts/ig-list-comments.mjs --media <ig-media-id>
node scripts/ig-reply-comment.mjs --comment <id> --text "thanks!"          # add --private for a DM reply
```

Comment and media ids come from the inbound webhook (the `comments` field) or `comments list`. A **public reply** appears under the post; a **private reply** is a one-time DM in response to the comment.

## Scripts

| Script | Does | Env it reads |
|--------|------|--------------|
| `ig-send-dm.mjs` | Send a DM (`--to --text`, or `--file`) | `INSTAGRAM_ACCESS_TOKEN`, `INSTAGRAM_USER_ID`, `INSTAGRAM_GRAPH_API_URL` |
| `ig-mark-seen.mjs` | Mark a DM thread seen (`--to`) | same |
| `ig-list-comments.mjs` | List comments on a media (`--media --limit`) | `INSTAGRAM_ACCESS_TOKEN` |
| `ig-reply-comment.mjs` | Public reply, or `--private` DM (`--comment --text`) | + `INSTAGRAM_USER_ID` for `--private` |

Run any script with `--help`. Scripts auto-load `./.env` (override with `--dotenv <path>`) and print a JSON `{ok,...}` envelope, exit `0` on success, `2` on error.

## Assets

`ig-send-dm.json` — DM body. Copy, set the recipient IGSID, pass via `--body @assets/ig-send-dm.json` (CLI) or `--file assets/ig-send-dm.json` (script).
