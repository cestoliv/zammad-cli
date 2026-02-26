import type { Command } from "commander";
import pc from "picocolors";
import { ZammadClient } from "../client.ts";
import { getConfig } from "../config.ts";
import { formatArticle, formatTicketDetail } from "../format.ts";
import { handleError } from "../utils/errors.ts";

export function registerShowCommand(program: Command): void {
	program
		.command("show <id>")
		.description("Show ticket details and conversation")
		.option("--no-articles", "Skip loading articles")
		.action(async (id, opts) => {
			try {
				const config = getConfig();
				const client = new ZammadClient(config);
				const ticketId = Number.parseInt(id, 10);

				const ticket = await client.getTicket(ticketId);
				console.log(formatTicketDetail(ticket));

				if (opts.articles !== false) {
					const articles = await client.getArticles(ticketId);
					if (articles.length > 0) {
						console.log(`\n${pc.bold("─── Conversation ───")}\n`);
						for (const article of articles) {
							console.log(formatArticle(article));
							console.log(pc.dim("───"));
						}
					}
				}
			} catch (err) {
				handleError(err);
			}
		});
}
