import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { serve } from "@hono/node-server";
import { DEV_API_PORT, PROD_PORT } from "../shared/constants.ts";
import { createApp } from "./app.ts";
import { createDb, dailyBackup } from "./db/client.ts";
import { DIST_DIR, defaultDbPath } from "./paths.ts";

const { values } = parseArgs({
  options: {
    dev: { type: "boolean", default: false },
    port: { type: "string" },
    db: { type: "string" },
    open: { type: "boolean", default: false },
  },
});

const dev = values.dev ?? false;
// In dev, PORT (often set by tooling for the Vite server) must not be picked up by the API.
const port = Number(values.port ?? (dev ? DEV_API_PORT : (process.env.PORT ?? PROD_PORT)));
const dbPath = values.db ?? process.env.COMPASS_DB ?? defaultDbPath(dev);

if (!dev && !existsSync(join(DIST_DIR, "index.html"))) {
  console.error("The UI hasn't been built yet. Run `pnpm build` first (or use `pnpm dev`).");
  process.exit(1);
}

const { db, client, isNew } = createDb(dbPath);
// Nothing to protect in a brand-new database; afterwards, one backup per day.
const backup = isNew ? null : dailyBackup(client, dbPath);
const app = createApp({ db, client, dbPath, dev }, { serveStatic: !dev });

const server = serve({ fetch: app.fetch, hostname: "127.0.0.1", port }, (info) => {
  const url = `http://127.0.0.1:${info.port}`;
  console.log(dev ? `Compass API (dev) listening on ${url}` : `Compass is running at ${url}`);
  console.log(`Database: ${dbPath}`);
  if (backup) console.log(`Daily backup: ${backup}`);
  if (values.open) openBrowser(url);
});

function openBrowser(url: string) {
  const [cmd, args] =
    process.platform === "win32"
      ? ["cmd", ["/c", "start", "", url]]
      : process.platform === "darwin"
        ? ["open", [url]]
        : ["xdg-open", [url]];
  try {
    spawn(cmd, args as string[], { detached: true, stdio: "ignore" }).unref();
  } catch {
    // Opening a browser is a convenience; the URL is printed above.
  }
}

function shutdown() {
  server.close();
  try {
    client.close();
  } catch {
    // already closed
  }
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
