import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { isValidTimeZone, todayInZone } from "../shared/dates.ts";
import type { ApiEnv, AppContext } from "./context.ts";
import { compassRoutes } from "./routes/compass.ts";
import { coreRoutes } from "./routes/core.ts";
import { growRoutes } from "./routes/grow.ts";
import { planRoutes } from "./routes/plan.ts";

export function createApi(ctx: AppContext) {
  return (
    new Hono<ApiEnv>()
      // Every request is someone's: verify who, then fix what "today" means where they are.
      .use("*", async (c, next) => {
        const identity = await ctx.authenticate(c.req.raw);
        if (!identity) return c.json({ error: "Sign in required" }, 401);
        const zone = c.req.header("x-timezone");
        const timeZone = zone && isValidTimeZone(zone) ? zone : "UTC";
        c.set("scope", { db: ctx.db, userId: identity.userId, timeZone, today: todayInZone(timeZone) });
        await next();
      })
      .route("/", coreRoutes(ctx))
      .route("/", compassRoutes(ctx))
      .route("/", planRoutes(ctx))
      .route("/", growRoutes(ctx))
  );
}

/** Type of the whole API, used by the typed client in the browser. */
export type ApiType = ReturnType<typeof createApi>;

/** The API under /api with consistent JSON errors. Static files are served by Vercel (or server/index.ts locally). */
export function createApp(ctx: AppContext) {
  const app = new Hono();
  app.onError((err, c) => {
    if (err instanceof HTTPException) return c.json({ error: err.message }, err.status);
    console.error(err);
    return c.json({ error: "Something went wrong on the server." }, 500);
  });
  app.route("/api", createApi(ctx));
  app.all("/api/*", (c) => c.json({ error: "Not found" }, 404));
  return app;
}
