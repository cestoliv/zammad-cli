import * as clack from "@clack/prompts";
import type { Command } from "commander";
import pc from "picocolors";
import { ZammadClient } from "../client.ts";
import { getConfig } from "../config.ts";
import { handleError } from "../utils/errors.ts";

export function registerReplyCommand(program: Command): void {
	program
		.command("reply <id> [message]")
		.description("Add a reply or note to a ticket")
		.option("-i, --internal", "Mark as internal note", false)
		.option("-t, --type <type>", "Article type: note, email, phone", "note")
		.option("-s, --subject <subject>", "Article subject")
		.option("--to <email>", "Recipient email (auto-filled from ticket customer for email type)")
		.option("--cc <emails>", "CC recipients (comma-separated)")
		.action(async (id, message, opts) => {
			try {
				const config = getConfig();
				const client = new ZammadClient(config);
				const ticketId = Number.parseInt(id, 10);

				// For email type, resolve recipient from ticket if not provided
				let to = opts.to;
				if (opts.type === "email" && !to) {
					const ticket = await client.getTicket(ticketId);
					to = ticket.customer;
					if (!to) {
						console.error(
							pc.red(
								"Could not determine recipient from ticket. Use --to to specify one.",
							),
						);
						process.exit(1);
					}
				}

				let body = message;
				if (!body) {
					const result = await clack.text({
						message: `Reply to ticket #${ticketId}:`,
						placeholder: "Type your message…",
						validate: (val) =>
							!val || val.trim().length === 0 ? "Message cannot be empty" : undefined,
					});
					if (clack.isCancel(result)) {
						clack.cancel("Reply cancelled.");
						process.exit(0);
					}
					body = result;
				}

				const article = await client.createArticle({
					ticket_id: ticketId,
					body,
					subject: opts.subject,
					type: opts.type,
					internal: opts.internal,
					sender: "Agent",
					to,
					cc: opts.cc,
				});

				console.log(
					`${pc.green("✔")} Article #${article.id} added to ticket #${ticketId}${opts.internal ? " (internal)" : ""}`,
				);
			} catch (err) {
				handleError(err);
			}
		});
}
