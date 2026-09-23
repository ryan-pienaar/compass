import { existsSync } from "node:fs";
import { defineConfig } from "drizzle-kit";

/*
 * `pnpm db:generate` writes SQL migrations from server/db/schema.ts (no database needed).
 * `pnpm db:migrate` and `pnpm db:studio` use DATABASE_MIGRATION_URL or DATABASE_URL (your
 * Supabase project, read from .env.local) when set, and the local PGlite folder otherwise.
 * Local development applies migrations itself on startup.
 */
if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const url = process.env.DATABASE_MIGRATION_URL ?? process.env.DATABASE_URL;

export default defineConfig({
  dialect: "postgresql",
  schema: "./server/db/schema.ts",
  out: "./drizzle",
  ...(url ? { dbCredentials: { url } } : { driver: "pglite", dbCredentials: { url: "./data/pglite" } }),
});
