import { describe, expect, it } from "bun:test";
import { parsePositiveInt } from "../src/utils/parse.ts";

describe("parsePositiveInt", () => {
	it("parses a positive integer", () => {
		expect(parsePositiveInt("25", "--per-page")).toBe(25);
	});

	it("rejects non-numeric input instead of silently yielding NaN", () => {
		// `Number.parseInt("abc")` is NaN, which slid through `?? 1` and turned
		// into slice(0, 0) — an empty list reported as "No tickets found".
		expect(() => parsePositiveInt("abc", "--per-page")).toThrow("Invalid value for --per-page");
	});

	it("rejects zero", () => {
		expect(() => parsePositiveInt("0", "--per-page")).toThrow("positive integer");
	});

	it("rejects negative numbers", () => {
		expect(() => parsePositiveInt("-5", "--page")).toThrow("positive integer");
	});

	it("rejects a trailing-garbage number rather than truncating it", () => {
		expect(() => parsePositiveInt("25abc", "--per-page")).toThrow("Invalid value");
	});

	it("names the offending flag and value in the message", () => {
		expect(() => parsePositiveInt("abc", "--page")).toThrow('--page: "abc"');
	});
});
