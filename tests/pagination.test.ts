import { describe, expect, it } from "bun:test";
import type { ZammadTicket } from "../src/types.ts";
import {
	fetchAllTickets,
	resolveTickets,
	type TicketSource,
	ZAMMAD_MAX_PER_PAGE,
} from "../src/utils/pagination.ts";

function makeTicket(id: number, state = "open"): ZammadTicket {
	return { id, number: String(10000 + id), title: `Ticket ${id}`, state } as ZammadTicket;
}

interface Call {
	page: number;
	perPage: number;
}

/**
 * Fake Zammad server reproducing the behaviours that broke the real client:
 * `per_page` is capped at 100 server-side on the index AND search endpoints,
 * and the index endpoint is always ordered by id ascending regardless of any
 * sorting requested.
 *
 * `searchIndex: null` models this instance, whose search backend is down and
 * returns zero results for every query.
 */
function makeSource(
	tickets: ZammadTicket[],
	searchIndex: ZammadTicket[] | null = null,
): TicketSource & { listCalls: Call[]; searchCalls: Array<Call & { query: string }> } {
	const listCalls: Call[] = [];
	const searchCalls: Array<Call & { query: string }> = [];
	const ascending = [...tickets].sort((a, b) => a.id - b.id);
	const slicePage = <T>(rows: T[], p: number, perPage: number) => {
		const capped = Math.min(perPage, ZAMMAD_MAX_PER_PAGE);
		return rows.slice((p - 1) * capped, p * capped);
	};
	return {
		listCalls,
		searchCalls,
		async listTickets(p = 1, perPage = 50) {
			listCalls.push({ page: p, perPage });
			return slicePage(ascending, p, perPage);
		},
		async searchTickets(query, p = 1, perPage = 50) {
			searchCalls.push({ query, page: p, perPage });
			if (searchIndex === null) return [];
			return slicePage(searchIndex, p, perPage);
		},
	};
}

const manyTickets = (n: number, startId = 2) =>
	Array.from({ length: n }, (_, i) => makeTicket(i + startId));

describe("fetchAllTickets", () => {
	it("never requests more than the server-side per_page cap", async () => {
		const source = makeSource([makeTicket(1)]);

		await fetchAllTickets(source);

		expect(source.listCalls.every((c) => c.perPage <= ZAMMAD_MAX_PER_PAGE)).toBe(true);
	});

	it("pages past the per_page cap to return every ticket", async () => {
		const source = makeSource(manyTickets(137));

		const { tickets } = await fetchAllTickets(source);

		expect(tickets).toHaveLength(137);
		expect(tickets.map((t) => t.id)).toContain(138);
	});

	it("stops paging once a short page comes back", async () => {
		const source = makeSource(manyTickets(137));

		await fetchAllTickets(source);

		expect(source.listCalls).toHaveLength(2);
	});

	it("reports truncation when the page budget is exhausted", async () => {
		const source = makeSource(manyTickets(1000));

		const { tickets, truncated } = await fetchAllTickets(source, 3);

		expect(tickets).toHaveLength(300);
		expect(truncated).toBe(true);
	});

	it("does not report truncation when every ticket was fetched", async () => {
		const source = makeSource(manyTickets(137));

		const { truncated } = await fetchAllTickets(source);

		expect(truncated).toBe(false);
	});
});

describe("resolveTickets", () => {
	it("returns the newest tickets first", async () => {
		const source = makeSource([makeTicket(2), makeTicket(50), makeTicket(138)]);

		const { tickets } = await resolveTickets(source, { page: 1, perPage: 25 });

		expect(tickets.map((t) => t.id)).toEqual([138, 50, 2]);
	});

	it("returns more than the server cap when a larger page size is asked for", async () => {
		const source = makeSource(manyTickets(137));

		const { tickets } = await resolveTickets(source, { page: 1, perPage: 500 });

		expect(tickets).toHaveLength(137);
	});

	it("keeps the newest ticket visible when the page size truncates", async () => {
		const source = makeSource(manyTickets(137));

		const { tickets } = await resolveTickets(source, { page: 1, perPage: 25 });

		expect(tickets).toHaveLength(25);
		expect(tickets[0]?.id).toBe(138);
	});

	it("reports the total number of tickets, not just the page size", async () => {
		const source = makeSource(manyTickets(137));

		const { total } = await resolveTickets(source, { page: 1, perPage: 25 });

		expect(total).toBe(137);
	});

	it("slices the requested page out of the sorted list", async () => {
		const source = makeSource(manyTickets(137));

		const { tickets } = await resolveTickets(source, { page: 2, perPage: 25 });

		expect(tickets[0]?.id).toBe(113);
		expect(tickets).toHaveLength(25);
	});

	it("reports the effective page size and last page", async () => {
		const source = makeSource(manyTickets(137));

		const { perPage, lastPage } = await resolveTickets(source, { page: 1, perPage: 25 });

		expect(perPage).toBe(25);
		expect(lastPage).toBe(6);
	});

	it("falls back to sane defaults when called directly with NaN", async () => {
		// `list.ts` validates first, but this is an exported API and
		// `Math.max(1, NaN)` is NaN — which would silently yield an empty page.
		const source = makeSource(manyTickets(137));

		const { tickets, page, perPage } = await resolveTickets(source, {
			page: Number.NaN,
			perPage: Number.NaN,
		});

		expect(page).toBe(1);
		expect(perPage).toBe(25);
		expect(tickets).toHaveLength(25);
	});

	it("propagates truncation so the caller can warn", async () => {
		const source = makeSource(manyTickets(1000));

		const { truncated } = await resolveTickets(source, { page: 1, perPage: 25, maxPages: 3 });

		expect(truncated).toBe(true);
	});

	describe("when the search backend is healthy", () => {
		it("pages search results past the 100-result cap", async () => {
			const source = makeSource([], manyTickets(136));

			const { tickets, total } = await resolveTickets(source, {
				state: "open",
				page: 1,
				perPage: 500,
			});

			expect(total).toBe(136);
			expect(tickets[0]?.id).toBe(137);
		});

		it("honors --page against the full search result set", async () => {
			const source = makeSource([], manyTickets(136));

			const { tickets } = await resolveTickets(source, { state: "open", page: 2, perPage: 25 });

			expect(tickets).toHaveLength(25);
			expect(tickets[0]?.id).toBe(112);
		});

		it("quotes the state so a multi-word state is one Lucene term", async () => {
			const source = makeSource([], [makeTicket(5, "pending close")]);

			await resolveTickets(source, { state: "pending close", page: 1, perPage: 25 });

			expect(source.searchCalls[0]?.query).toBe('state.name:"pending close"');
		});

		it("does not fall back to the index endpoint", async () => {
			const source = makeSource(manyTickets(50), [makeTicket(99, "new")]);

			const { filteredLocally } = await resolveTickets(source, {
				state: "new",
				page: 1,
				perPage: 25,
			});

			expect(filteredLocally).toBe(false);
			expect(source.listCalls).toHaveLength(0);
		});
	});

	describe("when the search backend returns nothing", () => {
		it("falls back to client-side filtering", async () => {
			const source = makeSource([makeTicket(2, "closed"), makeTicket(7, "new")], null);

			const { tickets, filteredLocally } = await resolveTickets(source, {
				state: "new",
				page: 1,
				perPage: 25,
			});

			expect(tickets.map((t) => t.id)).toEqual([7]);
			expect(filteredLocally).toBe(true);
		});

		it("matches the state filter case-insensitively", async () => {
			const source = makeSource([makeTicket(7, "New")], null);

			const { tickets } = await resolveTickets(source, { state: "new", page: 1, perPage: 25 });

			expect(tickets.map((t) => t.id)).toEqual([7]);
		});

		it("confirms a genuinely empty state via the fallback", async () => {
			const source = makeSource([makeTicket(2, "closed")], null);

			const { tickets, filteredLocally } = await resolveTickets(source, {
				state: "nosuch",
				page: 1,
				perPage: 25,
			});

			expect(tickets).toHaveLength(0);
			expect(filteredLocally).toBe(true);
		});
	});
});
