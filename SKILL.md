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

Results are ordered **newest first**, so the most recent tickets stay visible
even when a page size truncates the list. `--per-page` is not limited by
Zammad's server-side cap of 100 — larger values are satisfied by fetching
several pages — and the footer reports the true total, e.g.
`Showing 25 of 137 tickets (page 1 of 6)`.

`--state` prefers Zammad's search backend. If search returns nothing (it needs
Elasticsearch, and returns zero results for *every* query when it is down), the
filter is re-applied client-side against the index endpoint, which does not
depend on Elasticsearch. When that fallback actually returns rows, a notice is
printed to stderr; when it confirms the state is genuinely empty, no notice is
printed because nothing was hidden.

`--page` and `--per-page` reject anything that is not a positive integer rather
than silently treating it as zero results.

**Limits.** Listing pages through the API at 100 tickets per request, up to 50
requests (5000 tickets). Beyond that the list is incomplete, and a warning is
printed to stderr — believe the warning rather than the totals. Because the
whole matching set is fetched before sorting and slicing, every `list`
invocation costs at least one request per 100 tickets, even for `--per-page 25`.

### Search tickets

Uses Zammad's Elasticsearch query syntax.

```bash
zammad tickets search "VPN issue"
zammad tickets search 'title:"Password reset*"'
zammad tickets search 'state.name:open AND group.name:Support'
zammad tickets search 'customer.email:jane@example.com'
zammad tickets search 'title:"Onboarding*" AND (state.name:open OR state.name:new)'
```

### Create a ticket

```bash
zammad tickets create \
  -t "[Exercise Request] Toe To Bar" \
  -c customer@example.com \
  "Bonjour, pouvez-vous ajouter l'exercice Toe To Bar ?"

# Override defaults
zammad tickets create -t "T" -c customer@example.com -g Support -s open --type note --sender Agent -i "Internal draft"
```

Defaults match what the in-app support form produces: group `Users`, state
`new`, article type `web`, sender `Customer`, publicly visible. The group name
is not validated client-side, so a wrong `-g` returns a Zammad API error.

Zammad's own trigger sends an auto-acknowledgement email to the customer, the
same as for a form submission. The customer learns a ticket exists in their
name, so confirm the address before you run this.

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

# Multi-line body — quoted newlines (preferred)
zammad tickets reply 42 "Hello,
Your issue has been resolved.
Best regards" -t email -s "Re: VPN issue"

# Or with explicit \n
zammad tickets reply 42 $'Hello,\nYour issue has been resolved.\nBest regards' -t email -s "Re: VPN issue"
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
