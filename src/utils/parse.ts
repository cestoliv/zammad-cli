import { InputError } from "./errors.ts";

/**
 * Parse a CLI numeric option strictly.
 *
 * `Number.parseInt` is too forgiving for user input: "abc" yields NaN, which
 * survives `?? 1` (it is neither null nor undefined) and ends up coercing
 * `slice(NaN, NaN)` to `slice(0, 0)` — an empty result reported as "No tickets
 * found". "25abc" would silently become 25. Both are typos that deserve an
 * error, not a confident wrong answer.
 */
export function parsePositiveInt(raw: string, flag: string): number {
	const invalid = new InputError(
		`Invalid value for ${flag}: "${raw}". Expected a positive integer.`,
	);
	if (!/^\d+$/.test(raw.trim())) throw invalid;

	const value = Number.parseInt(raw, 10);
	if (!Number.isSafeInteger(value) || value < 1) throw invalid;
	return value;
}

/**
 * Convert a plain-text body to the HTML Zammad stores.
 *
 * Zammad renders article bodies as HTML, so a newline typed at the shell
 * disappears unless it becomes a <br>. Shared by `reply` and `create` so both
 * commands treat multi-line input the same way.
 */
export function toHtmlBody(body: string): string {
	return body.replace(/\n/g, "<br>\n");
}
