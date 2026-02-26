import * as clack from "@clack/prompts";
import type { Command } from "commander";
import pc from "picocolors";
import { ZammadClient } from "../client.ts";
import { getConfig } from "../config.ts";
import { handleError } from "../utils/errors.ts";

export function registerCloseCommand(program: Command): void {
	program
		.command("close <id>")
		.description("Close a ticket (set state to closed)")
		.option("-m, --message <text>", "Add a closing note")
		.option("--no-confirm", "Skip confirmation prompt")
		.action(async (id, opts) => {
			try {
				const config = getConfig();
				const client = new ZammadClient(config);
				const ticketId = Number.parseInt(id, 10);

				const ticket = await client.getTicket(ticketId);

				if (opts.confirm !== false) {
					const confirmed = await clack.confirm({
						message: `Close ticket #${ticket.number} "${ticket.title}"?`,
					});
					if (clack.isCancel(confirmed) || !confirmed) {
						clack.cancel("Cancelled.");
						process.exit(0);
					}
				}

				const updatePayload: Record<string, unknown> = { state: "closed" };
				if (opts.message) {
					updatePayload.article = {
						body: opts.message,
						type: "note",
						internal: true,
					};
				}

				await client.updateTicket(ticketId, updatePayload);
				console.log(`${pc.green("✔")} Ticket #${ticket.number} closed.`);
			} catch (err) {
				handleError(err);
			}
		});
}
