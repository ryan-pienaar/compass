import { createApp } from "../server/app.ts";
import { authenticatorFromEnv } from "../server/auth.ts";
import { connectPostgres } from "../server/db/client.ts";

/*
 * The whole API as one Vercel Function (Node.js runtime: the Postgres driver needs TCP).
 * vercel.json rewrites /api/* here and Hono routes on the original path. Vercel treats a
 * default export with a `fetch` method as a web handler (every HTTP method). The
 * connection pool lives at module scope, so warm invocations reuse it.
 *
 * Production only: without DATABASE_URL and Auth0 settings the function refuses to start.
 */
const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set.");

export default createApp({
  db: connectPostgres(url, { ca: process.env.DATABASE_CA_CERT }).db,
  authenticate: authenticatorFromEnv(process.env, { allowLocal: false }),
  dev: false,
});
