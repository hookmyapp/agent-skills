---
name: facebook
description: "Send Messenger messages, publish Page posts, moderate comments, and read Page insights. CLI-first recipes with a script + raw-HTTP fallback, for your own connected Facebook Page."
---

# Facebook Pages

Three ways to do everything below, in order of preference:

1. **CLI** (preferred): `hookmyapp facebook …` (alias `fb`), CLI >= 0.14.24. Run any command with `--help` for the full flag list.
2. **Bundled scripts** (no CLI at runtime): `node scripts/fb-*.mjs`. They read `FACEBOOK_ACCESS_TOKEN`, `FACEBOOK_PAGE_ID` and optionally `FACEBOOK_GRAPH_API_URL` from `./.env` (override with `--dotenv <path>` or `HOOKMYAPP_ENV_FILE`) and call the gateway directly. Messages and comments only; publish and insights have no bundled script.
3. **Raw HTTP** from your app: the gateway base is `https://gateway.hookmyapp.com/meta/v25.0`; the path after `/meta` is verbatim Meta Graph API for Pages.

All act on **your own connected Facebook channel**. The sandbox Page covers Messenger only and runs over MCP ([sandbox.md](sandbox.md#facebook)).

## Connect

A Page connects from the dashboard: **Connect Channel**, then **Facebook**, sign in, pick the Page. `hookmyapp channels connect facebook` opens that page and waits for the new channel. A Page with a linked Instagram account also connects that account as its own `instagram` channel with the full Instagram abilities ([instagram.md](instagram.md#connected-through-a-facebook-page)). The two channels are managed separately afterwards: disconnecting one never changes the other.

> **HUMAN ACTION REQUIRED:** the Page picker is a browser step. If the CLI printed a URL instead of opening a browser, hand it to the user.

## Credentials for scripts and raw HTTP

`hookmyapp channels env` does not yet emit a Facebook key set. Build the two values by hand:

```bash
FACEBOOK_ACCESS_TOKEN=$(hookmyapp channels token ch_xxxxxxxx)   # hmat_ channel token
FACEBOOK_PAGE_ID=<Page ID from `hookmyapp channels show ch_xxxxxxxx`>
```

`FACEBOOK_GRAPH_API_URL` defaults to `https://gateway.hookmyapp.com/meta/v25.0`.

## Rules that aren't in `--help`

- **Channel resolution.** `--channel <ref>` takes a `ch_xxxxxxxx` id (Page names are not resolvable refs), falling back to `HOOKMYAPP_CHANNEL_ID`. Wrong type → `CHANNEL_TYPE_MISMATCH`; none → `NO_CHANNEL`.
- **Ids have shapes.** Post `{pageId}_{postId}`; comment `{postId}_{commentId}` or the bare numeric id; Messenger thread `t_…`; person = numeric PSID. The CLI rejects anything else client-side (`BAD_FB_ID`). Comment **delete** takes the numeric id; the CLI strips the prefix for you.
- **The token reaches one Page.** Any other Page, post, comment or thread is refused with `FACEBOOK_SCOPE_DENIED`.
- **24-hour window.** A free-form Messenger message is allowed only within 24 hours of the person's last message; outside it the gateway answers 409 ("This person last messaged you more than 24 hours ago"). Send with a tag instead: `--tag CONFIRMED_EVENT_UPDATE|POST_PURCHASE_UPDATE|ACCOUNT_UPDATE` (`HUMAN_AGENT` only on Pages Meta approved for it). A tag covers only the update its name describes.
- **Private reply: once per comment, within 7 days.** A rejection is permanent for that comment; do not retry.
- **Reels are server-side.** `publish --reel` and `publish_facebook_post` with `kind: "reel"` run Meta's upload session for you through `POST /channels/{id}/facebook/reels`; never assemble it by hand.
- **Every publish publishes again.** No idempotency on Meta's side; check the Page before retrying.
- **Reconnect** (`FACEBOOK_SCOPE_MISSING`, "Reconnect the Facebook Page to enable this."): the Page was connected without the access that ability needs. The human reconnects from the channel page in the dashboard.

## Recipes

### Send / read a Messenger message

```bash
hookmyapp facebook messages send --channel ch_xxxxxxxx --to <psid> --text "thanks!"
hookmyapp facebook messages send --channel ch_xxxxxxxx --to <psid> --text "Your order shipped" --tag POST_PURCHASE_UPDATE
hookmyapp facebook messages send --channel ch_xxxxxxxx --body @assets/fb-send-dm.json
hookmyapp facebook messages read --channel ch_xxxxxxxx --to <psid>       # mark thread seen
# Script fallback:
node scripts/fb-send-dm.mjs --to <psid> --text "thanks!"
node scripts/fb-send-dm.mjs --file assets/fb-send-dm.json
```

Raw HTTP: `POST $FACEBOOK_GRAPH_API_URL/$FACEBOOK_PAGE_ID/messages` with `{"recipient":{"id":"<psid>"},"message":{"text":"..."}}`. Attachments: `message.attachment` with `type` `image|video|audio|file` and `payload.url` (public https). Sender actions: `{"recipient":{"id":"<psid>"},"sender_action":"mark_seen|typing_on|typing_off"}` (free).

### Read the inbox

```bash
hookmyapp facebook threads --channel ch_xxxxxxxx                       # threads, newest activity first
hookmyapp facebook threads --channel ch_xxxxxxxx --thread <t_id>       # messages in one thread
```

Raw: `GET /$FACEBOOK_PAGE_ID/conversations?platform=messenger&fields=id,participants,updated_time,unread_count,snippet`; one thread `GET /<t_id>?fields=messages{id,message,from,to,created_time}` (nested under `messages.data`). Participant profile reads (`GET /<psid>`) are not available on a Page token through the gateway.

### Publish

```bash
hookmyapp facebook publish --channel ch_xxxxxxxx --message "We are open today"
hookmyapp facebook publish --channel ch_xxxxxxxx --link https://example.com/new --message "New this week"
hookmyapp facebook publish --channel ch_xxxxxxxx --photo https://example.com/photo.jpg --message "New drop"
hookmyapp facebook publish --channel ch_xxxxxxxx --video https://example.com/clip.mp4 --description "..."
hookmyapp facebook publish --channel ch_xxxxxxxx --reel https://example.com/clip.mp4 --description "..."
hookmyapp facebook posts --channel ch_xxxxxxxx                          # list, newest first
hookmyapp facebook delete-post --channel ch_xxxxxxxx --post <page-id>_<post-id>
```

Raw: text/link `POST /$FACEBOOK_PAGE_ID/feed` `{message}` or `{link, message?}` → `{id: "<pageId>_<postId>"}`; photo `POST /$FACEBOOK_PAGE_ID/photos` `{url, message?}` → `{id, post_id}` (use `post_id`); video `POST /$FACEBOOK_PAGE_ID/videos` `{file_url, description?}`; reel `POST https://api.hookmyapp.com/channels/<ch_id>/facebook/reels` `{videoUrl, description?}` with an `hmok_` key and `X-Workspace-Id` → `{channelId, postId, kind: "reel"}`; delete `DELETE /<post-id>`. Media URLs are public https; photos JPG/PNG, videos and reels MP4.

### Moderate comments

```bash
hookmyapp facebook comments list --channel ch_xxxxxxxx --post <page-id>_<post-id>
hookmyapp facebook comments reply --channel ch_xxxxxxxx --comment <id> --message "thanks!"            # public reply
hookmyapp facebook comments private-reply --channel ch_xxxxxxxx --comment <id> --message "DM'd you"   # Messenger DM
hookmyapp facebook comments hide --channel ch_xxxxxxxx --comment <id>
hookmyapp facebook comments unhide --channel ch_xxxxxxxx --comment <id>
hookmyapp facebook comments delete --channel ch_xxxxxxxx --comment <id>
# Script fallback:
node scripts/fb-list-comments.mjs --post <page-id>_<post-id>
node scripts/fb-reply-comment.mjs --comment <id> --text "thanks!"          # add --private for a Messenger reply
```

Raw: list `GET /<post-id>/comments?fields=id,from,message,created_time,is_hidden,parent&filter=stream` (every comment, replies included, oldest first); reply `POST /<comment-id>/comments` `{message}`; hide `POST /<comment-id>` `{is_hidden: true|false}`; delete `DELETE /<numeric-comment-id>`; private reply `POST /$FACEBOOK_PAGE_ID/messages` `{recipient:{comment_id}, message:{text}}`. Hidden comments stay visible to their author and friends; hidden or deleted comments cannot be replied to; delete only works on the Page's own posts and is irreversible.

### Read insights and the Page profile

```bash
hookmyapp facebook insights --channel ch_xxxxxxxx                                          # Page, default metrics, period day
hookmyapp facebook insights --channel ch_xxxxxxxx --metric page_follows page_views_total --period week
hookmyapp facebook insights --channel ch_xxxxxxxx --post <page-id>_<post-id>               # post, lifetime
hookmyapp facebook profile --channel ch_xxxxxxxx                                           # name, category, followers, link
```

Raw: `GET /$FACEBOOK_PAGE_ID/insights?metric=<list>&period=day|week|days_28`; `GET /<post-id>/insights?metric=<list>`; `GET /$FACEBOOK_PAGE_ID?fields=id,name,category,followers_count,link,picture{url}`.

**Page defaults:** `page_post_engagements`, `page_follows`, `page_views_total`, `page_daily_follows_unique`. **Post defaults:** `post_clicks`, `post_reactions_by_type_total`, `post_activity_by_action_type`. Data can lag up to 48 hours; a retired metric returns an error naming it.

## Webhooks

Connected Facebook channels forward every Page event to the channel destination with the same delivery and `X-HookMyApp-Signature-256` signature as WhatsApp and Instagram. `object` is `page`, `entry[].id` is the Page id.

**Messenger events** ride in `entry[].messaging[]` (timestamps in milliseconds). Only an inbound message with text or attachments is billable; everything else is delivered free.

```json
{ "object": "page", "entry": [ { "id": "100000000000001", "time": 1789463829058, "messaging": [
  { "sender": { "id": "200000000000001" }, "recipient": { "id": "100000000000001" }, "timestamp": 1789463827321,
    "message": { "mid": "m_TEST_001", "text": "hello" } } ] } ] }
```

| Event | Key |
|-------|-----|
| Your own send | `message.is_echo: true`, Page as `sender` |
| Reaction | `reaction` with `mid`, `action` (`react`/`unreact`), `emoji` |
| Seen | `read.watermark` |
| Delivered | `delivery.mids[]`, `delivery.watermark` |
| Button or menu tap | `postback.title`, `postback.payload` |
| Attachment | `message.attachments[]` with `type` and `payload.url` |

**Comment and post events** ride in `entry[].changes[]` with `field: "feed"`; `value.item` (`comment`, `status`, `photo`, `video`, ...) and `value.verb` (`add`, `edited`, `hide`, `unhide`, `remove`). `created_time` on feed events is in seconds.

```json
{ "field": "feed", "value": { "item": "comment", "verb": "add",
  "comment_id": "500000000000001_500000000000002", "post_id": "100000000000001_500000000000001",
  "parent_id": "100000000000001_500000000000001",
  "from": { "id": "200000000000001", "name": "Test User" }, "message": "hello", "created_time": 1789463921 } }
```

`parent_id` is the post for a top-level comment and the parent comment for a reply. A `remove` carries no `message`. The Page's own comments and posts arrive too: compare `from.id` with the Page id to skip them.

## MCP

Nine Page tools, every one taking `channelId` (a facebook `ch_` id):

| Tool | Input | Output |
|------|-------|--------|
| `list_facebook_conversations` | `cursor?` | `conversations[]` (`id`, `participantName`, `updatedAt`, `unreadCount`, `snippet`), `cursor.next` |
| `list_facebook_posts` | `cursor?` | `posts[]` (`id`, `message`, `createdAt`, `permalink`, `type`), `cursor.next` |
| `publish_facebook_post` | `kind` (`text`/`link`/`photo`/`video`/`reel`), `message?`, `link?`, `mediaUrl?`, `description?` | `postId`, `kind` |
| `delete_facebook_post` | `postId` | `postId`, `deleted` |
| `list_facebook_comments` | `postId`, `cursor?` | `comments[]` (`id`, `fromName`, `message`, `createdAt`, `isHidden`, `parentId`), `cursor.next` |
| `reply_facebook_comment` | `commentId`, `message`, `private?` | `commentId`, `private`, `replyId` (public) or `messageId` (private) |
| `moderate_facebook_comment` | `commentId`, `action` (`hide`/`unhide`/`delete`) | `commentId`, `action`, `ok` |
| `get_facebook_insights` | `postId?`, `metrics?`, `period?` | `target` (`page`/`post`), `metrics[]` (`name`, `period`, `values[]` of `value`, `endTime`) |
| `get_facebook_page` | none | `pageId`, `name`, `category`, `followers`, `link`, `pictureUrl` |

`send_message` takes a facebook channel with `recipient.id` = PSID. `get_channel` on a facebook row adds `linkedInstagramChannelId`; both `list_channels` and `get_channel` carry `metaPageId`, `facebookPageName`, `facebookPagePictureUrl`. `create_onboarding_link` and `start_sandbox_session` accept `channelType: "facebook"`.

## Scripts

| Script | Does | Env it reads |
|--------|------|--------------|
| `fb-send-dm.mjs` | Send a Messenger message (`--to --text [--tag]`, or `--file`) | `FACEBOOK_ACCESS_TOKEN`, `FACEBOOK_PAGE_ID`, `FACEBOOK_GRAPH_API_URL` (optional) |
| `fb-list-comments.mjs` | List comments on a post (`--post [--limit]`) | `FACEBOOK_ACCESS_TOKEN`, `FACEBOOK_GRAPH_API_URL` (optional) |
| `fb-reply-comment.mjs` | Public reply, or `--private` Messenger reply (`--comment --text`) | + `FACEBOOK_PAGE_ID` for `--private` |

Run any script with `--help`. Scripts auto-load `./.env` (override with `--dotenv <path>`) and print a JSON `{ok,...}` envelope, exit `0` on success, `2` on error.

## Assets

`fb-send-dm.json`: Messenger text body. `fb-private-reply.json`: private reply to a comment. Copy, set the id, pass via `--body @assets/<file>` (CLI) or `--file assets/<file>` (script).
