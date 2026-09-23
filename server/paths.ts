import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** Repository root (one level above /server). */
export const ROOT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const MIGRATIONS_DIR = join(ROOT_DIR, "drizzle");
export const DIST_DIR = join(ROOT_DIR, "dist");

/**
 * Local development database: an in-process Postgres (PGlite) kept in ./data/pglite.
 * Safe to wipe or seed; the hosted app uses Supabase (DATABASE_URL) instead.
 */
export const LOCAL_DB_DIR = join(ROOT_DIR, "data", "pglite");
