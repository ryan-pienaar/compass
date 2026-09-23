import { and, asc, desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { ROLE_COLORS } from "../../shared/content.ts";
import { localDateOf, todayISO } from "../../shared/dates.ts";
import type { AppContext } from "../context.ts";
import type { DB } from "../db/client.ts";
import { affirmations, goals, missionVersions, missions, roles, tasks } from "../db/schema.ts";
import { idParam, isoDate, v } from "../lib/validate.ts";
import { listRoles, nextRoleSortOrder } from "../services/roles.ts";

function ensureMission(db: DB) {
  const existing = db.select().from(missions).where(eq(missions.kind, "personal")).orderBy(asc(missions.createdAt)).get();
  if (existing) return existing;
  return db.insert(missions).values({ kind: "personal", title: "My mission", content: "" }).returning().get();
}

function missionPayload(db: DB) {
  const mission = ensureMission(db);
  const versions = db
    .select()
    .from(missionVersions)
    .where(eq(missionVersions.missionId, mission.id))
    .orderBy(desc(missionVersions.createdAt))
    .all();
  return { mission, versions };
}

/** One version per day you edit it: today's draft keeps updating, a new day starts a new version. */
function saveMissionContent(db: DB, content: string, note?: string) {
  const mission = ensureMission(db);
  const today = todayISO();
  db.transaction((tx) => {
    tx.update(missions).set({ content }).where(eq(missions.id, mission.id)).run();
    const latest = tx
      .select()
      .from(missionVersions)
      .where(eq(missionVersions.missionId, mission.id))
      .orderBy(desc(missionVersions.createdAt))
      .get();
    if (latest && localDateOf(latest.createdAt) === today) {
      tx.update(missionVersions)
        .set({ content, ...(note !== undefined ? { note } : {}) })
        .where(eq(missionVersions.id, latest.id))
        .run();
    } else if (!latest || latest.content !== content) {
      if (content.trim() || latest) tx.insert(missionVersions).values({ missionId: mission.id, content, note: note ?? null }).run();
    }
  });
}

const roleBody = z.object({
  name: z.string().trim().min(1).max(60),
  description: z.string().max(2000).optional(),
  color: z.string().max(32).optional(),
});

const goalFields = {
  roleId: z.string().nullable(),
  title: z.string().trim().min(1).max(300),
  endInMind: z.string().max(5000),
  measure: z.string().max(2000),
  targetDate: isoDate.nullable(),
  status: z.enum(["active", "achieved", "paused", "archived"]),
  sortOrder: z.number(),
};

export const compassRoutes = (ctx: AppContext) =>
  new Hono()
    /* ---------------- Mission ---------------- */
    .get("/mission", (c) => c.json(missionPayload(ctx.db)))
    .put("/mission", v("json", z.object({ content: z.string().max(50000), title: z.string().max(120).optional(), note: z.string().max(500).optional() })), (c) => {
      const { content, title, note } = c.req.valid("json");
      if (title !== undefined) {
        const m = ensureMission(ctx.db);
        ctx.db.update(missions).set({ title }).where(eq(missions.id, m.id)).run();
      }
      saveMissionContent(ctx.db, content, note);
      return c.json(missionPayload(ctx.db));
    })
    .post("/mission/review", (c) => {
      const m = ensureMission(ctx.db);
      ctx.db.update(missions).set({ reviewedAt: new Date().toISOString() }).where(eq(missions.id, m.id)).run();
      return c.json(missionPayload(ctx.db));
    })
    .post("/mission/versions/:id/restore", v("param", idParam), (c) => {
      const { id } = c.req.valid("param");
      const version = ctx.db.select().from(missionVersions).where(eq(missionVersions.id, id)).get();
      if (!version) return c.json({ error: "Version not found" }, 404);
      saveMissionContent(ctx.db, version.content, `Restored from ${localDateOf(version.createdAt)}`);
      return c.json(missionPayload(ctx.db));
    })

    /* ---------------- Roles ---------------- */
    .get("/roles", v("query", z.object({ all: z.string().optional() })), (c) =>
      c.json(listRoles(ctx.db, c.req.valid("query").all === "1")),
    )
    .post("/roles", v("json", roleBody), (c) => {
      const body = c.req.valid("json");
      const count = listRoles(ctx.db, true).length;
      const row = ctx.db
        .insert(roles)
        .values({
          name: body.name,
          description: body.description ?? "",
          color: body.color ?? ROLE_COLORS[count % ROLE_COLORS.length],
          sortOrder: nextRoleSortOrder(ctx.db),
        })
        .returning()
        .get();
      return c.json(row);
    })
    .patch("/roles/:id", v("param", idParam), v("json", roleBody.partial().extend({ archived: z.boolean().optional() })), (c) => {
      const { id } = c.req.valid("param");
      const { archived, ...rest } = c.req.valid("json");
      const row = ctx.db
        .update(roles)
        .set({ ...rest, ...(archived !== undefined ? { archivedAt: archived ? new Date().toISOString() : null } : {}) })
        .where(eq(roles.id, id))
        .returning()
        .get();
      if (!row) return c.json({ error: "Role not found" }, 404);
      return c.json(row);
    })
    .put("/roles/order", v("json", z.object({ ids: z.array(z.string()) })), (c) => {
      const { ids } = c.req.valid("json");
      ctx.db.transaction((tx) => {
        ids.forEach((id, i) => tx.update(roles).set({ sortOrder: i + 1 }).where(eq(roles.id, id)).run());
      });
      return c.json(listRoles(ctx.db));
    })

    /* ---------------- Long-term goals ---------------- */
    .get("/goals", (c) => {
      const rows = ctx.db.select().from(goals).orderBy(asc(goals.sortOrder), asc(goals.createdAt)).all();
      const linked = ctx.db
        .select({ goalId: tasks.goalId, status: tasks.status, kind: tasks.kind, completedAt: tasks.completedAt })
        .from(tasks)
        .all()
        .filter((t) => t.goalId);
      return c.json(
        rows.map((g) => {
          const mine = linked.filter((t) => t.goalId === g.id);
          const done = mine.filter((t) => t.status === "done");
          return {
            ...g,
            stats: {
              weeklyTotal: mine.filter((t) => t.kind === "goal").length,
              weeklyDone: done.filter((t) => t.kind === "goal").length,
              tasksOpen: mine.filter((t) => t.kind === "task" && t.status === "open").length,
              tasksDone: done.filter((t) => t.kind === "task").length,
              lastProgressAt: done.map((t) => t.completedAt ?? "").sort().at(-1) || null,
            },
          };
        }),
      );
    })
    .post("/goals", v("json", z.object(goalFields).partial().required({ title: true })), (c) => {
      const body = c.req.valid("json");
      const row = ctx.db.insert(goals).values(body).returning().get();
      return c.json(row);
    })
    .patch("/goals/:id", v("param", idParam), v("json", z.object(goalFields).partial()), (c) => {
      const { id } = c.req.valid("param");
      const body = c.req.valid("json");
      const current = ctx.db.select().from(goals).where(eq(goals.id, id)).get();
      if (!current) return c.json({ error: "Goal not found" }, 404);
      const achievedAt =
        body.status && body.status !== current.status
          ? body.status === "achieved"
            ? new Date().toISOString()
            : null
          : undefined;
      const row = ctx.db
        .update(goals)
        .set({ ...body, ...(achievedAt !== undefined ? { achievedAt } : {}) })
        .where(eq(goals.id, id))
        .returning()
        .get();
      return c.json(row);
    })
    .delete("/goals/:id", v("param", idParam), (c) => {
      ctx.db.delete(goals).where(eq(goals.id, c.req.valid("param").id)).run();
      return c.json({ ok: true });
    })

    /* ---------------- Affirmations ---------------- */
    .get("/affirmations", (c) =>
      c.json(ctx.db.select().from(affirmations).orderBy(asc(affirmations.sortOrder), asc(affirmations.createdAt)).all()),
    )
    .post(
      "/affirmations",
      v("json", z.object({ text: z.string().trim().min(1).max(1000), roleId: z.string().nullable().optional(), visualConfirmed: z.boolean().optional() })),
      (c) => c.json(ctx.db.insert(affirmations).values(c.req.valid("json")).returning().get()),
    )
    .patch(
      "/affirmations/:id",
      v("param", idParam),
      v(
        "json",
        z
          .object({
            text: z.string().trim().min(1).max(1000),
            roleId: z.string().nullable(),
            active: z.boolean(),
            visualConfirmed: z.boolean(),
            sortOrder: z.number(),
          })
          .partial(),
      ),
      (c) => {
        const row = ctx.db
          .update(affirmations)
          .set(c.req.valid("json"))
          .where(eq(affirmations.id, c.req.valid("param").id))
          .returning()
          .get();
        if (!row) return c.json({ error: "Affirmation not found" }, 404);
        return c.json(row);
      },
    )
    .delete("/affirmations/:id", v("param", idParam), (c) => {
      ctx.db.delete(affirmations).where(and(eq(affirmations.id, c.req.valid("param").id))).run();
      return c.json({ ok: true });
    });
