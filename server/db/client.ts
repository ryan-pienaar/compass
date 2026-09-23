import type { PgAsyncDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

/** Any async Postgres database or transaction: services accept either. */
export type DB = PgAsyncDatabase<PgQueryResultHKT>;

export interface Database {
  db: DB;
  close: () => Promise<void>;
}

/**
 * Supabase (or any Postgres) through its connection pooler. Transaction-mode pooling
 * doesn't support prepared statements, hence `prepare: false`. Schema migrations are
 * applied separately with `pnpm db:migrate`, never on a request.
 * (Local development and tests use PGlite instead: see ./pglite.ts.)
 *
 * TLS: always encrypted; with `ca` (Supabase's CA certificate, PEM) the server's
 * certificate and host name are verified too, which production should use.
 * `sslmode=disable` in the URL turns TLS off, for a local Postgres only.
 */
export function connectPostgres(url: string, { ca, max = 5 }: { ca?: string; max?: number } = {}): Database {
  const ssl = ca ? { ca } : /[?&]sslmode=disable\b/.test(url) ? false : ("require" as const);
  const client = postgres(url, { prepare: false, max, idle_timeout: 20, connect_timeout: 10, ssl });
  const db = drizzle({ client }) as unknown as DB;
  return { db, close: () => client.end() };
}
