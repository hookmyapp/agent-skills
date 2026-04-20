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
  ├─ Run `hookmyapp sandbox listen --verbose` to stream full request/response bodies in the CLI terminal — this is the first-line diagnostic before touching server logs.
  ├─ Check your server logs for inbound POST /webhook requests — if the CLI terminal shows bodies but your server shows nothing, the issue is your server/DNS/TLS (not the forwarder).
  ├─ Check Meta App Dashboard → Webhooks → "Recent Deliveries" for 4xx/5xx responses.
  ├─ Check that `hookmyapp channels show <waba-id>` reports `forwarding: enabled` — `channels disable` would silently drop all inbound messages.
  └─ Verify your `X-HookMyApp-Signature-256` HMAC check against the `VERIFY_TOKEN` — a mismatch silently drops messages on the receiver side. See SKILL.md "Signature verification" for the two byte-equivalent shapes (parsed+`JSON.stringify` vs raw-body).
```

## Error → Fix Table

| Symptom / Error | Likely Cause | Fix |
|-----------------|--------------|-----|
| `401 invalid_token` from Meta Graph API | Expired / rotated system-user token | Run `hookmyapp token <waba-id>` to get the current token; if still fails, re-run `hookmyapp channels connect` to re-mint. |
| `403 forbidden_waba` | Token is valid but not authorized for this WABA | The WABA was disconnected in Meta App Dashboard. Reconnect with `hookmyapp channels connect`. |
| `404` on Meta's webhook verify GET | Your server isn't serving the verify path | Ensure your server responds to `GET /webhook` (default) with `VERIFY_TOKEN` as plain-text body. Match `--path` on `sandbox listen` if you use a custom path. |
| `sandbox listen: tunnel closed` / cloudflared errors | Network drop, Cloudflare upstream issue, or stale cloudflared binary | First-line: re-run with `hookmyapp sandbox listen --reinstall-tunnel-binary` to force re-download cloudflared. If drops persist, check your local firewall isn't blocking outbound 443 to `*.trycloudflare.com`. |
| Webhook arrives at HookMyApp but nothing in your server logs | Either the tunnel is up and the CLI is buffering, or your server is dropping the connection before logging | Re-run `hookmyapp sandbox listen --verbose` — the CLI will stream full request/response bodies. If the CLI shows bodies but your server doesn't, the issue is your server's middleware chain, DNS, or TLS. |
| Webhook POSTs stopped arriving mid-session | Channel forwarding toggled off | Run `hookmyapp channels show <waba-id>` — look for `forwarding: enabled`. If disabled, re-enable with `hookmyapp channels enable <waba-id>`. |
| `sandbox send` rejected: "recipient not session phone" | You passed a recipient that isn't the session phone (via API — there's no `--to` flag on the CLI) | Sandbox pins recipient to session phone server-side. For multi-recipient testing you need a production WABA. |
| `sandbox send` rejected: "template messages blocked" | Tried to send a `type: "template"` message on sandbox | Templates are production-only. Use `type: "text"` on sandbox, or move to production. |
| `channels connect: popup blocked` | Browser blocked Meta's embedded-signup popup | Allow popups from `app.hookmyapp.com`, or copy the URL the CLI prints and open it manually. |
| `workspace use: not a member of workspace` | The workspace ID is valid but your user isn't a member | Ask the workspace owner to invite you, or run `workspace list` to find one you own. |
| `webhook set` fails with "URL did not pass Meta's verify GET" | Your server isn't up, or it isn't returning `VERIFY_TOKEN` as the response body | Start your server first, confirm `curl https://<your-domain>/webhook` returns the verify-token plaintext, then re-run `webhook set`. |
| Webhook POSTs arrive but signature check fails | Mismatched body-shape between forwarder signing and your verification, or wrong HMAC key | HookMyApp's forwarder signs EVERY outbound webhook (sandbox AND production) as `X-HookMyApp-Signature-256` keyed on your `VERIFY_TOKEN` over `JSON.stringify(parsedBody)`. If your server uses `express.json()`, hash `JSON.stringify(req.body)`; if it uses `express.raw({ type: 'application/json' })`, hash the raw bytes. Both are byte-equivalent. `X-Hub-Signature-256` / `APP_SECRET` is internal to the forwarder — customers never see it. See SKILL.md "Signature verification". |

## CLI exit codes (global conventions)

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Not authenticated / generic user error |
| 2 | Workspace not selected / resource not in workspace |
| 3 | Authorization failure (member of workspace but not allowed the action) |
| 4+ | Command-specific (see the per-command reference) |

> **Caveat:** These codes are the **documented convention** for top-level auth/workspace errors. Per-command exit codes (e.g., `health`) may use a different numbering — check the specific command's reference before gating CI on a non-zero exit.
