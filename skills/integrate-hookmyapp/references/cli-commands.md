# HookMyApp CLI Command Reference

Complete reference for the `hookmyapp` CLI. Install globally via `npm install -g hookmyapp`.

## Global Options

| Flag | Description |
|------|-------------|
| `--human` | Human-readable output (default: JSON) |
| `--version` | Show CLI version |
| `--help` | Show help |

## Authentication

### `hookmyapp login`

Authenticate with HookMyApp via browser-based device flow.

```bash
hookmyapp login
```

Opens a browser window for authentication. Credentials are stored locally at `~/.hookmyapp/credentials.json`. Tokens auto-refresh.

## Accounts

### `hookmyapp accounts list`

List all connected WhatsApp Business accounts in the active workspace.

```bash
hookmyapp accounts list
hookmyapp accounts list --human
```

**Output fields:** metaWabaId, wabaName, displayPhoneNumber, phoneNumberId, phoneVerifiedName, connectionType, metaConnected, webhookUrl, enabled

### `hookmyapp accounts show <waba-id>`

Show detailed information for a specific account.

```bash
hookmyapp accounts show 123456789
```

### `hookmyapp accounts connect`

Connect a new WhatsApp Business account via Meta Embedded Signup.

```bash
hookmyapp accounts connect
```

Opens Meta's Embedded Signup in the browser. The CLI polls for the new account (up to 15 minutes). Requires human interaction in the browser to complete the signup flow.

### `hookmyapp accounts disconnect <waba-id>`

Disconnect a WhatsApp Business account.

```bash
hookmyapp accounts disconnect 123456789
```

### `hookmyapp accounts enable <waba-id>`

Enable webhook forwarding for an account.

```bash
hookmyapp accounts enable 123456789
```

### `hookmyapp accounts disable <waba-id>`

Disable webhook forwarding for an account.

```bash
hookmyapp accounts disable 123456789
```

## Webhook

### `hookmyapp webhook show <waba-id>`

Show webhook configuration for an account.

```bash
hookmyapp webhook show 123456789
hookmyapp webhook show 123456789 --human
```

### `hookmyapp webhook set <waba-id>`

Set or update the webhook URL for an account.

```bash
hookmyapp webhook set 123456789 --url https://example.com/webhook
hookmyapp webhook set 123456789 --url https://example.com/webhook --verify-token my-secret
```

| Flag | Required | Description |
|------|----------|-------------|
| `--url <url>` | Yes | Webhook URL (must be publicly accessible HTTPS) |
| `--verify-token <token>` | No | Verify token for signature verification |

## Token

### `hookmyapp token show <waba-id>`

Show the current access token for an account. Outputs the raw token string to stdout.

```bash
hookmyapp token show 123456789
```

Useful for debugging or manual API calls. Tokens are automatically managed and refreshed by HookMyApp.

## Environment

### `hookmyapp env <waba-id>`

Output credentials in `.env` format for use in your application.

```bash
hookmyapp env 123456789
hookmyapp env 123456789 >> .env
```

**Output:**

```
WABA_ID=123456789
ACCESS_TOKEN=EAAx...
PHONE_NUMBER_ID=987654321
```

## Workspace

### `hookmyapp workspace list`

List all workspaces you belong to. The active workspace is marked with `*`.

```bash
hookmyapp workspace list
hookmyapp workspace list --human
```

### `hookmyapp workspace use <name-or-id>`

Set the active workspace by name or ID.

```bash
hookmyapp workspace use "My Workspace"
hookmyapp workspace use 550e8400-e29b-41d4-a716-446655440000
```

### `hookmyapp workspace new <name>`

Create a new workspace and switch to it.

```bash
hookmyapp workspace new "My Workspace"
```

### `hookmyapp workspace current`

Show details of the active workspace.

```bash
hookmyapp workspace current
hookmyapp workspace current --human
```

**Output fields:** name, id, role, memberCount, accountCount

### `hookmyapp workspace rename <new-name>`

Rename the active workspace.

```bash
hookmyapp workspace rename "New Name"
```

### Workspace Members

#### `hookmyapp workspace members list`

List members and pending invites in the active workspace.

```bash
hookmyapp workspace members list
hookmyapp workspace members list --human
```

#### `hookmyapp workspace members invite <email>`

Invite a user to the workspace.

```bash
hookmyapp workspace members invite user@example.com
hookmyapp workspace members invite user@example.com --role admin
```

| Flag | Default | Description |
|------|---------|-------------|
| `--role <role>` | `member` | Role to assign: `admin` or `member` |

#### `hookmyapp workspace members remove <email>`

Remove a member from the workspace.

```bash
hookmyapp workspace members remove user@example.com --yes
```

| Flag | Description |
|------|-------------|
| `-y, --yes` | Skip confirmation prompt (required for non-interactive use) |

#### `hookmyapp workspace members role <email>`

Update a member's role.

```bash
hookmyapp workspace members role user@example.com --role admin
```

| Flag | Required | Description |
|------|----------|-------------|
| `--role <role>` | Yes | New role: `admin` or `member` |

### Workspace Invites

#### `hookmyapp workspace invites cancel <id-or-email>`

Cancel a pending invite by invite ID or email.

```bash
hookmyapp workspace invites cancel user@example.com --yes
```

| Flag | Description |
|------|-------------|
| `-y, --yes` | Skip confirmation prompt (required for non-interactive use) |

## Health

### `hookmyapp health <waba-id>`

Check account health by refreshing token and connection status.

```bash
hookmyapp health 123456789
hookmyapp health 123456789 --human
```

## Billing

### `hookmyapp billing status`

Show current subscription status for the active workspace.

```bash
hookmyapp billing status
hookmyapp billing status --human
```

### `hookmyapp billing upgrade`

Open Stripe checkout to upgrade the workspace plan.

```bash
hookmyapp billing upgrade
hookmyapp billing upgrade --plan pro
```

| Flag | Default | Description |
|------|---------|-------------|
| `--plan <slug>` | `pro` | Plan slug to upgrade to |
