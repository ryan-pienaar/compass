import { existsSync, mkdirSync } from "node:fs";
import { join, relative } from "node:path";
import { parseArgs } from "node:util";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { DEV_API_PORT, PROD_PORT } from "../shared/constants.ts";
import { createApp } from "./app.ts";
import { authenticatorFromEnv } from "./auth.ts";
import { connectPostgres } from "./db/client.ts";
import { DIST_DIR, LOCAL_DB_DIR } from "./paths.ts";

/*
 * Runs the API on Node: `pnpm dev` (with Vite in front) or `pnpm start` (serving the
 * built UI too). On Vercel the same app runs as a function (api/index.ts) instead.
 *  - Database: DATABASE_URL (Supabase) when set, otherwise a local PGlite folder.
 *  - Auth: Auth0 when AUTH0_DOMAIN/AUTH0_AUDIENCE are set, otherwise (dev only) a local user.
 */
const { values } = parseArgs({
  options: {
    dev: { type: "boolean", default: false },
    port: { type: "string" },
  },
});

const dev = values.dev ?? false;
// In dev, PORT (often set by tooling for the Vite server) must not be picked up by the API.
const port = Number(values.port ?? (dev ? DEV_API_PORT : (process.env.PORT ?? PROD_PORT)));

if (!dev && !existsSync(join(DIST_DIR, "index.html"))) {
  console.error("The UI hasn't been built yet. Run `pnpm build` first (or use `pnpm dev`).");
  process.exit(1);
}

const url = process.env.DATABASE_URL;
if (!url) mkdirSync(LOCAL_DB_DIR, { recursive: true });
// PGlite is a development dependency: load it only when there is no DATABASE_URL.
const database = url
  ? connectPostgres(url, { ca: process.env.DATABASE_CA_CERT })
  : await (await import("./db/pglite.ts")).openPglite(LOCAL_DB_DIR);
const authenticate = authenticatorFromEnv(process.env, { allowLocal: dev });

const app = createApp({ db: database.db, authenticate, dev });
if (!dev) {
  // serveStatic resolves paths relative to the working directory.
  const root = relative(process.cwd(), DIST_DIR) || ".";
  app.use("/assets/*", serveStatic({ root }));
  app.use("/*", serveStatic({ root }));
  // Single-page app: any other route renders index.html.
  app.get("*", serveStatic({ root, path: "index.html" }));
}

const server = serve({ fetch: app.fetch, hostname: "127.0.0.1", port }, (info) => {
  const where = `http://127.0.0.1:${info.port}`;
  console.log(dev ? `Compass API (dev) listening on ${where}` : `Compass is running at ${where}`);
  console.log(`Database: ${url ? "DATABASE_URL (Postgres)" : LOCAL_DB_DIR}`);
  console.log(`Auth: ${process.env.AUTH0_DOMAIN ? `Auth0 (${process.env.AUTH0_DOMAIN})` : "local user (no Auth0 configured)"}`);
});

async function shutdown() {
  server.close();
  await database.close().catch(() => {});
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
