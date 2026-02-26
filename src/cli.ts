#!/usr/bin/env bun

import { Command } from "commander";
import { registerAuthCommands } from "./commands/auth.ts";
import { registerCloseCommand } from "./commands/close.ts";
import { registerInteractiveCommand } from "./commands/interactive.ts";
import { registerListCommand } from "./commands/list.ts";
import { registerReplyCommand } from "./commands/reply.ts";
import { registerSearchCommand } from "./commands/search.ts";
import { registerShowCommand } from "./commands/show.ts";

const program = new Command();

program.name("zammad").description("Zammad helpdesk CLI").version("0.1.0");

// ── Auth (top-level group) ──
registerAuthCommands(program);

// ── Tickets (resource subcommand group) ──
const tickets = program.command("tickets").alias("t").description("Manage tickets");

registerListCommand(tickets);
registerSearchCommand(tickets);
registerShowCommand(tickets);
registerReplyCommand(tickets);
registerCloseCommand(tickets);

// ── Interactive mode (top-level shortcut) ──
registerInteractiveCommand(program);

// ── Top-level shortcuts ──
program
	.command("open")
	.description("Shortcut: list open tickets")
	.action(async () => {
		await tickets.parseAsync(["list", "--state", "open"], { from: "user" });
	});

program
	.command("new")
	.description("Shortcut: list new tickets")
	.action(async () => {
		await tickets.parseAsync(["list", "--state", "new"], { from: "user" });
	});

program.parse();
