import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import { Command } from "commander";
import { ZammadClient } from "../src/client.ts";
import { registerReplyCommand } from "../src/commands/reply.ts";

// Provide config via env vars so getConfig() doesn't throw
process.env.ZAMMAD_URL = "https://zammad.example.com";
process.env.ZAMMAD_TOKEN = "test-token";

describe("reply command - newline to <br> conversion", () => {
	let createArticleSpy: ReturnType<typeof spyOn>;

	beforeEach(() => {
		createArticleSpy = spyOn(ZammadClient.prototype, "createArticle").mockResolvedValue({
			id: 1,
			ticket_id: 42,
			body: "",
		} as never);
	});

	afterEach(() => {
		createArticleSpy.mockRestore();
	});

	async function runReply(args: string[]) {
		const program = new Command();
		program.exitOverride();
		registerReplyCommand(program);
		await program.parseAsync(["node", "zammad", ...args]);
	}

	it("should convert \\n to <br>\\n in body before calling createArticle", async () => {
		await runReply(["reply", "42", "line1\nline2"]);

		expect(createArticleSpy).toHaveBeenCalledTimes(1);
		const { body } = createArticleSpy.mock.calls[0][0] as { body: string };
		expect(body).toBe("line1<br>\nline2");
	});

	it("should convert multiple \\n to <br>\\n", async () => {
		await runReply(["reply", "42", "a\nb\nc"]);

		const { body } = createArticleSpy.mock.calls[0][0] as { body: string };
		expect(body).toBe("a<br>\nb<br>\nc");
	});

	it("should not alter body when no \\n present", async () => {
		await runReply(["reply", "42", "single line"]);

		const { body } = createArticleSpy.mock.calls[0][0] as { body: string };
		expect(body).toBe("single line");
	});
});
