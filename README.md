# HookMyApp Agent Skills

AI-agent skills for integrating [HookMyApp](https://hookmyapp.com) -- connect WhatsApp Business API in minutes.

## Installation

```bash
npx skills add hookmyapp/agent-skills
```

Works with Claude Code, Cursor, Codex CLI, Gemini CLI, and other compatible agents.

## Available Skills

| Skill | Description |
|-------|-------------|
| [integrate-hookmyapp](./skills/integrate-hookmyapp/SKILL.md) | Set up WhatsApp Business API integration -- receive webhooks and send messages |

## Prerequisites

- [HookMyApp CLI](https://www.npmjs.com/package/hookmyapp) (`npm install -g hookmyapp`)
- Node.js >= 18
- A HookMyApp account

## How It Works

The integration skill guides your AI coding agent through:
1. Installing and authenticating the HookMyApp CLI
2. Connecting a WhatsApp Business account (via Meta Embedded Signup or sandbox)
3. Configuring webhook forwarding to your application
4. Retrieving API credentials (WABA ID, access token, phone number ID)
5. Sending WhatsApp messages (text and template) from your code

Browser-only steps (login, embedded signup) are clearly marked so your agent knows when to prompt you for action.

## Links

- [HookMyApp](https://hookmyapp.com)
- [Webhook Starter Kit](https://github.com/hookmyapp/webhook-starter-kit)
