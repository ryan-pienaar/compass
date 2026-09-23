import { relative } from "node:path";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { AppContext } from "./context.ts";
import { DIST_DIR } from "./paths.ts";
import { compassRoutes } from "./routes/compass.ts";
import { coreRoutes } from "./routes/core.ts";
import { growRoutes } from "./routes/grow.ts";
import { planRoutes } from "./routes/plan.ts";

export function createApi(ctx: AppContext) {
  return new Hono()
    .route("/", coreRoutes(ctx))
    .route("/", compassRoutes(ctx))
    .route("/", planRoutes(ctx))
    .route("/", growRoutes(ctx));
}

/** Type of the whole API, used by the typed client in the browser. */
export type ApiType = ReturnType<typeof createApi>;

export function createApp(ctx: AppContext, opts: { serveStatic: boolean }) {
  const app = new Hono();
  app.onError((err, c) => {
    if (err instanceof HTTPException) return c.json({ error: err.message }, err.status);
    console.error(err);
    return c.json({ error: err instanceof Error ? err.message : "Unexpected error" }, 500);
  });
  app.route("/api", createApi(ctx));
  app.all("/api/*", (c) => c.json({ error: "Not found" }, 404));

  if (opts.serveStatic) {
    // serveStatic resolves paths relative to the working directory.
    const root = relative(process.cwd(), DIST_DIR) || ".";
    app.use("/assets/*", serveStatic({ root }));
    app.use("/*", serveStatic({ root }));
    // Single-page app: any other route renders index.html.
    app.get("*", serveStatic({ root, path: "index.html" }));
  }
  return app;
}
