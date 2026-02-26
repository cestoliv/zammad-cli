import type { ZammadClient } from "../client.ts";
import type { ZammadTicket } from "../types.ts";

export async function fetchAllTickets(
	client: ZammadClient,
	perPage = 50,
	maxPages = 20,
): Promise<ZammadTicket[]> {
	const all: ZammadTicket[] = [];
	for (let page = 1; page <= maxPages; page++) {
		const batch = await client.listTickets(page, perPage);
		all.push(...batch);
		if (batch.length < perPage) break;
	}
	return all;
}
