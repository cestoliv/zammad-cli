import * as clack from "@clack/prompts";
import type { Command } from "commander";
import pc from "picocolors";
import { ZammadClient } from "../client.ts";
import { getConfig } from "../config.ts";
import { handleError, InputError } from "../utils/errors.ts";
import { toHtmlBody } from "../utils/parse.ts";

const ARTICLE_TYPES = ["note", "email", "phone", "web"] as const;
const SENDERS = ["Customer", "Agent", "System"] as const;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function registerCreateCommand(program: Command): void {
	program
		.command("create [message]")
		.description("Create a ticket on behalf of a customer")
		.option("-t, --title <title>", "Ticket title (required)")
		.option("-c, --customer <email>", "Customer email address (required)")
		.option("-g, --group <name>", "Target group", "Users")
		.option("-s, --state <state>", "Initial state", "new")
		.option("--type <type>", "Article type: note, email, phone, web", "web")
		.option("--sender <sender>", "Article sender: Customer, Agent, System", "Customer")
		.option("--subject <subject>", "Article subject (defaults to the title)")
		.option("-i, --internal", "Mark the initial article as internal", false)
		.action(async (message, opts) => {
			try {
				const config = getConfig();
				const client = new ZammadClient(config);

				const title = opts.title;
				if (!title || title.trim().length === 0) {
					throw new InputError("Missing required option --title.");
				}

				const customer = opts.customer;
				if (!customer || customer.trim().length === 0) {
					throw new InputError("Missing required option --customer.");
				}
				if (!EMAIL_RE.test(customer)) {
					throw new InputError(`Invalid customer email: "${customer}".`);
				}

				if (!ARTICLE_TYPES.includes(opts.type)) {
					throw new InputError(
						`Invalid value for --type: "${opts.type}". Expected one of: ${ARTICLE_TYPES.join(", ")}.`,
					);
				}
				if (!SENDERS.includes(opts.sender)) {
					throw new InputError(
						`Invalid value for --sender: "${opts.sender}". Expected one of: ${SENDERS.join(", ")}.`,
					);
				}

				let body = message;
				if (message === undefined) {
					const result = await clack.text({
						message: `New ticket for ${customer}:`,
						placeholder: "Describe the request…",
						validate: (val) =>
							!val || val.trim().length === 0 ? "Message cannot be empty" : undefined,
					});
					if (clack.isCancel(result)) {
						clack.cancel("Ticket creation cancelled.");
						process.exit(0);
					}
					body = result;
				}
				if (!body || body.trim().length === 0) {
					throw new InputError("Message cannot be empty.");
				}

				const ticket = await client.createTicket({
					title,
					group: opts.group,
					customer,
					state: opts.state,
					article: {
						subject: opts.subject ?? title,
						body: toHtmlBody(body),
						type: opts.type,
						sender: opts.sender,
						internal: opts.internal,
						content_type: "text/html",
					},
				});

				console.log(`${pc.green("✔")} Ticket #${ticket.number} created (id ${ticket.id})`);
				console.log(pc.dim(`  zammad tickets show ${ticket.id}`));
			} catch (err) {
				handleError(err);
			}
		});
}
