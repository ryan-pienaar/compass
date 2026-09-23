import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { MIGRATIONS_DIR } from "../paths.ts";
import type { Database, DB } from "./client.ts";

/**
 * In-process Postgres (PGlite) for local development (a folder) and tests (in memory,
 * when `dataDir` is omitted). Same schema and migrations as Supabase; applied on open.
 * Kept apart from ./client.ts so the deployed function never bundles it.
 */
export async function openPglite(dataDir?: string): Promise<Database> {
  const client = new PGlite(dataDir);
  const db = drizzle({ client });
  await migrate(db, { migrationsFolder: MIGRATIONS_DIR });
  return { db: db as unknown as DB, close: () => client.close() };
}
