import type { Command } from "commander";
import pc from "picocolors";
import { ZammadClient } from "../client.ts";
import { getConfig } from "../config.ts";
import { formatTicketTable } from "../format.ts";
import { handleError } from "../utils/errors.ts";
import { resolveTickets } from "../utils/pagination.ts";
import { parsePositiveInt } from "../utils/parse.ts";

export function registerListCommand(program: Command): void {
	program
		.command("list")
		.description("List tickets, newest first")
		.option("-p, --page <number>", "Page number", "1")
		.option("-n, --per-page <number>", "Results per page", "25")
		.option("-s, --state <state>", "Filter by state (e.g., open, new, closed)")
		.action(async (opts) => {
			try {
				const config = getConfig();
				const client = new ZammadClient(config);
				const page = parsePositiveInt(opts.page, "--page");
				const perPage = parsePositiveInt(opts.perPage, "--per-page");

				const result = await resolveTickets(client, { state: opts.state, page, perPage });
				const { tickets, total, lastPage, filteredLocally, truncated } = result;

				if (truncated) {
					console.error(
						pc.yellow(
							"Warning: stopped after the maximum number of requests, so this list is " +
								"incomplete and the newest tickets may be missing.",
						),
					);
				}

				// Only worth mentioning when it changed what was shown; on an empty
				// result the fallback has already confirmed the state is empty.
				if (filteredLocally && tickets.length > 0) {
					console.error(pc.yellow("Search returned no results; filtered locally instead."));
				}

				if (tickets.length === 0) {
					if (page > lastPage) {
						console.log(
							`No tickets on page ${page}. There ${
								total === 1 ? "is 1 ticket" : `are ${total} tickets`
							} in total (last page is ${lastPage}).`,
						);
					} else if (opts.state) {
						console.log(`No tickets found with state "${opts.state}".`);
					} else {
						console.log("No tickets found.");
					}
					return;
				}

				console.log(formatTicketTable(tickets));
				console.log(
					`\n  Showing ${tickets.length} of ${total} tickets (page ${page} of ${lastPage})`,
				);
			} catch (err) {
				handleError(err);
			}
		});
}
