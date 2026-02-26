import { describe, expect, it } from "bun:test";
import { formatArticle, formatTicketDetail, formatTicketTable } from "../src/format.ts";
import type { ZammadArticle, ZammadTicket } from "../src/types.ts";

function makeTicket(overrides: Partial<ZammadTicket> = {}): ZammadTicket {
	return {
		id: 1,
		number: "10001",
		title: "Test ticket",
		group_id: 1,
		priority_id: 2,
		state_id: 2,
		organization_id: null,
		owner_id: 1,
		customer_id: 2,
		note: null,
		article_count: 1,
		escalation_at: null,
		pending_time: null,
		type: null,
		time_unit: null,
		first_response_at: null,
		first_response_escalation_at: null,
		first_response_in_min: null,
		first_response_diff_in_min: null,
		close_at: null,
		close_escalation_at: null,
		close_in_min: null,
		close_diff_in_min: null,
		update_escalation_at: null,
		update_in_min: null,
		update_diff_in_min: null,
		last_close_at: null,
		last_contact_at: null,
		last_contact_agent_at: null,
		last_contact_customer_at: null,
		last_owner_update_at: null,
		create_article_type_id: 1,
		create_article_sender_id: 1,
		preferences: {},
		created_by_id: 1,
		updated_by_id: 1,
		created_at: "2025-01-01T00:00:00Z",
		updated_at: "2025-01-02T12:00:00Z",
		state: "open",
		priority: "2 normal",
		customer: "John Doe",
		...overrides,
	};
}

function makeArticle(overrides: Partial<ZammadArticle> = {}): ZammadArticle {
	return {
		id: 1,
		ticket_id: 1,
		type_id: 1,
		sender_id: 1,
		from: "agent@example.com",
		to: "customer@example.com",
		cc: null,
		subject: "Re: Test",
		reply_to: null,
		message_id: null,
		content_type: "text/html",
		body: "<p>Hello there</p>",
		internal: false,
		preferences: {},
		origin_by_id: null,
		created_by_id: 1,
		updated_by_id: 1,
		created_at: "2025-01-01T00:00:00Z",
		updated_at: "2025-01-01T00:00:00Z",
		attachments: [],
		type: "email",
		sender: "Agent",
		created_by: "Admin",
		...overrides,
	};
}

describe("formatTicketTable", () => {
	it("should contain ticket number and title", () => {
		const output = formatTicketTable([makeTicket()]);
		expect(output).toContain("10001");
		expect(output).toContain("Test ticket");
	});

	it("should handle empty array", () => {
		const output = formatTicketTable([]);
		expect(typeof output).toBe("string");
	});

	it("should truncate long titles", () => {
		const longTitle = "A".repeat(50);
		const output = formatTicketTable([makeTicket({ title: longTitle })]);
		expect(output).toContain("…");
	});

	it("should display multiple tickets", () => {
		const tickets = [
			makeTicket({ id: 1, number: "10001", title: "First" }),
			makeTicket({ id: 2, number: "10002", title: "Second" }),
		];
		const output = formatTicketTable(tickets);
		expect(output).toContain("10001");
		expect(output).toContain("10002");
	});
});

describe("formatTicketDetail", () => {
	it("should include ticket number and title", () => {
		const output = formatTicketDetail(makeTicket());
		expect(output).toContain("#10001");
		expect(output).toContain("Test ticket");
	});

	it("should show owner as unassigned when not expanded", () => {
		const output = formatTicketDetail(makeTicket({ owner: undefined }));
		expect(output).toContain("unassigned");
	});

	it("should show customer name when expanded", () => {
		const output = formatTicketDetail(makeTicket({ customer: "Jane Smith" }));
		expect(output).toContain("Jane Smith");
	});
});

describe("formatArticle", () => {
	it("should strip HTML tags from body", () => {
		const output = formatArticle(makeArticle({ body: "<p>Hello <b>world</b></p>" }));
		expect(output).toContain("Hello world");
		expect(output).not.toContain("<p>");
		expect(output).not.toContain("<b>");
	});

	it("should show [internal] for internal articles", () => {
		const output = formatArticle(makeArticle({ internal: true }));
		expect(output).toContain("[internal]");
	});

	it("should not show [internal] for public articles", () => {
		const output = formatArticle(makeArticle({ internal: false }));
		expect(output).not.toContain("[internal]");
	});

	it("should decode HTML entities", () => {
		const output = formatArticle(makeArticle({ body: "&amp; &lt; &gt; &quot; &#39;" }));
		expect(output).toContain("& < > \" '");
	});
});
