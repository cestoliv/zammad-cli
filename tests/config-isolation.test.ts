import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { clearConfig, getConfigDir, saveConfig } from "../src/config.ts";

/**
 * The config tests used to run against the real Conf store, so `bun test`
 * overwrote and cleared the developer's actual Zammad credentials. The store
 * must be redirectable so the suite can never touch the real file.
 */
/**
 * Per-file opt-in is not enough: the next test file to import saveConfig and
 * forget the beforeAll dance would silently destroy real credentials again.
 * A preload redirects the store once for the whole run.
 */
describe("suite-wide config protection", () => {
	it("redirects the config store for every test file via preload", () => {
		expect(process.env.ZAMMAD_CONFIG_DIR).toBeTruthy();
	});

	it("never resolves the store to the real user config directory", () => {
		// Assert the store IS under the temp dir rather than that it is not under
		// some OS-specific config path: the real location differs per platform
		// (~/Library/Preferences on macOS, ~/.config on Linux, AppData on
		// Windows), so a negative check would pass vacuously in CI.
		expect(getConfigDir().startsWith(tmpdir())).toBe(true);
	});
});

describe("config store isolation", () => {
	let dir: string;
	const originalDir = process.env.ZAMMAD_CONFIG_DIR;

	beforeEach(() => {
		dir = mkdtempSync(join(tmpdir(), "zammad-cli-test-"));
		process.env.ZAMMAD_CONFIG_DIR = dir;
	});

	afterEach(() => {
		if (originalDir === undefined) delete process.env.ZAMMAD_CONFIG_DIR;
		else process.env.ZAMMAD_CONFIG_DIR = originalDir;
		rmSync(dir, { recursive: true, force: true });
	});

	it("writes credentials under ZAMMAD_CONFIG_DIR", () => {
		// Assert the redirect BEFORE writing: on a regression to an eager
		// module-level store this test must fail without having written to the
		// developer's real credential file.
		expect(getConfigDir()).toBe(dir);

		saveConfig("https://tmp.example.com", "tmp-token");

		const file = join(dir, "config.json");
		expect(existsSync(file)).toBe(true);
		expect(readFileSync(file, "utf8")).toContain("tmp-token");
	});

	it("reports the overridden directory as the active config location", () => {
		expect(getConfigDir()).toBe(dir);
	});

	it("clears only the overridden store", () => {
		saveConfig("https://tmp.example.com", "tmp-token");
		clearConfig();

		expect(readFileSync(join(dir, "config.json"), "utf8")).not.toContain("tmp-token");
	});

	it("picks up a change of ZAMMAD_CONFIG_DIR instead of caching the first store", () => {
		saveConfig("https://first.example.com", "first-token");
		const second = mkdtempSync(join(tmpdir(), "zammad-cli-test-"));
		process.env.ZAMMAD_CONFIG_DIR = second;

		saveConfig("https://second.example.com", "second-token");

		expect(readFileSync(join(second, "config.json"), "utf8")).toContain("second-token");
		expect(readFileSync(join(dir, "config.json"), "utf8")).toContain("first-token");
		rmSync(second, { recursive: true, force: true });
	});
});
