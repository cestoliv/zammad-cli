import type { ZammadTicket } from "../types.ts";

/**
 * Zammad clamps `per_page` to 100 on both /api/v1/tickets and
 * /api/v1/tickets/search. Asking for more is not an error — the extra tickets
 * are silently dropped, and since the index endpoint is always ordered by id
 * ascending (it ignores `sort_by`/`order_by`), the ones dropped are the newest.
 */
export const ZAMMAD_MAX_PER_PAGE = 100;

/** Upper bound on requests per command, so a misbehaving server cannot loop forever. */
export const DEFAULT_MAX_PAGES = 50;

/** The subset of ZammadClient these helpers need, so they can be tested directly. */
export interface TicketSource {
	listTickets(page?: number, perPage?: number): Promise<ZammadTicket[]>;
	searchTickets(query: string, page?: number, perPage?: number): Promise<ZammadTicket[]>;
}

export interface PagedResult {
	tickets: ZammadTicket[];
	/** True when the page budget ran out before the server ran out of tickets. */
	truncated: boolean;
}

export interface ResolveTicketsOptions {
	state?: string;
	page?: number;
	perPage?: number;
	maxPages?: number;
}

export interface ResolvedTickets {
	/** The requested page, newest first. */
	tickets: ZammadTicket[];
	/** How many tickets matched in total, before paging. */
	total: number;
	page: number;
	/** The page size actually applied, after clamping. */
	perPage: number;
	lastPage: number;
	/** True when the state filter was applied client-side because search returned nothing. */
	filteredLocally: boolean;
	/** True when results are incomplete because the page budget was exhausted. */
	truncated: boolean;
}

async function fetchEveryPage(
	fetchPage: (page: number) => Promise<ZammadTicket[]>,
	maxPages: number,
): Promise<PagedResult> {
	const tickets: ZammadTicket[] = [];
	for (let page = 1; page <= maxPages; page++) {
		const batch = await fetchPage(page);
		tickets.push(...batch);
		// A short page means the server has nothing left to give.
		if (batch.length < ZAMMAD_MAX_PER_PAGE) return { tickets, truncated: false };
	}
	return { tickets, truncated: true };
}

export async function fetchAllTickets(
	client: TicketSource,
	maxPages = DEFAULT_MAX_PAGES,
): Promise<PagedResult> {
	return fetchEveryPage((page) => client.listTickets(page, ZAMMAD_MAX_PER_PAGE), maxPages);
}

export async function searchAllTickets(
	client: TicketSource,
	query: string,
	maxPages = DEFAULT_MAX_PAGES,
): Promise<PagedResult> {
	return fetchEveryPage((page) => client.searchTickets(query, page, ZAMMAD_MAX_PER_PAGE), maxPages);
}

export function newestFirst(tickets: ZammadTicket[]): ZammadTicket[] {
	return [...tickets].sort((a, b) => b.id - a.id);
}

/** Quote a value so a multi-word state stays a single Lucene term. */
function luceneTerm(value: string): string {
	return `"${value.replace(/(["\\])/g, "\\$1")}"`;
}

/**
 * Fetch tickets for display, working around two Zammad behaviours: the
 * `per_page` cap (worked around by paging every endpoint) and a search backend
 * that may be unavailable (worked around by filtering client-side).
 */
export async function resolveTickets(
	client: TicketSource,
	opts: ResolveTicketsOptions = {},
): Promise<ResolvedTickets> {
	// `??` does not catch NaN, and `Math.max(1, NaN)` is NaN — which would slice
	// an empty page out of a full result set. Callers should validate first
	// (see parsePositiveInt), but this is exported API, so guard here too.
	const positive = (value: number | undefined, fallback: number) =>
		Number.isFinite(value) ? Math.max(1, Math.floor(value as number)) : fallback;

	const page = positive(opts.page, 1);
	const perPage = positive(opts.perPage, 25);
	const maxPages = positive(opts.maxPages, DEFAULT_MAX_PAGES);

	let matched: ZammadTicket[];
	let truncated: boolean;
	let filteredLocally = false;

	if (opts.state) {
		const searched = await searchAllTickets(
			client,
			`state.name:${luceneTerm(opts.state)}`,
			maxPages,
		);
		if (searched.tickets.length > 0) {
			({ tickets: matched, truncated } = searched);
		} else {
			// Either there genuinely are no such tickets or the search index is
			// down — both look identical over the API. Re-check against the index
			// endpoint, which does not depend on Elasticsearch, so the answer is
			// authoritative either way.
			filteredLocally = true;
			const all = await fetchAllTickets(client, maxPages);
			truncated = all.truncated;
			const wanted = opts.state.toLowerCase();
			matched = all.tickets.filter((t) => t.state?.toLowerCase() === wanted);
		}
	} else {
		({ tickets: matched, truncated } = await fetchAllTickets(client, maxPages));
	}

	const sorted = newestFirst(matched);
	return {
		tickets: sorted.slice((page - 1) * perPage, page * perPage),
		total: sorted.length,
		page,
		perPage,
		lastPage: Math.max(1, Math.ceil(sorted.length / perPage)),
		filteredLocally,
		truncated,
	};
}
