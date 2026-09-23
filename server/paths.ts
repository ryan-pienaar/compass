import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** Repository root (one level above /server). */
export const ROOT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const MIGRATIONS_DIR = join(ROOT_DIR, "drizzle");
export const DIST_DIR = join(ROOT_DIR, "dist");

export interface RuntimeOptions {
  dev: boolean;
  port: number;
  dbPath: string;
}

/**
 * Where your data lives.
 *  - `pnpm dev` uses ./data/dev.db inside the project (safe to wipe or seed).
 *  - `pnpm start` uses a per-user app-data folder so code changes never touch your real data:
 *      Windows: %LOCALAPPDATA%\Compass\compass.db
 *      macOS:   ~/Library/Application Support/Compass/compass.db
 *      Linux:   $XDG_DATA_HOME/compass/compass.db (or ~/.local/share/compass)
 *  - Override with the COMPASS_DB environment variable or `--db <path>`.
 */
export function defaultDbPath(dev: boolean): string {
  if (dev) return join(ROOT_DIR, "data", "dev.db");
  if (process.platform === "win32") {
    const base = process.env.LOCALAPPDATA ?? join(homedir(), "AppData", "Local");
    return join(base, "Compass", "compass.db");
  }
  if (process.platform === "darwin") return join(homedir(), "Library", "Application Support", "Compass", "compass.db");
  const base = process.env.XDG_DATA_HOME ?? join(homedir(), ".local", "share");
  return join(base, "compass", "compass.db");
}

export function backupDirFor(dbPath: string): string {
  return join(dirname(dbPath), "backups");
}
