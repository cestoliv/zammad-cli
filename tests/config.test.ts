import { afterEach, describe, expect, it } from "bun:test";
import { clearConfig, getConfig, hasConfig, saveConfig } from "../src/config.ts";

describe("config", () => {
	const originalEnv = { ...process.env };

	afterEach(() => {
		// Restore env vars
		process.env.ZAMMAD_URL = originalEnv.ZAMMAD_URL;
		process.env.ZAMMAD_TOKEN = originalEnv.ZAMMAD_TOKEN;
		if (!originalEnv.ZAMMAD_URL) delete process.env.ZAMMAD_URL;
		if (!originalEnv.ZAMMAD_TOKEN) delete process.env.ZAMMAD_TOKEN;
	});

	describe("environment variable precedence", () => {
		it("should use env vars when set", () => {
			process.env.ZAMMAD_URL = "https://env.example.com";
			process.env.ZAMMAD_TOKEN = "env-token";

			const config = getConfig();
			expect(config.url).toBe("https://env.example.com");
			expect(config.token).toBe("env-token");
		});

		it("should report configured when env vars are set", () => {
			process.env.ZAMMAD_URL = "https://env.example.com";
			process.env.ZAMMAD_TOKEN = "env-token";

			expect(hasConfig()).toBe(true);
		});
	});

	describe("getConfig", () => {
		it("should throw when not configured", () => {
			delete process.env.ZAMMAD_URL;
			delete process.env.ZAMMAD_TOKEN;
			clearConfig();

			expect(() => getConfig()).toThrow("Not configured");
		});
	});

	describe("saveConfig and clearConfig", () => {
		it("should save and retrieve config", () => {
			delete process.env.ZAMMAD_URL;
			delete process.env.ZAMMAD_TOKEN;

			saveConfig("https://saved.example.com", "saved-token");
			const config = getConfig();
			expect(config.url).toBe("https://saved.example.com");
			expect(config.token).toBe("saved-token");
		});

		it("should strip trailing slashes from URL", () => {
			delete process.env.ZAMMAD_URL;
			delete process.env.ZAMMAD_TOKEN;

			saveConfig("https://saved.example.com///", "saved-token");
			const config = getConfig();
			expect(config.url).toBe("https://saved.example.com");
		});

		it("should clear config", () => {
			delete process.env.ZAMMAD_URL;
			delete process.env.ZAMMAD_TOKEN;

			saveConfig("https://saved.example.com", "saved-token");
			clearConfig();
			expect(() => getConfig()).toThrow("Not configured");
		});
	});
});
