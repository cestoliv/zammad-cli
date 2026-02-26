import type { Command } from "commander";
import { ZammadClient } from "../client.ts";
import { getConfig } from "../config.ts";
import { formatTicketTable } from "../format.ts";
import type { ZammadTicket } from "../types.ts";
import { handleError } from "../utils/errors.ts";

export function registerListCommand(program: Command): void {
	program
		.command("list")
		.description("List tickets")
		.option("-p, --page <number>", "Page number", "1")
		.option("-n, --per-page <number>", "Results per page", "25")
		.option("-s, --state <state>", "Filter by state (e.g., open, new, closed)")
		.action(async (opts) => {
			try {
				const config = getConfig();
				const client = new ZammadClient(config);
				const page = Number.parseInt(opts.page, 10);
				const perPage = Number.parseInt(opts.perPage, 10);

				let tickets: ZammadTicket[];
				if (opts.state) {
					tickets = await client.searchTickets(`state.name:${opts.state}`, page, perPage);
				} else {
					tickets = await client.listTickets(page, perPage);
				}

				if (tickets.length === 0) {
					console.log("No tickets found.");
					return;
				}
				console.log(formatTicketTable(tickets));
				console.log(`\n  Showing ${tickets.length} tickets (page ${page})`);
			} catch (err) {
				handleError(err);
			}
		});
}
