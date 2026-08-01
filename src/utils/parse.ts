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
