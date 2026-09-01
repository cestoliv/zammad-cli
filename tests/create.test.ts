import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";
import { Command } from "commander";
import { ZammadClient } from "../src/client.ts";
import { registerCreateCommand } from "../src/commands/create.ts";
import { ZammadApiError } from "../src/utils/errors.ts";

// Provide config via env vars so getConfig() doesn't throw
process.env.ZAMMAD_URL = "https://zammad.example.com";
process.env.ZAMMAD_TOKEN = "test-token";

describe("create command", () => {
	let createTicketSpy: ReturnType<typeof spyOn>;
	let createUserSpy: ReturnType<typeof spyOn>;
	let exitSpy: ReturnType<typeof spyOn>;
	let errorSpy: ReturnType<typeof spyOn>;
	let logSpy: ReturnType<typeof spyOn>;

	beforeEach(() => {
		createTicketSpy = spyOn(ZammadClient.prototype, "createTicket").mockResolvedValue({
			id: 1,
			number: "10001",
			customer_id: 7,
		} as never);
		createUserSpy = spyOn(ZammadClient.prototype, "createUser");
		exitSpy = spyOn(process, "exit").mockImplementation((code?: number) => {
			throw new Error(`process.exit(${code})`);
		}) as never;
		errorSpy = spyOn(console, "error").mockImplementation(() => {});
		logSpy = spyOn(console, "log").mockImplementation(() => {});
	});

	afterEach(() => {
		createTicketSpy.mockRestore();
		createUserSpy.mockRestore();
		exitSpy.mockRestore();
		errorSpy.mockRestore();
		logSpy.mockRestore();
	});

	async function runCreate(args: string[]) {
		const program = new Command();
		program.exitOverride();
		registerCreateCommand(program);
		await program.parseAsync(["node", "zammad", ...args]);
	}

	it("sends documented defaults on a minimal invocation", async () => {
		await runCreate(["create", "-t", "T", "-c", "a@b.com", "hello"]);

		expect(createTicketSpy).toHaveBeenCalledTimes(1);
		const params = createTicketSpy.mock.calls[0][0] as Record<string, unknown>;
		expect(params).toMatchObject({
			title: "T",
			group: "Users",
			customer: "a@b.com",
			state: "new",
			article: {
				subject: "T",
				body: "hello",
				type: "web",
				sender: "Customer",
				internal: false,
				content_type: "text/html",
			},
		});
	});

	it("converts \\n to <br>\\n in the article body", async () => {
		await runCreate(["create", "-t", "T", "-c", "a@b.com", "line1\nline2"]);

		const params = createTicketSpy.mock.calls[0][0] as { article: { body: string } };
		expect(params.article.body).toBe("line1<br>\nline2");
	});

	it("lets flags override every default", async () => {
		await runCreate([
			"create",
			"-t",
			"T",
			"-c",
			"a@b.com",
			"-g",
			"Support",
			"-s",
			"open",
			"--type",
			"email",
			"--sender",
			"Agent",
			"--subject",
			"Custom subject",
			"-i",
			"hello",
		]);

		const params = createTicketSpy.mock.calls[0][0] as Record<string, unknown>;
		expect(params).toMatchObject({
			group: "Support",
			state: "open",
			article: {
				subject: "Custom subject",
				type: "email",
				sender: "Agent",
				internal: true,
			},
		});
	});

	it("rejects an explicit empty-string positional without prompting or calling createTicket", async () => {
		await expect(runCreate(["create", "-t", "T", "-c", "a@b.com", ""])).rejects.toThrow();

		expect(exitSpy).toHaveBeenCalledWith(1);
		expect(createTicketSpy).not.toHaveBeenCalled();
		expect(errorSpy.mock.calls[0][0]).toContain("Message cannot be empty.");
	});

	it("rejects a missing --title without calling createTicket", async () => {
		await expect(runCreate(["create", "-c", "a@b.com", "hello"])).rejects.toThrow();

		expect(exitSpy).toHaveBeenCalledWith(1);
		expect(createTicketSpy).not.toHaveBeenCalled();
		expect(errorSpy.mock.calls[0][0]).toContain("Missing required option --title.");
	});

	it("rejects a missing --customer without calling createTicket", async () => {
		await expect(runCreate(["create", "-t", "T", "hello"])).rejects.toThrow();

		expect(exitSpy).toHaveBeenCalledWith(1);
		expect(createTicketSpy).not.toHaveBeenCalled();
		expect(errorSpy.mock.calls[0][0]).toContain("Missing required option --customer.");
	});

	it("rejects a malformed customer email without calling createTicket", async () => {
		await expect(runCreate(["create", "-t", "T", "-c", "not-an-email", "hello"])).rejects.toThrow();

		expect(exitSpy).toHaveBeenCalledWith(1);
		expect(createTicketSpy).not.toHaveBeenCalled();
		expect(errorSpy.mock.calls[0][0]).toContain('Invalid customer email: "not-an-email".');
	});

	it("rejects an invalid --type without calling createTicket", async () => {
		await expect(
			runCreate(["create", "-t", "T", "-c", "a@b.com", "--type", "carrier-pigeon", "hello"]),
		).rejects.toThrow();

		expect(exitSpy).toHaveBeenCalledWith(1);
		expect(createTicketSpy).not.toHaveBeenCalled();
		expect(errorSpy.mock.calls[0][0]).toContain(
			'Invalid value for --type: "carrier-pigeon". Expected one of: note, email, phone, web.',
		);
	});

	it("rejects an invalid --sender without calling createTicket", async () => {
		await expect(
			runCreate(["create", "-t", "T", "-c", "a@b.com", "--sender", "Robot", "hello"]),
		).rejects.toThrow();

		expect(exitSpy).toHaveBeenCalledWith(1);
		expect(createTicketSpy).not.toHaveBeenCalled();
		expect(errorSpy.mock.calls[0][0]).toContain(
			'Invalid value for --sender: "Robot". Expected one of: Customer, Agent, System.',
		);
	});

	it("exits 1 and reports the API error on failure", async () => {
		createTicketSpy.mockRestore();
		createTicketSpy = spyOn(ZammadClient.prototype, "createTicket").mockRejectedValue(
			new ZammadApiError(422, "Group could not be found", "/api/v1/tickets"),
		);

		await expect(runCreate(["create", "-t", "T", "-c", "a@b.com", "hello"])).rejects.toThrow();

		expect(exitSpy).toHaveBeenCalledWith(1);
		expect(errorSpy.mock.calls[0][0]).toContain("Group could not be found");
	});

	it("creates the customer and retries once when --create-customer is set", async () => {
		createTicketSpy.mockRestore();
		createTicketSpy = spyOn(ZammadClient.prototype, "createTicket")
			.mockRejectedValueOnce(
				new ZammadApiError(
					422,
					"No lookup value found for 'customer': \"a@b.com\"",
					"/api/v1/tickets",
				),
			)
			.mockResolvedValueOnce({ id: 91, number: "10042", customer_id: 42 } as never);
		createUserSpy.mockResolvedValue({ id: 42 } as never);

		await runCreate([
			"create",
			"-t",
			"T",
			"-c",
			"a@b.com",
			"--create-customer",
			"--customer-name",
			"Pascal Squale",
			"hello",
		]);

		expect(createUserSpy).toHaveBeenCalledTimes(1);
		expect(createUserSpy.mock.calls[0][0]).toEqual({
			email: "a@b.com",
			firstname: "Pascal",
			lastname: "Squale",
			roles: ["Customer"],
		});
		expect(createTicketSpy).toHaveBeenCalledTimes(2);
		const expectedTicketParams = {
			title: "T",
			group: "Users",
			customer: "a@b.com",
			state: "new",
			article: {
				subject: "T",
				body: "hello",
				type: "web",
				sender: "Customer",
				internal: false,
				content_type: "text/html",
			},
		};
		expect(createTicketSpy.mock.calls[0][0]).toEqual(expectedTicketParams);
		expect(createTicketSpy.mock.calls[1][0]).toEqual(expectedTicketParams);
		expect(
			logSpy.mock.calls.some((call: unknown[]) =>
				String(call[0]).includes("Customer created (id 42)"),
			),
		).toBe(true);
	});

	it("does not call createUser when the customer already exists", async () => {
		await runCreate(["create", "-t", "T", "-c", "a@b.com", "hello"]);

		expect(createTicketSpy).toHaveBeenCalledTimes(1);
		expect(createUserSpy).not.toHaveBeenCalled();
		const stdoutLines = logSpy.mock.calls.map((call: unknown[]) => String(call[0]));
		expect(stdoutLines).toEqual([
			expect.stringContaining("Customer resolved (id 7)"),
			expect.stringContaining("Ticket #10001 created (id 1)"),
			expect.stringContaining("zammad tickets show 1"),
		]);
	});

	it("rejects --create-customer without --customer-name without calling any API", async () => {
		await expect(
			runCreate(["create", "-t", "T", "-c", "a@b.com", "--create-customer", "hello"]),
		).rejects.toThrow();

		expect(exitSpy).toHaveBeenCalledWith(1);
		expect(createTicketSpy).not.toHaveBeenCalled();
		expect(createUserSpy).not.toHaveBeenCalled();
		expect(errorSpy.mock.calls[0][0]).toContain(
			"Missing required option --customer-name when using --create-customer.",
		);
	});

	it("rejects --customer-name without --create-customer without calling any API", async () => {
		await expect(
			runCreate([
				"create",
				"-t",
				"T",
				"-c",
				"a@b.com",
				"--customer-name",
				"Pascal Squale",
				"hello",
			]),
		).rejects.toThrow();

		expect(exitSpy).toHaveBeenCalledWith(1);
		expect(createTicketSpy).not.toHaveBeenCalled();
		expect(createUserSpy).not.toHaveBeenCalled();
		expect(errorSpy.mock.calls[0][0]).toContain("--customer-name requires --create-customer.");
	});

	it("splits a single-word --customer-name into firstname only", async () => {
		createTicketSpy.mockRestore();
		createTicketSpy = spyOn(ZammadClient.prototype, "createTicket")
			.mockRejectedValueOnce(
				new ZammadApiError(
					422,
					"No lookup value found for 'customer': \"a@b.com\"",
					"/api/v1/tickets",
				),
			)
			.mockResolvedValueOnce({ id: 91, number: "10042", customer_id: 42 } as never);
		createUserSpy.mockResolvedValue({ id: 42 } as never);

		await runCreate([
			"create",
			"-t",
			"T",
			"-c",
			"a@b.com",
			"--create-customer",
			"--customer-name",
			"Pascal",
			"hello",
		]);

		expect(createUserSpy.mock.calls[0][0]).toEqual({
			email: "a@b.com",
			firstname: "Pascal",
			lastname: "",
			roles: ["Customer"],
		});
	});

	it("exits 1 on a duplicate-email createUser failure without retrying the ticket", async () => {
		createTicketSpy.mockRestore();
		createTicketSpy = spyOn(ZammadClient.prototype, "createTicket").mockRejectedValueOnce(
			new ZammadApiError(
				422,
				"No lookup value found for 'customer': \"a@b.com\"",
				"/api/v1/tickets",
			),
		);
		createUserSpy.mockRejectedValue(
			new ZammadApiError(422, "Email address is already in use", "/api/v1/users"),
		);

		await expect(
			runCreate([
				"create",
				"-t",
				"T",
				"-c",
				"a@b.com",
				"--create-customer",
				"--customer-name",
				"Pascal Squale",
				"hello",
			]),
		).rejects.toThrow();

		expect(exitSpy).toHaveBeenCalledWith(1);
		expect(createTicketSpy).toHaveBeenCalledTimes(1);
		expect(errorSpy.mock.calls[0][0]).toContain("Email address is already in use");
	});

	it("hints at --create-customer on a lookup error without it", async () => {
		createTicketSpy.mockRestore();
		createTicketSpy = spyOn(ZammadClient.prototype, "createTicket").mockRejectedValue(
			new ZammadApiError(
				422,
				"No lookup value found for 'customer': \"a@b.com\"",
				"/api/v1/tickets",
			),
		);

		await expect(runCreate(["create", "-t", "T", "-c", "a@b.com", "hello"])).rejects.toThrow();

		expect(exitSpy).toHaveBeenCalledWith(1);
		expect(createUserSpy).not.toHaveBeenCalled();
		const stderrOutput = errorSpy.mock.calls.map((call: unknown[]) => String(call[0])).join("\n");
		expect(stderrOutput).toContain("No lookup value found for 'customer'");
		expect(stderrOutput).toContain("--create-customer");
	});
});

describe("create command - no token leak", () => {
	let fetchSpy: ReturnType<typeof spyOn>;

	beforeEach(() => {
		fetchSpy = spyOn(globalThis, "fetch");
	});

	afterEach(() => {
		fetchSpy.mockRestore();
	});

	it("never includes the token in a thrown ZammadApiError", async () => {
		const token = "super-secret-token-xyz";
		fetchSpy.mockResolvedValueOnce(
			new Response("Unauthorized", {
				status: 401,
				headers: { "Content-Type": "text/plain" },
			}),
		);

		const client = new ZammadClient({ url: "https://zammad.example.com", token });

		let caught: unknown;
		try {
			await client.createTicket({
				title: "T",
				group: "Users",
				customer: "a@b.com",
				article: { body: "hello" },
			});
		} catch (err) {
			caught = err;
		}

		expect(caught).toBeInstanceOf(ZammadApiError);
		const error = caught as ZammadApiError;
		expect(error.message).not.toContain(token);
		expect(error.stack ?? "").not.toContain(token);
	});
});
