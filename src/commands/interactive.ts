import * as clack from "@clack/prompts";
import type { Command } from "commander";
import pc from "picocolors";
import { ZammadClient } from "../client.ts";
import { getConfig } from "../config.ts";
import { formatArticle, formatTicketDetail } from "../format.ts";
import { fetchAllTickets } from "../utils/pagination.ts";

export function registerInteractiveCommand(program: Command): void {
	program
		.command("interactive")
		.alias("i")
		.description("Interactive ticket browser with fuzzy search")
		.action(async () => {
			try {
				const config = getConfig();
				const client = new ZammadClient(config);

				clack.intro(pc.bold("Zammad Interactive Mode"));

				const spinner = clack.spinner();
				spinner.start("Loading tickets…");
				const tickets = await fetchAllTickets(client, 100, 10);
				spinner.stop(`Loaded ${tickets.length} tickets`);

				const ticketOptions = tickets.map((t) => ({
					value: t.id,
					label: `#${t.number} ${t.title}`,
					hint: `${t.state ?? "unknown"} · ${t.customer ?? ""}`,
				}));

				const selectedId = await clack.select({
					message: "Select a ticket:",
					options: ticketOptions,
				});

				if (clack.isCancel(selectedId)) {
					clack.cancel("Exited.");
					return process.exit(0);
				}

				const action = await clack.select({
					message: "What would you like to do?",
					options: [
						{ value: "show", label: "View details & conversation" },
						{ value: "reply", label: "Add a reply" },
						{ value: "close", label: "Close this ticket" },
						{ value: "back", label: "Go back" },
					],
				});

				if (clack.isCancel(action) || action === "back") {
					clack.outro("Done.");
					return;
				}

				const ticket = await client.getTicket(selectedId as number);

				if (action === "show") {
					console.log(`\n${formatTicketDetail(ticket)}`);
					const articles = await client.getArticles(ticket.id);
					for (const article of articles) {
						console.log(`\n${formatArticle(article)}`);
						console.log(pc.dim("───"));
					}
				}

				if (action === "reply") {
					const message = await clack.text({
						message: "Your reply:",
						validate: (v) => (v.trim() ? undefined : "Cannot be empty"),
					});
					if (!clack.isCancel(message)) {
						await client.createArticle({
							ticket_id: ticket.id,
							body: message,
							type: "note",
							internal: false,
						});
						clack.log.success("Reply added.");
					}
				}

				if (action === "close") {
					await client.updateTicket(ticket.id, { state: "closed" });
					clack.log.success(`Ticket #${ticket.number} closed.`);
				}

				clack.outro("Done.");
			} catch (err) {
				console.error(err);
				process.exit(1);
			}
		});
}
