import * as clack from "@clack/prompts";
import type { Command } from "commander";
import pc from "picocolors";
import { ZammadClient } from "../client.ts";
import { getConfig } from "../config.ts";
import { handleError, InputError, isCustomerLookupError } from "../utils/errors.ts";
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
		.option("--create-customer", "Create the customer when the email is unknown to Zammad", false)
		.option(
			"--customer-name <name>",
			"Full name of the customer to create (requires --create-customer)",
		)
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

				if (opts.createCustomer && (!opts.customerName || opts.customerName.trim().length === 0)) {
					throw new InputError(
						"Missing required option --customer-name when using --create-customer.",
					);
				}
				if (opts.customerName && !opts.createCustomer) {
					throw new InputError("--customer-name requires --create-customer.");
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

				const ticketParams = {
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
						content_type: "text/html" as const,
					},
				};

				let createdCustomerId: number | undefined;
				let ticket: Awaited<ReturnType<typeof client.createTicket>>;
				try {
					ticket = await client.createTicket(ticketParams);
				} catch (err) {
					if (!isCustomerLookupError(err) || !opts.createCustomer) {
						throw err;
					}

					const trimmedName = opts.customerName.trim();
					const spaceIdx = trimmedName.search(/\s/);
					const firstname = spaceIdx === -1 ? trimmedName : trimmedName.slice(0, spaceIdx);
					const lastname = spaceIdx === -1 ? "" : trimmedName.slice(spaceIdx).trim();

					const user = await client.createUser({
						email: customer,
						firstname,
						lastname,
						roles: ["Customer"],
					});
					console.log(`${pc.green("✔")} Customer created (id ${user.id})`);
					createdCustomerId = user.id;

					ticket = await client.createTicket(ticketParams);
				}

				if (createdCustomerId === undefined) {
					console.log(`${pc.green("✔")} Customer resolved (id ${ticket.customer_id})`);
				}
				console.log(`${pc.green("✔")} Ticket #${ticket.number} created (id ${ticket.id})`);
				console.log(pc.dim(`  zammad tickets show ${ticket.id}`));
			} catch (err) {
				const hint =
					isCustomerLookupError(err) && !opts.createCustomer
						? 'Pass --create-customer --customer-name "<name>" to create this customer.'
						: undefined;
				handleError(err, hint);
			}
		});
}
