---
name: instagram
description: "Send Instagram DMs, publish posts/reels/stories, read insights, and moderate comments. CLI-first recipes with a script + raw-HTTP fallback, for your own connected Instagram channel."
---

# Instagram

Three ways to do everything below, in order of preference:

1. **CLI** (preferred): `hookmyapp instagram …` (alias `ig`). Run any command with `--help` for the full flag list.
2. **Bundled scripts** (no CLI at runtime): `node scripts/ig-*.mjs`. Provision credentials once with `channels env --write .env`; the scripts then auto-load `./.env` (override with `--dotenv <path>` or `HOOKMYAPP_ENV_FILE`) and call the gateway directly. DMs and comments only — publish and insights have no bundled script; use the CLI or raw HTTP.
3. **Raw HTTP** from your app: see [sending-messages.md](sending-messages.md) for DMs; publish and insights raw calls are inline below.

All hit the same gateway; the path after `/meta` is verbatim Meta Graph API. These act on **your own connected IG channel** — sandbox sends use `hookmyapp sandbox send` ([sandbox.md](sandbox.md)). The sandbox covers **DMs only**: publish, insights, and comment operations need a real connected channel and fail against sandbox credentials.

## Rules that aren't in `--help`

- **Channel resolution.** `--channel <ref>` accepts an `@handle` or a `ch_xxxxxxxx` id (no `+phone` — IG channels have no phone), falling back to `HOOKMYAPP_CHANNEL_ID`. Wrong type → `CHANNEL_TYPE_MISMATCH`; none → `NO_CHANNEL`.
- **Body shape is `{recipient,message}`** — not WhatsApp's `messaging_product`/`to` shape. `messages send` accepts builder flags (`--to`, `--text`) or a complete `--body`/`-d` (inline JSON, `@file`, or `-`).
- **You can only DM someone who messaged you first.** The recipient is an IGSID (Instagram-scoped id) captured from the inbound webhook; Meta's 24-hour window applies. The one exception is a [private reply to a comment](#private-replies) — that DM is allowed because the user commented, under its own 7-day rule.
- **Instagram Login channels only.** Publish, insights, and comment operations work only on channels connected via **Instagram Login** (direct Instagram OAuth). A channel connected via Facebook Login gets an **unsupported-login-flow** error; connect the account through Instagram OAuth instead. DMs are unaffected.
- **Older channels may need a one-time reconnect.** If a publish, insights, or comment operation returns a **reconnect-required** error, see [Reconnect](#reconnect-channels-connected-before-these-abilities).

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

### Publish a post, reel, story, or carousel

Publishing is Meta's two-step flow, which the CLI wraps: create a media **container**, wait for it to reach `FINISHED`, then publish it. The CLI polls with a spinner and prints the permalink when done.

```bash
hookmyapp instagram publish --image https://example.com/photo.jpg --caption "New drop" --channel @acme
hookmyapp instagram publish --video https://example.com/clip.mp4 --reel --caption "..." --cover https://example.com/cover.jpg
hookmyapp instagram publish --image https://example.com/photo.jpg --story
hookmyapp instagram publish --carousel https://example.com/a.jpg,video:https://example.com/b.mp4 --caption "..."   # video: prefix = video child; plain URL = image
```

Optional flags (CLI >= 0.14.17): `--alt-text <text>` (image posts), `--tag <username[:x,y]>` (repeatable; x,y position the tag on images), `--location <page-id>` (place tagging), `--thumb-offset <ms>` and `--audio-name <name>` (video/reel). The MCP `publish_instagram_media` tool takes the same as `altText`, `userTags`, `locationId`, `thumbOffset`, `audioName`.

Raw HTTP (gateway; the same three Meta calls the CLI makes):

```bash
# 1. Create the container. Media is a PUBLIC https URL — Meta fetches it; there is no byte upload here.
#    Hosts that block Meta's fetcher fail with a MISLEADING "Only photo or video can be
#    accepted as media type" — move the file, don't debug your request. Videos: H.264+AAC MP4;
#    other codecs pass this step and then die in the status poll with ERROR.
curl -X POST "$INSTAGRAM_GRAPH_API_URL/$INSTAGRAM_ACCOUNT_ID/media" \
  -H "Authorization: Bearer $INSTAGRAM_ACCESS_TOKEN" -H "Content-Type: application/json" \
  -d '{"image_url":"https://example.com/photo.jpg","caption":"New drop"}'
# → {"id":"<container-id>"}

# 2. Poll until status_code is FINISHED (~1/min; images usually immediate, videos take time).
curl "$INSTAGRAM_GRAPH_API_URL/<container-id>?fields=status_code" \
  -H "Authorization: Bearer $INSTAGRAM_ACCESS_TOKEN"

# 3. Publish the container.
curl -X POST "$INSTAGRAM_GRAPH_API_URL/$INSTAGRAM_ACCOUNT_ID/media_publish" \
  -H "Authorization: Bearer $INSTAGRAM_ACCESS_TOKEN" -H "Content-Type: application/json" \
  -d '{"creation_id":"<container-id>"}'
```

**Media constraints (Meta's, surfaced as-is):**

| Type | Container params | Limits |
|------|------------------|--------|
| Image post | `image_url` | JPEG only, ≤8MB, aspect ratio 4:5–1.91:1 |
| Reel | `media_type=REELS`, `video_url`, optional `cover_url` | ≤15 min, ≤1GB |
| Story | `media_type=STORIES` + `image_url` or `video_url` | video ≤60s; no stickers/links; **Business accounts only** — Creator accounts get Meta's rejection back as-is |
| Carousel | `media_type=CAROUSEL` + up to 10 child containers created with `is_carousel_item=true` | no reels as children |
| Trial reel | `media_type=REELS` + `trial_params: {"graduation_strategy": "MANUAL"}` | reels only; shown to non-followers first. `MANUAL` = graduate by hand in the app, `SS_PERFORMANCE` = Instagram graduates it if it performs. No API field reads back whether a reel is a trial reel |

**Quota and lifecycle:**

- The rolling 24-hour publish quota is per account — read the live number with `GET /{ig-id}/content_publishing_limit` (Meta's docs are mid-transition from 50 to 100; trust the endpoint, not a hardcoded number).
- Max 400 containers per 24h. Containers **expire after 24h**.
- There is **no scheduled publishing** in the Meta API — a container can't be held for later beyond its 24h life, and HookMyApp does not add a scheduler.
- There is **no publish webhook** — poll `status_code`; the CLI does this for you.
- A container in `ERROR` status returns Meta's error message. If a publish times out, keep the container id from step 1 — you can retry `media_publish` with it manually while it's alive.

### Read insights

```bash
hookmyapp instagram insights --channel @acme                          # account-level, default metrics
hookmyapp instagram insights --metrics reach,views,accounts_engaged   # pick metrics
hookmyapp instagram insights --media <ig-media-id>                    # per-media metrics
hookmyapp instagram insights --json
```

Raw HTTP:

```bash
# Account
curl "$INSTAGRAM_GRAPH_API_URL/$INSTAGRAM_ACCOUNT_ID/insights?metric=reach,views&period=day&metric_type=total_value" \
  -H "Authorization: Bearer $INSTAGRAM_ACCESS_TOKEN"
# Per media
curl "$INSTAGRAM_GRAPH_API_URL/<ig-media-id>/insights?metric=views,reach,saved,shares" \
  -H "Authorization: Bearer $INSTAGRAM_ACCESS_TOKEN"
```

**Account metrics:** `reach`, `views` (replaces the deprecated `impressions`), `likes`, `comments`, `shares`, `saves`, `total_interactions`, `accounts_engaged`, `profile_links_taps`, `follows_and_unfollows`. Breakdowns: `follow_type`, `media_product_type`, `contact_button_type`.

**Media metrics:** `views`, `reach`, `saved`, `shares`, `total_interactions`, `ig_reels_avg_watch_time`, `reels_skip_rate`, `reposts`, `facebook_views`, `crossposted_views`, aggregated `total_likes` / `total_comments` / `total_views` (match the in-app numbers), plus story-only `navigation` and `replies`. Account metrics also include `reposts`.

**Gotchas (all Meta-side, all normal — don't debug your integration for these):**

- Data can lag up to **48 hours**. Story metrics only exist for the story's 24-hour life.
- A metric whose value is below 5 returns Meta **error code 10** — a privacy floor, not a permissions problem.
- "Nothing recorded" comes back as an **empty data array**, not a zero.
- Demographics (`follower_demographics`, `engaged_audience_demographics`) need **≥100 followers** and a `timeframe` param.
- Insights are read-only. Fetch metrics individually (or tolerate partial results) so one unavailable metric doesn't abort the rest.

### List your posts, stories, and profile

Media ids for insights/comments/shares come from the account's media list (raw HTTP through the gateway; no CLI command):

```bash
curl "$INSTAGRAM_GRAPH_API_URL/$INSTAGRAM_ACCOUNT_ID/media?fields=id,caption,media_type,permalink,timestamp,like_count,comments_count" \
  -H "Authorization: Bearer $INSTAGRAM_ACCESS_TOKEN"
# Also: /stories (live 24h), /tags (posts tagging the account),
# and profile fields: ?fields=username,biography,website,profile_picture_url,followers_count,media_count
```

### Messaging extras (raw HTTP, same /messages endpoint)

- **Multiple images**: `message.attachments` array, up to 10 (error subcode 2534068 = account not rolled out yet; send one per message).
- **PDF**: attachment `type: "file"`, `payload.url`, 25 MB max.
- **Heart sticker**: attachment `type: "like_heart"`.
- **Share your own post**: attachment `type: "MEDIA_SHARE"`, `payload.id` = media id.
- **React / unreact**: `sender_action: "react"` + `payload: { message_id, reaction: "<emoji>" }`; `"unreact"` with message_id only removes it.
- **Sender profile**: `GET /<IGSID>?fields=name,username,profile_pic,follower_count,is_user_follow_business` (consent: only after the person messaged you).
- **Thread history**: `GET /me/conversations?platform=instagram&fields=participants,messages{id,created_time,from,message}`.
- **Ice breakers / persistent menu**: `POST /$INSTAGRAM_ACCOUNT_ID/messenger_profile` with `platform: "instagram"` and `ice_breakers` or `persistent_menu`; taps arrive as `messaging_postbacks` webhooks.

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

Rules Meta enforces:

- **Always request `fields` explicitly when reading** (`fields=from,text,timestamp,hidden,like_count,parent_id`) — Meta's default comment response omits `from` and `text`.
- You can't reply to a hidden comment; you can only `delete` comments on your own media.
- Disabling/enabling comments is **per media**, not per comment — no CLI command; raw HTTP:

```bash
curl -X POST "$INSTAGRAM_GRAPH_API_URL/<ig-media-id>?comment_enabled=false" \
  -H "Authorization: Bearer $INSTAGRAM_ACCESS_TOKEN"        # true to re-enable
```

#### Private replies

`comments private-reply` DMs the commenter even though they never DM'd you — it is part of comment moderation, not the messaging window:

- **One DM per comment**, within **7 days** of the comment's creation (post/reel comments), max **750/hour**.
- **Live comments are the exception:** a private reply to a Live comment is allowed **only while the broadcast is live** — after the Live ends it's rejected regardless of the 7-day window (don't explain an ended-Live rejection as the window).
- Outside the window or on a second attempt, Meta rejects it — surface the error, don't retry.
- After the user replies to your DM, the conversation is a normal DM thread under the standard 24-hour window ([sending-messages.md](sending-messages.md)). There is no Human Agent tag to extend it.

## Comment webhooks (both payload shapes)

Connected Instagram channels forward `comments` and `live_comments` webhook events to your destination exactly like messages (same delivery, same `X-HookMyApp-Signature-256`). Comment events are **not billable**.

Meta currently emits **two different envelope shapes** for comments, and your parser must accept both. Shape A nests under `entry[].changes[]`:

```json
{
  "object": "instagram",
  "entry": [
    {
      "id": "17841400000000000",
      "time": 1716300000,
      "changes": [
        {
          "field": "comments",
          "value": {
            "id": "17900000000000001",
            "text": "Love this!",
            "from": { "id": "1234567890", "username": "commenter" },
            "media": { "id": "17850000000000000", "media_product_type": "FEED" },
            "parent_id": "17890000000000000"
          }
        }
      ]
    }
  ]
}
```

Shape B is flat — `field`/`value` directly on the entry (Meta's ordinary-comment example, which also omits `from.id`):

```json
{
  "object": "instagram",
  "entry": [
    {
      "id": "17841400000000000",
      "time": 1716300000,
      "field": "comments",
      "value": {
        "id": "17900000000000001",
        "text": "Love this!",
        "from": { "username": "commenter" },
        "media": { "id": "17850000000000000" }
      }
    }
  ]
}
```

Parsing rules:

- Normalize both shapes: an entry's comment values are `entry.changes[].value` when `changes` exists, else the single `entry.value`.
- Treat `from.id`, `parent_id`, and `media.media_product_type` as **optional**.
- Comments made *by your own account* also arrive (self-comment echo) — filter on `from.username`/`from.id` against your own account if you don't want to react to yourself.
- **Comment @mentions** arrive as regular `comments` events under Instagram Login. Meta's separate `mentions` webhook field (with `mentioned_comment`/`mentioned_media` lookups) belongs to the Facebook-Login Instagram Graph API, which these abilities do not use — so **caption mentions are not delivered**; only mentions inside comments reach you.
- Unknown fields/shapes are forwarded to you anyway (never billed); ignore what you don't handle rather than erroring.

## Reconnect: channels connected before these abilities

These abilities are **Instagram-Login-only**. A channel connected via **Facebook Login** fails with an **unsupported-login-flow** error (never reconnect-required); connect the account through Instagram OAuth instead.

An Instagram-Login channel connected before publish/insights/comment abilities were available fails those operations with a **reconnect-required** error. Nothing is forced — DMs keep working without reconnecting.

> **HUMAN ACTION REQUIRED:** re-run `hookmyapp channels connect instagram` and complete the Instagram OAuth flow for the **same** account. Then retry the failed command.

## Scripts

| Script | Does | Env it reads |
|--------|------|--------------|
| `ig-send-dm.mjs` | Send a DM (`--to --text`, or `--file`) | `INSTAGRAM_ACCESS_TOKEN`, `INSTAGRAM_ACCOUNT_ID`, `INSTAGRAM_GRAPH_API_URL` |
| `ig-mark-seen.mjs` | Mark a DM thread seen (`--to`) | same |
| `ig-list-comments.mjs` | List comments on a media (`--media --limit`) | `INSTAGRAM_ACCESS_TOKEN` |
| `ig-reply-comment.mjs` | Public reply, or `--private` DM (`--comment --text`) | + `INSTAGRAM_ACCOUNT_ID` for `--private` |

Run any script with `--help`. Scripts auto-load `./.env` (override with `--dotenv <path>`) and print a JSON `{ok,...}` envelope, exit `0` on success, `2` on error.

## Assets

`ig-send-dm.json` — DM body. Copy, set the recipient IGSID, pass via `--body @assets/ig-send-dm.json` (CLI) or `--file assets/ig-send-dm.json` (script).
