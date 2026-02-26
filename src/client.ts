import type {
	CreateArticleParams,
	UpdateTicketParams,
	ZammadArticle,
	ZammadConfig,
	ZammadTicket,
	ZammadTicketState,
	ZammadUser,
} from "./types.ts";
import { ZammadApiError } from "./utils/errors.ts";

export class ZammadClient {
	private baseUrl: string;
	private token: string;

	constructor(config: ZammadConfig) {
		this.baseUrl = config.url.replace(/\/+$/, "");
		this.token = config.token;
	}

	private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
		const url = `${this.baseUrl}${path}`;
		const headers: Record<string, string> = {
			Authorization: `Token token=${this.token}`,
			"Content-Type": "application/json",
			...((options.headers as Record<string, string>) ?? {}),
		};

		const response = await fetch(url, { ...options, headers });

		if (!response.ok) {
			const body = await response.text();
			let message: string;
			try {
				const json = JSON.parse(body);
				message = json.error ?? json.message ?? body;
			} catch {
				message = body;
			}
			throw new ZammadApiError(response.status, message, path);
		}

		return response.json() as Promise<T>;
	}

	// ── Tickets ──────────────────────────────────────────────

	async listTickets(page = 1, perPage = 50): Promise<ZammadTicket[]> {
		const params = new URLSearchParams({
			page: String(page),
			per_page: String(perPage),
			expand: "true",
		});
		return this.request<ZammadTicket[]>(`/api/v1/tickets?${params}`);
	}

	async getTicket(id: number): Promise<ZammadTicket> {
		return this.request<ZammadTicket>(`/api/v1/tickets/${id}?expand=true`);
	}

	async searchTickets(query: string, page = 1, perPage = 50): Promise<ZammadTicket[]> {
		const params = new URLSearchParams({
			query,
			page: String(page),
			per_page: String(perPage),
			expand: "true",
		});
		return this.request<ZammadTicket[]>(`/api/v1/tickets/search?${params}`);
	}

	async updateTicket(id: number, params: UpdateTicketParams): Promise<ZammadTicket> {
		return this.request<ZammadTicket>(`/api/v1/tickets/${id}`, {
			method: "PUT",
			body: JSON.stringify(params),
		});
	}

	async closeTicket(id: number): Promise<ZammadTicket> {
		return this.updateTicket(id, { state: "closed" });
	}

	// ── Articles ─────────────────────────────────────────────

	async getArticles(ticketId: number): Promise<ZammadArticle[]> {
		return this.request<ZammadArticle[]>(
			`/api/v1/ticket_articles/by_ticket/${ticketId}?expand=true`,
		);
	}

	async createArticle(params: CreateArticleParams): Promise<ZammadArticle> {
		return this.request<ZammadArticle>("/api/v1/ticket_articles", {
			method: "POST",
			body: JSON.stringify({
				content_type: "text/html",
				type: "note",
				internal: false,
				sender: "Agent",
				...params,
			}),
		});
	}

	// ── Users & States ───────────────────────────────────────

	async getCurrentUser(): Promise<ZammadUser> {
		return this.request<ZammadUser>("/api/v1/users/me");
	}

	async getTicketStates(): Promise<ZammadTicketState[]> {
		return this.request<ZammadTicketState[]>("/api/v1/ticket_states");
	}
}
