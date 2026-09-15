# HookMyApp Agent Skills

AI-agent skills for integrating [HookMyApp](https://hookmyapp.com) -- connect WhatsApp Business, Instagram or a Facebook Page in minutes.

## Installation

```bash
npx skills add hookmyapp/agent-skills --all --global
```

Works with Claude Code, Cursor, Codex CLI, Gemini CLI, and other compatible agents.

## Available Skills

| Skill                                                        | Description                                                                                                                                             |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [integrate-hookmyapp](./skills/integrate-hookmyapp/SKILL.md) | Set up WhatsApp Business, Instagram or Facebook Page integration -- receive webhooks and send messages. Covers the CLI, the hosted MCP server, and the public REST API |

## Prerequisites

- Node.js >= 20
- A HookMyApp account

The skill checks for the HookMyApp CLI before running commands. If `hookmyapp` is missing, it installs `@gethookmyapp/cli` with npm.

## How It Works

The integration skill guides your AI coding agent through:

1. Installing and authenticating the HookMyApp CLI
2. Connecting WhatsApp through Meta Embedded Signup, Instagram through Instagram OAuth, or a Facebook Page from the dashboard, or using a sandbox
3. Configuring webhook forwarding to your application
4. Retrieving API credentials (channel id, a minted gateway access token, phone number id, Instagram account id or Page id)
5. Sending WhatsApp, Instagram and Messenger messages (raw HTTP from your code, or the typed `whatsapp` / `instagram` / `facebook` CLI commands for scripting) plus managing templates, media, the business profile, Instagram and Facebook comment moderation, and Facebook Page publishing and insights

Browser-only steps (the default browser login flow, WhatsApp Embedded Signup, and Instagram OAuth) are clearly marked so your agent knows when to prompt you for action. Browser-free login through email OTP or a bootstrap code remains documented.

## Links

- [HookMyApp](https://hookmyapp.com)
- [Webhook Starter Kit](https://github.com/hookmyapp/webhook-starter-kit)
