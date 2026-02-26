import Table from "cli-table3";
import pc from "picocolors";
import type { ZammadArticle, ZammadTicket } from "./types.ts";

const STATE_COLORS: Record<string, (s: string) => string> = {
	new: pc.cyan,
	open: pc.green,
	"pending reminder": pc.yellow,
	"pending close": pc.yellow,
	closed: pc.gray,
	merged: pc.magenta,
};

function colorState(state: string): string {
	const colorFn = STATE_COLORS[state] ?? pc.white;
	return colorFn(state);
}

export function formatTicketTable(tickets: ZammadTicket[]): string {
	const table = new Table({
		head: [
			pc.bold("ID"),
			pc.bold("Number"),
			pc.bold("Title"),
			pc.bold("State"),
			pc.bold("Priority"),
			pc.bold("Customer"),
			pc.bold("Updated"),
		],
		colWidths: [8, 12, 36, 16, 12, 22, 14],
		wordWrap: true,
		style: { head: [], border: [] },
	});

	for (const t of tickets) {
		table.push([
			pc.dim(String(t.id)),
			t.number,
			t.title.length > 34 ? `${t.title.slice(0, 32)}…` : t.title,
			colorState(t.state ?? "unknown"),
			t.priority ?? String(t.priority_id),
			t.customer ?? String(t.customer_id),
			new Date(t.updated_at).toLocaleDateString(),
		]);
	}
	return table.toString();
}

export function formatTicketDetail(ticket: ZammadTicket): string {
	const lines = [
		`${pc.bold("Ticket")} #${ticket.number} ${pc.dim(`(ID: ${ticket.id})`)}`,
		"",
		`  ${pc.bold("Title:")}    ${ticket.title}`,
		`  ${pc.bold("State:")}    ${colorState(ticket.state ?? "unknown")}`,
		`  ${pc.bold("Priority:")} ${ticket.priority ?? String(ticket.priority_id)}`,
		`  ${pc.bold("Group:")}    ${ticket.group ?? String(ticket.group_id)}`,
		`  ${pc.bold("Owner:")}    ${ticket.owner ?? "unassigned"}`,
		`  ${pc.bold("Customer:")} ${ticket.customer ?? String(ticket.customer_id)}`,
		`  ${pc.bold("Articles:")} ${ticket.article_count}`,
		`  ${pc.bold("Created:")}  ${new Date(ticket.created_at).toLocaleString()}`,
		`  ${pc.bold("Updated:")}  ${new Date(ticket.updated_at).toLocaleString()}`,
	];
	return lines.join("\n");
}

export function formatArticle(article: ZammadArticle): string {
	const from = article.from ?? article.created_by ?? "Unknown";
	const date = new Date(article.created_at).toLocaleString();
	const internal = article.internal ? pc.yellow(" [internal]") : "";
	const type = article.type ?? "note";
	const body = stripHtml(article.body).trim();

	return [
		`${pc.bold(`#${article.id}`)} ${pc.dim(type)} from ${pc.cyan(from)}${internal}`,
		`${pc.dim(date)}`,
		"",
		body,
	].join("\n");
}

function stripHtml(html: string): string {
	return html
		.replace(/<br\s*\/?>/gi, "\n")
		.replace(/<\/p>/gi, "\n")
		.replace(/<[^>]+>/g, "")
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&nbsp;/g, " ");
}
