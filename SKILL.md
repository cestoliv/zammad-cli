---
name: zammad
description: Manage Zammad helpdesk tickets. Use when the user asks about support tickets, customer issues, helpdesk tasks, or wants to search, view, reply to, or close tickets.
allowed-tools: Bash(zammad *)
metadata:
  clawdbot:
    emoji: "💁"
    requires:
      env: ["ZAMMAD_URL", "ZAMMAD_TOKEN"]
---

# Zammad CLI

Use the `zammad` CLI to interact with a Zammad helpdesk instance. If `zammad` is not in PATH, fall back to `bun run dev --` from the project root.

## Prerequisites

Authentication must be configured before any command works. Check with:

```bash
zammad auth status
```

If not configured, either:

1. Run `zammad auth login` (interactive prompt for URL and token)
2. Set environment variables:
   ```bash
   export ZAMMAD_URL=https://support.example.com
   export ZAMMAD_TOKEN=<api-token>
   ```

The API token is generated from Zammad: User Preferences > Token Access.

## Commands

### List tickets

```bash
zammad tickets list                # all tickets (page 1)
zammad tickets list -s open        # filter by state
zammad tickets list -s new
zammad tickets list -p 2 -n 50     # page 2, 50 per page
zammad open                        # shortcut for open tickets
zammad new                         # shortcut for new tickets
```

### Search tickets

Uses Zammad's Elasticsearch query syntax.

```bash
zammad tickets search "VPN issue"
zammad tickets search 'title:"Password reset*"'
zammad tickets search 'state.name:open AND group.name:Support'
zammad tickets search 'customer.email:jane@example.com'
zammad tickets search 'title:"Onboarding*" AND (state.name:open OR state.name:new)'
```

### View ticket details

```bash
zammad tickets show 42             # ticket info + full conversation
zammad tickets show 42 --no-articles  # ticket info only
```

### Reply to a ticket

```bash
# Add an internal note (default)
zammad tickets reply 42 "Escalated to infrastructure team"

# Send an email reply (auto-resolves recipient from ticket customer)
zammad tickets reply 42 "Your issue has been resolved." -t email -s "Re: VPN issue"

# Specify recipient explicitly
zammad tickets reply 42 "Update on your request" -t email --to user@example.com

# Internal note
zammad tickets reply 42 "Waiting on vendor response" -i
```

### Close a ticket

```bash
zammad tickets close 42                            # with confirmation prompt
zammad tickets close 42 --no-confirm               # skip confirmation
zammad tickets close 42 -m "Resolved per customer"  # add closing note
```

## Use cases

### Triage new tickets

Find and review unassigned new tickets:

```bash
zammad new
zammad tickets show <id>
```

### Bulk review by search

Find all open tickets matching a pattern, review each one:

```bash
zammad tickets search 'title:"Deploy*" AND state.name:open'
zammad tickets show <id>
zammad tickets reply <id> "Deployment completed successfully." -t email -s "Re: Deployment request"
zammad tickets close <id> --no-confirm
```

### Check customer history

```bash
zammad tickets search 'customer.email:user@example.com'
```

## Output format

- `tickets list` and `tickets search` return a table with columns: ID, Number, Title, State, Priority, Customer, Updated.
- `tickets show` returns full ticket metadata followed by the conversation thread.
- All commands exit with code 1 on error and print a colored error message to stderr.
