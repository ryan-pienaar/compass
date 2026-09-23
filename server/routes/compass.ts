import { and, asc, desc, eq, isNotNull } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { ROLE_COLORS } from "../../shared/content.ts";
import { dateInZone } from "../../shared/dates.ts";
import type { ApiEnv, AppContext, Scope } from "../context.ts";
import { affirmations, goals, missionVersions, missions, roles, tasks } from "../db/schema.ts";
import { idParam, isoDate, v } from "../lib/validate.ts";
import { assertOwned } from "../services/owned.ts";
import { listRoles, nextRoleSortOrder } from "../services/roles.ts";

type MissionRow = typeof missions.$inferSelect;

async function ensureMission(s: Scope): Promise<MissionRow> {
  const find = () =>
    s.db
      .select()
      .from(missions)
      .where(and(eq(missions.userId, s.userId), eq(missions.kind, "personal")))
      .limit(1);
  const [existing] = await find();
  if (existing) return existing;
  // Unique per person and kind, so concurrent first requests can't create two.
  await s.db.insert(missions).values({ userId: s.userId, kind: "personal", title: "My mission", content: "" }).onConflictDoNothing();
  return (await find())[0];
}

async function missionPayload(s: Scope) {
  const mission = await ensureMission(s);
  const versions = await s.db
    .select()
    .from(missionVersions)
    .where(and(eq(missionVersions.userId, s.userId), eq(missionVersions.missionId, mission.id)))
    .orderBy(desc(missionVersions.createdAt));
  return { mission, versions };
}

/** One version per day you edit it (your day, in your time zone): today's draft keeps updating, a new day starts a new version. */
async function saveMissionContent(s: Scope, content: string, note?: string) {
  const mission = await ensureMission(s);
  await s.db.transaction(async (tx) => {
    await tx.update(missions).set({ content }).where(eq(missions.id, mission.id));
    const [latest] = await tx
      .select()
      .from(missionVersions)
      .where(eq(missionVersions.missionId, mission.id))
      .orderBy(desc(missionVersions.createdAt))
      .limit(1);
    if (latest && dateInZone(latest.createdAt, s.timeZone) === s.today) {
      await tx
        .update(missionVersions)
        .set({ content, ...(note !== undefined ? { note } : {}) })
        .where(eq(missionVersions.id, latest.id));
    } else if (!latest || latest.content !== content) {
      if (content.trim() || latest) {
        await tx.insert(missionVersions).values({ userId: s.userId, missionId: mission.id, content, note: note ?? null });
      }
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

export const compassRoutes = (_ctx: AppContext) =>
  new Hono<ApiEnv>()
    /* ---------------- Mission ---------------- */
    .get("/mission", async (c) => c.json(await missionPayload(c.var.scope)))
    .put(
      "/mission",
      v("json", z.object({ content: z.string().max(50000), title: z.string().max(120).optional(), note: z.string().max(500).optional() })),
      async (c) => {
        const s = c.var.scope;
        const { content, title, note } = c.req.valid("json");
        if (title !== undefined) {
          const m = await ensureMission(s);
          await s.db.update(missions).set({ title }).where(eq(missions.id, m.id));
        }
        await saveMissionContent(s, content, note);
        return c.json(await missionPayload(s));
      },
    )
    .post("/mission/review", async (c) => {
      const s = c.var.scope;
      const m = await ensureMission(s);
      await s.db.update(missions).set({ reviewedAt: new Date().toISOString() }).where(eq(missions.id, m.id));
      return c.json(await missionPayload(s));
    })
    .post("/mission/versions/:id/restore", v("param", idParam), async (c) => {
      const s = c.var.scope;
      const { id } = c.req.valid("param");
      const [version] = await s.db
        .select()
        .from(missionVersions)
        .where(and(eq(missionVersions.id, id), eq(missionVersions.userId, s.userId)))
        .limit(1);
      if (!version) return c.json({ error: "Version not found" }, 404);
      await saveMissionContent(s, version.content, `Restored from ${dateInZone(version.createdAt, s.timeZone)}`);
      return c.json(await missionPayload(s));
    })

    /* ---------------- Roles ---------------- */
    .get("/roles", v("query", z.object({ all: z.string().optional() })), async (c) =>
      c.json(await listRoles(c.var.scope, c.req.valid("query").all === "1")),
    )
    .post("/roles", v("json", roleBody), async (c) => {
      const s = c.var.scope;
      const body = c.req.valid("json");
      const count = (await listRoles(s, true)).length;
      const [row] = await s.db
        .insert(roles)
        .values({
          userId: s.userId,
          name: body.name,
          description: body.description ?? "",
          color: body.color ?? ROLE_COLORS[count % ROLE_COLORS.length],
          sortOrder: await nextRoleSortOrder(s),
        })
        .returning();
      return c.json(row);
    })
    .patch("/roles/:id", v("param", idParam), v("json", roleBody.partial().extend({ archived: z.boolean().optional() })), async (c) => {
      const s = c.var.scope;
      const { id } = c.req.valid("param");
      const { archived, ...rest } = c.req.valid("json");
      const [row] = await s.db
        .update(roles)
        .set({ ...rest, ...(archived !== undefined ? { archivedAt: archived ? new Date().toISOString() : null } : {}) })
        .where(and(eq(roles.id, id), eq(roles.userId, s.userId)))
        .returning();
      if (!row) return c.json({ error: "Role not found" }, 404);
      return c.json(row);
    })
    .put("/roles/order", v("json", z.object({ ids: z.array(z.string()) })), async (c) => {
      const s = c.var.scope;
      const { ids } = c.req.valid("json");
      await s.db.transaction(async (tx) => {
        for (const [i, id] of ids.entries()) {
          await tx
            .update(roles)
            .set({ sortOrder: i + 1 })
            .where(and(eq(roles.id, id), eq(roles.userId, s.userId)));
        }
      });
      return c.json(await listRoles(s));
    })

    /* ---------------- Long-term goals ---------------- */
    .get("/goals", async (c) => {
      const s = c.var.scope;
      const [rows, linked] = await Promise.all([
        s.db
          .select()
          .from(goals)
          .where(eq(goals.userId, s.userId))
          .orderBy(asc(goals.sortOrder), asc(goals.createdAt)),
        s.db
          .select({ goalId: tasks.goalId, status: tasks.status, kind: tasks.kind, completedAt: tasks.completedAt })
          .from(tasks)
          .where(and(eq(tasks.userId, s.userId), isNotNull(tasks.goalId))),
      ]);
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
    .post("/goals", v("json", z.object(goalFields).partial().required({ title: true })), async (c) => {
      const s = c.var.scope;
      const body = c.req.valid("json");
      await assertOwned(s, { roleId: body.roleId });
      const [row] = await s.db
        .insert(goals)
        .values({ ...body, userId: s.userId })
        .returning();
      return c.json(row);
    })
    .patch("/goals/:id", v("param", idParam), v("json", z.object(goalFields).partial()), async (c) => {
      const s = c.var.scope;
      const { id } = c.req.valid("param");
      const body = c.req.valid("json");
      await assertOwned(s, { roleId: body.roleId });
      const [current] = await s.db
        .select()
        .from(goals)
        .where(and(eq(goals.id, id), eq(goals.userId, s.userId)))
        .limit(1);
      if (!current) return c.json({ error: "Goal not found" }, 404);
      const achievedAt =
        body.status && body.status !== current.status ? (body.status === "achieved" ? new Date().toISOString() : null) : undefined;
      const [row] = await s.db
        .update(goals)
        .set({ ...body, ...(achievedAt !== undefined ? { achievedAt } : {}) })
        .where(and(eq(goals.id, id), eq(goals.userId, s.userId)))
        .returning();
      return c.json(row);
    })
    .delete("/goals/:id", v("param", idParam), async (c) => {
      const s = c.var.scope;
      await s.db.delete(goals).where(and(eq(goals.id, c.req.valid("param").id), eq(goals.userId, s.userId)));
      return c.json({ ok: true });
    })

    /* ---------------- Affirmations ---------------- */
    .get("/affirmations", async (c) => {
      const s = c.var.scope;
      return c.json(
        await s.db
          .select()
          .from(affirmations)
          .where(eq(affirmations.userId, s.userId))
          .orderBy(asc(affirmations.sortOrder), asc(affirmations.createdAt)),
      );
    })
    .post(
      "/affirmations",
      v("json", z.object({ text: z.string().trim().min(1).max(1000), roleId: z.string().nullable().optional(), visualConfirmed: z.boolean().optional() })),
      async (c) => {
        const s = c.var.scope;
        const body = c.req.valid("json");
        await assertOwned(s, { roleId: body.roleId });
        const [row] = await s.db
          .insert(affirmations)
          .values({ ...body, userId: s.userId })
          .returning();
        return c.json(row);
      },
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
      async (c) => {
        const s = c.var.scope;
        const body = c.req.valid("json");
        await assertOwned(s, { roleId: body.roleId });
        const [row] = await s.db
          .update(affirmations)
          .set(body)
          .where(and(eq(affirmations.id, c.req.valid("param").id), eq(affirmations.userId, s.userId)))
          .returning();
        if (!row) return c.json({ error: "Affirmation not found" }, 404);
        return c.json(row);
      },
    )
    .delete("/affirmations/:id", v("param", idParam), async (c) => {
      const s = c.var.scope;
      await s.db.delete(affirmations).where(and(eq(affirmations.id, c.req.valid("param").id), eq(affirmations.userId, s.userId)));
      return c.json({ ok: true });
    });
