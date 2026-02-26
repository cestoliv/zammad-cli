import pc from "picocolors";

export class ZammadApiError extends Error {
	constructor(
		public status: number,
		public detail: string,
		public path: string,
	) {
		super(`Zammad API error ${status} on ${path}: ${detail}`);
		this.name = "ZammadApiError";
	}
}

export class ConfigError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "ConfigError";
	}
}

export function handleError(error: unknown): never {
	if (error instanceof ZammadApiError) {
		if (error.status === 401) {
			console.error(pc.red("Authentication failed. Run `zammad auth login` to reconfigure."));
		} else if (error.status === 403) {
			console.error(pc.red("Permission denied. Your token may lack the required scope."));
		} else if (error.status === 404) {
			console.error(pc.red(`Not found: ${error.detail}`));
		} else {
			console.error(pc.red(`API error (${error.status}): ${error.detail}`));
		}
	} else if (error instanceof ConfigError) {
		console.error(pc.red(error.message));
	} else if (error instanceof Error) {
		console.error(pc.red(error.message));
	} else {
		console.error(pc.red("An unexpected error occurred."));
	}
	process.exit(1);
}
