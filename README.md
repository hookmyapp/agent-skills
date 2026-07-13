# HookMyApp Agent Skills

AI-agent skills for integrating [HookMyApp](https://hookmyapp.com) -- connect WhatsApp Business or Instagram in minutes.

## Installation

```bash
npx skills add hookmyapp/agent-skills
```

Works with Claude Code, Cursor, Codex CLI, Gemini CLI, and other compatible agents.

## Available Skills

| Skill | Description |
|-------|-------------|
| [integrate-hookmyapp](./skills/integrate-hookmyapp/SKILL.md) | Set up WhatsApp Business or Instagram integration -- receive webhooks and send messages. Covers the CLI, the hosted MCP server, and the public REST API |

## Prerequisites

- Node.js >= 20
- A HookMyApp account

The skill checks for the HookMyApp CLI before running commands. If `hookmyapp` is missing, it installs `@gethookmyapp/cli` with npm.

## How It Works

The integration skill guides your AI coding agent through:
1. Installing and authenticating the HookMyApp CLI
2. Connecting a WhatsApp Business or Instagram account (via Meta embedded signup or sandbox)
3. Configuring webhook forwarding to your application
4. Retrieving API credentials (channel id, a minted gateway access token, phone number id or Instagram account id)
5. Sending WhatsApp and Instagram messages (raw HTTP from your code, or the typed `whatsapp` / `instagram` CLI commands for scripting) plus managing templates, media, the business profile, and Instagram comment moderation

Browser-only steps (login, embedded signup) are clearly marked so your agent knows when to prompt you for action.

## Links

- [HookMyApp](https://hookmyapp.com)
- [Webhook Starter Kit](https://github.com/hookmyapp/webhook-starter-kit)
