import * as clack from "@clack/prompts";
import type { Command } from "commander";
import pc from "picocolors";
import { ZammadClient } from "../client.ts";
import { clearConfig, getConfig, hasConfig, saveConfig } from "../config.ts";

export function registerAuthCommands(parent: Command): void {
	const auth = parent.command("auth").description("Manage authentication");

	auth
		.command("login")
		.description("Configure Zammad URL and API token")
		.action(async () => {
			clack.intro(pc.bold("Zammad CLI — Login"));

			const url = await clack.text({
				message: "Zammad instance URL:",
				placeholder: "https://support.example.com",
				validate: (val) => {
					if (!val?.startsWith("http")) return "URL must start with http(s)://";
				},
			});
			if (clack.isCancel(url)) return process.exit(0);

			const token = await clack.password({
				message: "API access token:",
				validate: (val) => (!val || val.trim().length === 0 ? "Token is required" : undefined),
			});
			if (clack.isCancel(token)) return process.exit(0);

			const spinner = clack.spinner();
			spinner.start("Verifying credentials…");
			try {
				const client = new ZammadClient({ url, token });
				const user = await client.getCurrentUser();
				spinner.stop(
					`Authenticated as ${pc.cyan(`${user.firstname} ${user.lastname}`)} (${user.email})`,
				);
				saveConfig(url, token);
				clack.outro(pc.green("Configuration saved!"));
			} catch {
				spinner.stop(pc.red("Authentication failed."));
				clack.outro("Check your URL and token, then try again.");
				process.exit(1);
			}
		});

	auth
		.command("status")
		.description("Show current authentication status")
		.action(async () => {
			if (!hasConfig()) {
				console.log("Not configured. Run `zammad auth login`.");
				return;
			}
			try {
				const config = getConfig();
				const client = new ZammadClient(config);
				const user = await client.getCurrentUser();
				console.log(
					`${pc.green("✔")} Logged in as ${pc.bold(`${user.firstname} ${user.lastname}`)}`,
				);
				console.log(`  URL:   ${config.url}`);
				console.log(`  Email: ${user.email}`);
			} catch {
				console.log(pc.red("✖ Stored credentials are invalid."));
			}
		});

	auth
		.command("logout")
		.description("Remove stored credentials")
		.action(() => {
			clearConfig();
			console.log(`${pc.green("✔")} Credentials removed.`);
		});
}
