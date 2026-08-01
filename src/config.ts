import { dirname } from "node:path";
import Conf from "conf";
import type { ZammadConfig } from "./types.ts";
import { ConfigError } from "./utils/errors.ts";

interface ConfigShape {
	url: string;
	token: string;
}

const schema = {
	url: { type: "string" as const },
	token: { type: "string" as const },
};

let cached: { dir: string | undefined; store: Conf<ConfigShape> } | undefined;

/**
 * Resolve the store lazily so `ZAMMAD_CONFIG_DIR` is honoured, and re-resolve
 * whenever it changes. A module-level store bound eagerly to the real user
 * config is what let the test suite clear real credentials.
 */
function getStore(): Conf<ConfigShape> {
	const dir = process.env.ZAMMAD_CONFIG_DIR || undefined;
	if (!cached || cached.dir !== dir) {
		cached = {
			dir,
			store: new Conf<ConfigShape>({ projectName: "zammad-cli", cwd: dir, schema }),
		};
	}
	return cached.store;
}

/** Directory the credentials are read from and written to. */
export function getConfigDir(): string {
	return dirname(getStore().path);
}

export function getConfig(): ZammadConfig {
	const store = getStore();
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
	const store = getStore();
	store.set("url", url.replace(/\/+$/, ""));
	store.set("token", token);
}

export function clearConfig(): void {
	getStore().clear();
}

export function hasConfig(): boolean {
	const store = getStore();
	return !!(
		(process.env.ZAMMAD_URL && process.env.ZAMMAD_TOKEN) ||
		(store.get("url") && store.get("token"))
	);
}
