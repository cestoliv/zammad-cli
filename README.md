# zammad-cli

TypeScript CLI for [Zammad](https://zammad.org) helpdesk, built with Bun.

## Install

```bash
bun install -g github:your-user/zammad-cli
```

## Authentication

**Interactive login:**

```bash
zammad auth login
```

**Environment variables:**

```bash
export ZAMMAD_URL=https://support.example.com
export ZAMMAD_TOKEN=your-api-token
```

Environment variables take precedence over stored config.

## Commands

| Command | Description |
|---|---|
| `zammad auth login` | Configure credentials interactively |
| `zammad auth status` | Show current auth status |
| `zammad auth logout` | Remove stored credentials |
| `zammad tickets list` | List tickets (`-s open`, `-p 2`, `-n 10`) |
| `zammad tickets search <query>` | Search with Elasticsearch syntax |
| `zammad tickets show <id>` | Show ticket details and conversation |
| `zammad tickets reply <id> [msg]` | Reply to a ticket |
| `zammad tickets close <id>` | Close a ticket |
| `zammad open` | Shortcut: list open tickets |
| `zammad new` | Shortcut: list new tickets |
| `zammad interactive` | Interactive ticket browser |

## Agent skill

This project includes an [Agent Skill](https://agentskills.io) at `SKILL.md` that lets AI agents manage tickets directly. Compatible with Claude Code, Cursor, Gemini CLI, VS Code, and [other tools](https://agentskills.io/home).

## Usage

**List open tickets:**

```bash
zammad tickets list -s open
```

**Search tickets:**

```bash
zammad tickets search 'title:"Server migration*" AND (state.name:open OR state.name:new)'
```

**Reply by email:**

```bash
zammad tickets reply 42 "The update has been deployed." -t email -s "Re: Server migration"
```

The `--to` recipient is auto-filled from the ticket's customer. Override with `--to user@example.com`.

**Add an internal note:**

```bash
zammad tickets reply 42 "Waiting on infra team" -i
```

## Development

```bash
bun run dev -- tickets list       # run without building
bun test                          # run tests
bun run lint                      # lint with biome
```
