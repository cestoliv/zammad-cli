import Conf from "conf";
import type { ZammadConfig } from "./types.ts";
import { ConfigError } from "./utils/errors.ts";

const store = new Conf<{ url: string; token: string }>({
	projectName: "zammad-cli",
	schema: {
		url: { type: "string" as const },
		token: { type: "string" as const },
	},
});

export function getConfig(): ZammadConfig {
	const url = process.env.ZAMMAD_URL ?? store.get("url");
	const token = process.env.ZAMMAD_TOKEN ?? store.get("token");

	if (!url || !token) {
		throw new ConfigError(
			"Not configured. Run `zammad auth login` or set ZAMMAD_URL and ZAMMAD_TOKEN.",
		);
	}
	return { url, token };
}

export function saveConfig(url: string, token: string): void {
	store.set("url", url.replace(/\/+$/, ""));
	store.set("token", token);
}

export function clearConfig(): void {
	store.clear();
}

export function hasConfig(): boolean {
	return !!(
		(process.env.ZAMMAD_URL && process.env.ZAMMAD_TOKEN) ||
		(store.get("url") && store.get("token"))
	);
}
