import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";
import { ZammadClient } from "../src/client.ts";
import type { ZammadConfig } from "../src/types.ts";

const testConfig: ZammadConfig = {
	url: "https://zammad.example.com",
	token: "test-token-123",
};

describe("ZammadClient", () => {
	let fetchSpy: ReturnType<typeof spyOn>;

	beforeEach(() => {
		fetchSpy = spyOn(globalThis, "fetch");
	});

	afterEach(() => {
		fetchSpy.mockRestore();
	});

	function mockResponse(body: unknown, status = 200) {
		fetchSpy.mockResolvedValueOnce(
			new Response(JSON.stringify(body), {
				status,
				headers: { "Content-Type": "application/json" },
			}),
		);
	}

	describe("listTickets", () => {
		it("should call GET /api/v1/tickets with expand=true", async () => {
			const mockTickets = [{ id: 1, number: "10001", title: "Test Ticket" }];
			mockResponse(mockTickets);

			const client = new ZammadClient(testConfig);
			const result = await client.listTickets(1, 10);

			expect(fetchSpy).toHaveBeenCalledTimes(1);
			const callUrl = fetchSpy.mock.calls[0][0] as string;
			expect(callUrl).toContain("/api/v1/tickets");
			expect(callUrl).toContain("expand=true");
			expect(callUrl).toContain("page=1");
			expect(callUrl).toContain("per_page=10");
			expect(result).toHaveLength(1);
			expect(result[0].id).toBe(1);
		});
	});

	describe("getTicket", () => {
		it("should call GET /api/v1/tickets/{id}", async () => {
			const mockTicket = { id: 42, number: "10042", title: "Specific Ticket" };
			mockResponse(mockTicket);

			const client = new ZammadClient(testConfig);
			const result = await client.getTicket(42);

			expect(result.id).toBe(42);
			const callUrl = fetchSpy.mock.calls[0][0] as string;
			expect(callUrl).toContain("/api/v1/tickets/42");
		});
	});

	describe("searchTickets", () => {
		it("should call GET /api/v1/tickets/search with query", async () => {
			mockResponse([]);

			const client = new ZammadClient(testConfig);
			await client.searchTickets("login issue");

			const callUrl = fetchSpy.mock.calls[0][0] as string;
			expect(callUrl).toContain("/api/v1/tickets/search");
			expect(callUrl).toContain("query=login+issue");
		});
	});

	describe("createArticle", () => {
		it("should POST to /api/v1/ticket_articles", async () => {
			const mockArticle = { id: 100, ticket_id: 1, body: "Reply text" };
			mockResponse(mockArticle);

			const client = new ZammadClient(testConfig);
			const result = await client.createArticle({
				ticket_id: 1,
				body: "Reply text",
			});

			expect(result.id).toBe(100);
			const callOptions = fetchSpy.mock.calls[0][1] as RequestInit;
			expect(callOptions.method).toBe("POST");
			const parsedBody = JSON.parse(callOptions.body as string);
			expect(parsedBody.ticket_id).toBe(1);
			expect(parsedBody.body).toBe("Reply text");
		});
	});

	describe("closeTicket", () => {
		it("should PUT state:closed to /api/v1/tickets/{id}", async () => {
			const mockTicket = { id: 5, state: "closed" };
			mockResponse(mockTicket);

			const client = new ZammadClient(testConfig);
			await client.closeTicket(5);

			const callUrl = fetchSpy.mock.calls[0][0] as string;
			expect(callUrl).toContain("/api/v1/tickets/5");
			const callOptions = fetchSpy.mock.calls[0][1] as RequestInit;
			expect(callOptions.method).toBe("PUT");
			const parsedBody = JSON.parse(callOptions.body as string);
			expect(parsedBody.state).toBe("closed");
		});
	});

	describe("error handling", () => {
		it("should throw ZammadApiError on non-OK response", async () => {
			fetchSpy.mockResolvedValueOnce(new Response("Unauthorized", { status: 401 }));

			const client = new ZammadClient(testConfig);
			expect(client.listTickets()).rejects.toThrow();
		});
	});

	describe("authentication header", () => {
		it("should include Token authorization header", async () => {
			mockResponse([]);

			const client = new ZammadClient(testConfig);
			await client.listTickets();

			const callOptions = fetchSpy.mock.calls[0][1] as RequestInit;
			const headers = callOptions.headers as Record<string, string>;
			expect(headers.Authorization).toBe("Token token=test-token-123");
		});
	});

	describe("base URL handling", () => {
		it("should strip trailing slashes from URL", async () => {
			mockResponse([]);

			const client = new ZammadClient({ url: "https://zammad.example.com///", token: "t" });
			await client.listTickets();

			const callUrl = fetchSpy.mock.calls[0][0] as string;
			expect(callUrl).toStartWith("https://zammad.example.com/api/v1/");
		});
	});
});
