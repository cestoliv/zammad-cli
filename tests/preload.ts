import { mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * Redirect the credential store for the entire test run, before any test file
 * is evaluated.
 *
 * `saveConfig`/`clearConfig` write for real, so without this a test file that
 * touches them destroys the developer's actual Zammad URL and API token. Set
 * unconditionally: an inherited ZAMMAD_CONFIG_DIR could point at a real store.
 *
 * The directory is fixed rather than randomised, and wiped on the way in, so
 * each run starts clean without accumulating temp directories — `bun test` does
 * not fire `process.on("exit")`, so there is no reliable teardown hook.
 */
const suiteConfigDir = join(tmpdir(), "zammad-cli-test-store");
rmSync(suiteConfigDir, { recursive: true, force: true });
mkdirSync(suiteConfigDir, { recursive: true });

process.env.ZAMMAD_CONFIG_DIR = suiteConfigDir;
