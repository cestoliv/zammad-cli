import type { Command } from "commander";
import { ZammadClient } from "../client.ts";
import { getConfig } from "../config.ts";
import { formatTicketTable } from "../format.ts";
import { handleError } from "../utils/errors.ts";

export function registerSearchCommand(program: Command): void {
	program
		.command("search <query>")
		.description("Search tickets (Elasticsearch syntax)")
		.option("-p, --page <number>", "Page number", "1")
		.option("-n, --per-page <number>", "Results per page", "25")
		.addHelpText(
			"after",
			`
Examples:
  zammad tickets search "DNS issue"
  zammad tickets search "title:Deploy*"
  zammad tickets search "title:Deploy* AND state.name:open"
  zammad tickets search "customer.email:user@example.com"`,
		)
		.action(async (query, opts) => {
			try {
				const config = getConfig();
				const client = new ZammadClient(config);
				const page = Number.parseInt(opts.page, 10);
				const perPage = Number.parseInt(opts.perPage, 10);

				const tickets = await client.searchTickets(query, page, perPage);

				if (tickets.length === 0) {
					console.log(`No tickets matching "${query}".`);
					return;
				}
				console.log(formatTicketTable(tickets));
				console.log(`\n  ${tickets.length} results for "${query}" (page ${page})`);
			} catch (err) {
				handleError(err);
			}
		});
}
