---
name: troubleshooting
description: Decision tree and error→fix table for diagnosing HookMyApp CLI and webhook problems.
---

# Troubleshooting

## Decision Tree

```
Start:  Can you run `hookmyapp channels list` and see at least one WABA?
  ├─ No  → Auth problem → run `hookmyapp login`, then `hookmyapp workspace use <id>`
  └─ Yes → continue

  Does `hookmyapp health <waba-id>` return status "healthy"?
  ├─ No  → Credentials / phone number problem
  │         - status "unhealthy" on phone_numbers[].code_verification_status: re-verify in Meta dashboard
  │         - status "unhealthy" on webhook.verified = false: your webhook URL failed Meta's verify GET
  │         - quality_rating RED/YELLOW: reduce send volume, Meta auto-flagged the number
  └─ Yes → continue

  Does `hookmyapp webhook show <waba-id>` print your expected URL?
  ├─ No  → Run `hookmyapp webhook set <waba-id> --url https://<your-domain>/webhook`
  └─ Yes → continue

  Are messages still not arriving?
  ├─ Check your server logs for inbound POST /webhook requests — if none, the tunnel / DNS / TLS is the issue.
  ├─ Check Meta App Dashboard → Webhooks → "Recent Deliveries" for 4xx/5xx responses.
  └─ Verify your `X-Hub-Signature-256` HMAC check against the APP_SECRET — a mismatch silently drops messages.
```

## Error → Fix Table

| Symptom / Error | Likely Cause | Fix |
|-----------------|--------------|-----|
| `401 invalid_token` from Meta Graph API | Expired / rotated system-user token | Run `hookmyapp token <waba-id>` to get the current token; if still fails, re-run `hookmyapp channels connect` to re-mint. |
| `403 forbidden_waba` | Token is valid but not authorized for this WABA | The WABA was disconnected in Meta App Dashboard. Reconnect with `hookmyapp channels connect`. |
| `404` on Meta's webhook verify GET | Your server isn't serving the verify path | Ensure your server responds to `GET /webhook` (default) with `VERIFY_TOKEN` as plain-text body. Match `--path` on `sandbox listen` if you use a custom path. |
| `sandbox listen: tunnel closed` | Network drop or Cloudflare upstream issue | Re-run `hookmyapp sandbox listen --phone +<E164>`. If it keeps dropping, check your local firewall isn't blocking outbound 443 to `*.trycloudflare.com`. |
| `sandbox send` rejected: "recipient not session phone" | You passed a recipient that isn't the session phone (via API — there's no `--to` flag on the CLI) | Sandbox pins recipient to session phone server-side. For multi-recipient testing you need a production WABA. |
| `sandbox send` rejected: "template messages blocked" | Tried to send a `type: "template"` message on sandbox | Templates are production-only. Use `type: "text"` on sandbox, or move to production. |
| `channels connect: popup blocked` | Browser blocked Meta's embedded-signup popup | Allow popups from `app.hookmyapp.com`, or copy the URL the CLI prints and open it manually. |
| `workspace use: not a member of workspace` | The workspace ID is valid but your user isn't a member | Ask the workspace owner to invite you, or run `workspace list` to find one you own. |
| `webhook set` fails with "URL did not pass Meta's verify GET" | Your server isn't up, or it isn't returning `VERIFY_TOKEN` as the response body | Start your server first, confirm `curl https://<your-domain>/webhook` returns the verify-token plaintext, then re-run `webhook set`. |
| Webhook POSTs arrive but signature check fails | Using `VERIFY_TOKEN` as the HMAC key in production | Production uses Meta's `X-Hub-Signature-256` header keyed on `APP_SECRET` (from `hookmyapp env`), not `VERIFY_TOKEN`. Sandbox uses `X-HookMyApp-Signature-256` keyed on the sandbox `VERIFY_TOKEN`. Different headers, different keys. |

## CLI exit codes (global conventions)

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Not authenticated / generic user error |
| 2 | Workspace not selected / resource not in workspace |
| 3 | Authorization failure (member of workspace but not allowed the action) |
| 4+ | Command-specific (see the per-command reference) |
