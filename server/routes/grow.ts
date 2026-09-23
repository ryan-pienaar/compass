import { and, asc, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { addDaysISO } from "../../shared/dates.ts";
import type { ApiEnv, AppContext } from "../context.ts";
import {
  assessments,
  challengeDays,
  challenges,
  concerns,
  delegationCheckins,
  delegations,
  journal,
  roles,
  tasks,
  timeAudits,
  timeEntries,
} from "../db/schema.ts";
import { idParam, isoDate, quadrantNum, v } from "../lib/validate.ts";
import { getInsights } from "../services/insights.ts";
import { assertOwned } from "../services/owned.ts";
import { triageContext } from "../services/settings.ts";
import { createTask, getTask } from "../services/tasks.ts";

const concernFields = {
  title: z.string().trim().min(1).max(500),
  notes: z.string().max(10000),
  control: z.enum(["direct", "indirect", "none"]).nullable(),
  approach: z.string().max(2000),
  firstStep: z.string().max(1000),
  beStatement: z.string().max(1000),
  status: z.enum(["open", "acting", "resolved", "accepted"]),
};

const delegationFields = {
  title: z.string().trim().min(1).max(300),
  delegate: z.string().max(200),
  desiredResults: z.string().max(5000),
  dueDate: isoDate.nullable(),
  guidelines: z.string().max(5000),
  resources: z.string().max(5000),
  accountability: z.string().max(5000),
  consequences: z.string().max(5000),
  checkinEveryDays: z.number().int().min(1).max(90).nullable(),
  nextCheckin: isoDate.nullable(),
  status: z.enum(["active", "done", "cancelled"]),
  roleId: z.string().nullable(),
};

const journalFields = {
  date: isoDate,
  kind: z.string().min(1).max(32),
  title: z.string().max(300).nullable(),
  body: z.string().max(50000),
  data: z.record(z.string(), z.unknown()).nullable(),
};

const auditFields = {
  startDate: isoDate,
  days: z.number().int().min(1).max(14),
  estQ1: z.number().int().min(0).max(100),
  estQ2: z.number().int().min(0).max(100),
  estQ3: z.number().int().min(0).max(100),
  estQ4: z.number().int().min(0).max(100),
  reflection: z.string().max(10000),
};

export const growRoutes = (_ctx: AppContext) =>
  new Hono<ApiEnv>()
    /* ---------------- Circle of Concern / Influence ---------------- */
    .get("/concerns", async (c) => {
      const s = c.var.scope;
      return c.json(await s.db.select().from(concerns).where(eq(concerns.userId, s.userId)).orderBy(desc(concerns.createdAt)));
    })
    .post("/concerns", v("json", z.object(concernFields).partial().required({ title: true })), async (c) => {
      const s = c.var.scope;
      const [row] = await s.db
        .insert(concerns)
        .values({ ...c.req.valid("json"), userId: s.userId })
        .returning();
      return c.json(row);
    })
    .patch("/concerns/:id", v("param", idParam), v("json", z.object(concernFields).partial()), async (c) => {
      const s = c.var.scope;
      const [row] = await s.db
        .update(concerns)
        .set(c.req.valid("json"))
        .where(and(eq(concerns.id, c.req.valid("param").id), eq(concerns.userId, s.userId)))
        .returning();
      if (!row) return c.json({ error: "Concern not found" }, 404);
      return c.json(row);
    })
    .delete("/concerns/:id", v("param", idParam), async (c) => {
      const s = c.var.scope;
      await s.db.delete(concerns).where(and(eq(concerns.id, c.req.valid("param").id), eq(concerns.userId, s.userId)));
      return c.json({ ok: true });
    })
    .post(
      "/concerns/:id/first-step",
      v("param", idParam),
      v(
        "json",
        z.object({
          title: z.string().trim().min(1).max(500).optional(),
          roleId: z.string().nullable().optional(),
          scheduledDate: isoDate.nullable().optional(),
        }),
      ),
      async (c) => {
        const s = c.var.scope;
        const { id } = c.req.valid("param");
        const body = c.req.valid("json");
        await assertOwned(s, { roleId: body.roleId });
        const mine = and(eq(concerns.id, id), eq(concerns.userId, s.userId));
        const [concern] = await s.db.select().from(concerns).where(mine).limit(1);
        if (!concern) return c.json({ error: "Concern not found" }, 404);
        const title = body.title ?? (concern.firstStep.trim() || `First step: ${concern.title}`);
        const task = await createTask(
          s,
          {
            title,
            important: true,
            urgent: null,
            roleId: body.roleId ?? null,
            scheduledDate: body.scheduledDate ?? null,
            source: "influence",
            why: `Inside my Circle of Influence: ${concern.title}`,
          },
          await triageContext(s),
        );
        const [updated] = await s.db
          .update(concerns)
          .set({ taskId: task.id, status: concern.status === "open" ? "acting" : concern.status, firstStep: concern.firstStep || title })
          .where(mine)
          .returning();
        return c.json({ concern: updated, task });
      },
    )

    /* ---------------- Stewardship delegation ---------------- */
    .get("/delegations", async (c) => {
      const s = c.var.scope;
      const [rows, checkins] = await Promise.all([
        s.db
          .select()
          .from(delegations)
          .where(eq(delegations.userId, s.userId))
          .orderBy(asc(delegations.status), desc(delegations.createdAt)),
        s.db.select().from(delegationCheckins).where(eq(delegationCheckins.userId, s.userId)).orderBy(desc(delegationCheckins.date)),
      ]);
      return c.json(rows.map((d) => ({ ...d, checkins: checkins.filter((x) => x.delegationId === d.id) })));
    })
    .post(
      "/delegations",
      v("json", z.object({ ...delegationFields, taskId: z.string().nullable() }).partial().required({ title: true })),
      async (c) => {
        const s = c.var.scope;
        const { taskId, ...body } = c.req.valid("json");
        await assertOwned(s, { roleId: body.roleId });
        const task = taskId ? await getTask(s, taskId) : undefined;
        if (taskId && !task) return c.json({ error: "Task not found" }, 404);
        // A delegated task keeps its deadline and role: the stewardship carries them from now on,
        // and the first check-in comes no later than the deadline.
        const dueDate = body.dueDate !== undefined ? body.dueDate : (task?.dueDate ?? null);
        const roleId = body.roleId !== undefined ? body.roleId : (task?.roleId ?? null);
        const byCadence = body.checkinEveryDays ? addDaysISO(s.today, body.checkinEveryDays) : null;
        const nextCheckin = body.nextCheckin ?? (byCadence && dueDate && dueDate < byCadence ? dueDate : byCadence);
        const row = await s.db.transaction(async (tx) => {
          const [created] = await tx
            .insert(delegations)
            .values({ ...body, userId: s.userId, dueDate, roleId, nextCheckin })
            .returning();
          if (taskId) {
            // The task leaves your plate: the stewardship now tracks it.
            await tx
              .update(tasks)
              .set({ delegationId: created.id, status: "dropped", statusReason: "delegated", statusNote: `Delegated to ${created.delegate || "someone"}` })
              .where(and(eq(tasks.id, taskId), eq(tasks.userId, s.userId)));
          }
          return created;
        });
        return c.json({ ...row, checkins: [] as (typeof delegationCheckins.$inferSelect)[] });
      },
    )
    .patch("/delegations/:id", v("param", idParam), v("json", z.object(delegationFields).partial()), async (c) => {
      const s = c.var.scope;
      const body = c.req.valid("json");
      await assertOwned(s, { roleId: body.roleId });
      const [row] = await s.db
        .update(delegations)
        .set(body)
        .where(and(eq(delegations.id, c.req.valid("param").id), eq(delegations.userId, s.userId)))
        .returning();
      if (!row) return c.json({ error: "Stewardship not found" }, 404);
      return c.json(row);
    })
    .delete("/delegations/:id", v("param", idParam), async (c) => {
      const s = c.var.scope;
      await s.db.delete(delegations).where(and(eq(delegations.id, c.req.valid("param").id), eq(delegations.userId, s.userId)));
      return c.json({ ok: true });
    })
    .post(
      "/delegations/:id/checkins",
      v("param", idParam),
      v("json", z.object({ date: isoDate.optional(), notes: z.string().max(5000).default(""), onTrack: z.boolean().nullable().optional() })),
      async (c) => {
        const s = c.var.scope;
        const { id } = c.req.valid("param");
        const body = c.req.valid("json");
        const mine = and(eq(delegations.id, id), eq(delegations.userId, s.userId));
        const [d] = await s.db.select().from(delegations).where(mine).limit(1);
        if (!d) return c.json({ error: "Stewardship not found" }, 404);
        const date = body.date ?? s.today;
        const row = await s.db.transaction(async (tx) => {
          const [created] = await tx
            .insert(delegationCheckins)
            .values({ userId: s.userId, delegationId: id, date, notes: body.notes, onTrack: body.onTrack ?? null })
            .returning();
          await tx
            .update(delegations)
            .set({ nextCheckin: d.checkinEveryDays ? addDaysISO(date, d.checkinEveryDays) : null })
            .where(mine);
          return created;
        });
        return c.json(row);
      },
    )

    /* ---------------- Journal ---------------- */
    .get(
      "/journal",
      v(
        "query",
        z.object({
          kind: z.string().optional(),
          from: isoDate.optional(),
          to: isoDate.optional(),
          limit: z.coerce.number().int().min(1).max(1000).optional(),
        }),
      ),
      async (c) => {
        const s = c.var.scope;
        const q = c.req.valid("query");
        const conds = [eq(journal.userId, s.userId)];
        if (q.kind) conds.push(eq(journal.kind, q.kind));
        if (q.from) conds.push(gte(journal.date, q.from));
        if (q.to) conds.push(lte(journal.date, q.to));
        return c.json(
          await s.db
            .select()
            .from(journal)
            .where(and(...conds))
            .orderBy(desc(journal.date), desc(journal.createdAt))
            .limit(q.limit ?? 200),
        );
      },
    )
    .post("/journal", v("json", z.object(journalFields).partial().required({ kind: true, body: true })), async (c) => {
      const s = c.var.scope;
      const body = c.req.valid("json");
      const [row] = await s.db
        .insert(journal)
        .values({ ...body, userId: s.userId, date: body.date ?? s.today })
        .returning();
      return c.json(row);
    })
    .put(
      "/journal/daily/:date",
      v("param", z.object({ date: isoDate })),
      v("json", z.object({ body: z.string().max(50000), data: z.record(z.string(), z.unknown()).nullable().optional() })),
      async (c) => {
        const s = c.var.scope;
        const { date } = c.req.valid("param");
        const body = c.req.valid("json");
        // Never keep an empty reflection around.
        const empty = !body.body.trim() && Object.values(body.data ?? {}).every((x) => !String(x ?? "").trim());
        if (empty) {
          await s.db.delete(journal).where(and(eq(journal.userId, s.userId), eq(journal.kind, "daily"), eq(journal.date, date)));
          return c.json(null);
        }
        const [row] = await s.db
          .insert(journal)
          .values({ ...body, userId: s.userId, date, kind: "daily" })
          .onConflictDoUpdate({
            target: [journal.userId, journal.date],
            targetWhere: sql`${journal.kind} = 'daily'`,
            set: { body: body.body, data: body.data ?? null, updatedAt: new Date().toISOString() },
          })
          .returning();
        return c.json(row);
      },
    )
    .patch("/journal/:id", v("param", idParam), v("json", z.object(journalFields).partial()), async (c) => {
      const s = c.var.scope;
      const [row] = await s.db
        .update(journal)
        .set(c.req.valid("json"))
        .where(and(eq(journal.id, c.req.valid("param").id), eq(journal.userId, s.userId)))
        .returning();
      if (!row) return c.json({ error: "Entry not found" }, 404);
      return c.json(row);
    })
    .delete("/journal/:id", v("param", idParam), async (c) => {
      const s = c.var.scope;
      await s.db.delete(journal).where(and(eq(journal.id, c.req.valid("param").id), eq(journal.userId, s.userId)));
      return c.json({ ok: true });
    })

    /* ---------------- Time audit ---------------- */
    .get("/audits", async (c) => {
      const s = c.var.scope;
      return c.json(await s.db.select().from(timeAudits).where(eq(timeAudits.userId, s.userId)).orderBy(desc(timeAudits.createdAt)));
    })
    .post("/audits", v("json", z.object(auditFields).partial().required({ startDate: true })), async (c) => {
      const s = c.var.scope;
      const [row] = await s.db
        .insert(timeAudits)
        .values({ ...c.req.valid("json"), userId: s.userId })
        .returning();
      return c.json(row);
    })
    .patch("/audits/:id", v("param", idParam), v("json", z.object({ ...auditFields, completed: z.boolean() }).partial()), async (c) => {
      const s = c.var.scope;
      const { completed, ...rest } = c.req.valid("json");
      const [row] = await s.db
        .update(timeAudits)
        .set({ ...rest, ...(completed !== undefined ? { completedAt: completed ? new Date().toISOString() : null } : {}) })
        .where(and(eq(timeAudits.id, c.req.valid("param").id), eq(timeAudits.userId, s.userId)))
        .returning();
      if (!row) return c.json({ error: "Audit not found" }, 404);
      return c.json(row);
    })
    .delete("/audits/:id", v("param", idParam), async (c) => {
      const s = c.var.scope;
      await s.db.delete(timeAudits).where(and(eq(timeAudits.id, c.req.valid("param").id), eq(timeAudits.userId, s.userId)));
      return c.json({ ok: true });
    })
    .get("/time-entries", v("query", z.object({ from: isoDate, to: isoDate })), async (c) => {
      const s = c.var.scope;
      const { from, to } = c.req.valid("query");
      return c.json(
        await s.db
          .select()
          .from(timeEntries)
          .where(and(eq(timeEntries.userId, s.userId), gte(timeEntries.date, from), lte(timeEntries.date, to)))
          .orderBy(asc(timeEntries.date), asc(timeEntries.slot)),
      );
    })
    .put(
      "/time-entries",
      v(
        "json",
        z.object({
          entries: z
            .array(
              z.object({
                date: isoDate,
                slot: z.number().int().min(0).max(95),
                quadrant: quadrantNum.nullable(),
                roleId: z.string().nullable().optional(),
                note: z.string().max(500).optional(),
              }),
            )
            .max(96 * 14),
        }),
      ),
      async (c) => {
        const s = c.var.scope;
        const { entries } = c.req.valid("json");
        // Role links must be the person's own roles; anything else is dropped.
        const roleIds = [...new Set(entries.map((e) => e.roleId).filter((x): x is string => !!x))];
        const ownRoles = roleIds.length
          ? new Set(
              (
                await s.db
                  .select({ id: roles.id })
                  .from(roles)
                  .where(and(eq(roles.userId, s.userId), inArray(roles.id, roleIds)))
              ).map((r) => r.id),
            )
          : new Set<string>();
        await s.db.transaction(async (tx) => {
          for (const e of entries) {
            await tx
              .delete(timeEntries)
              .where(and(eq(timeEntries.userId, s.userId), eq(timeEntries.date, e.date), eq(timeEntries.slot, e.slot)));
            if (e.quadrant != null) {
              await tx.insert(timeEntries).values({
                userId: s.userId,
                date: e.date,
                slot: e.slot,
                quadrant: e.quadrant,
                roleId: e.roleId && ownRoles.has(e.roleId) ? e.roleId : null,
                note: e.note ?? "",
              });
            }
          }
        });
        return c.json({ ok: true, count: entries.length });
      },
    )

    /* ---------------- 30-day proactivity test ---------------- */
    .get("/challenge", async (c) => {
      const s = c.var.scope;
      const all = await s.db.select().from(challenges).where(eq(challenges.userId, s.userId)).orderBy(desc(challenges.createdAt));
      const active = all.find((x) => x.status === "active") ?? null;
      const days = active
        ? await s.db
            .select()
            .from(challengeDays)
            .where(and(eq(challengeDays.userId, s.userId), eq(challengeDays.challengeId, active.id)))
            .orderBy(asc(challengeDays.date))
        : [];
      return c.json({ active, days, history: all.filter((x) => x.status !== "active") });
    })
    .post("/challenge", v("json", z.object({ startedOn: isoDate.optional() })), async (c) => {
      const s = c.var.scope;
      const [existing] = await s.db
        .select()
        .from(challenges)
        .where(and(eq(challenges.userId, s.userId), eq(challenges.status, "active")))
        .limit(1);
      if (existing) return c.json(existing);
      const [row] = await s.db
        .insert(challenges)
        .values({ userId: s.userId, startedOn: c.req.valid("json").startedOn ?? s.today })
        .returning();
      return c.json(row);
    })
    .patch("/challenge/:id", v("param", idParam), v("json", z.object({ status: z.enum(["active", "completed", "abandoned"]) })), async (c) => {
      const s = c.var.scope;
      const { status } = c.req.valid("json");
      const [row] = await s.db
        .update(challenges)
        .set({ status, completedAt: status === "active" ? null : new Date().toISOString() })
        .where(and(eq(challenges.id, c.req.valid("param").id), eq(challenges.userId, s.userId)))
        .returning();
      if (!row) return c.json({ error: "Challenge not found" }, 404);
      return c.json(row);
    })
    .put(
      "/challenge/:id/days/:date",
      v("param", z.object({ id: z.string(), date: isoDate })),
      v(
        "json",
        z
          .object({
            commitment: z.string().max(1000),
            kept: z.boolean().nullable(),
            inInfluence: z.boolean().nullable(),
            proactiveLanguage: z.boolean().nullable(),
            ownedMistakes: z.boolean().nullable(),
            note: z.string().max(5000),
          })
          .partial(),
      ),
      async (c) => {
        const s = c.var.scope;
        const { id, date } = c.req.valid("param");
        const body = c.req.valid("json");
        const [challenge] = await s.db
          .select({ id: challenges.id })
          .from(challenges)
          .where(and(eq(challenges.id, id), eq(challenges.userId, s.userId)))
          .limit(1);
        if (!challenge) return c.json({ error: "Challenge not found" }, 404);
        const [row] = await s.db
          .insert(challengeDays)
          .values({ ...body, userId: s.userId, challengeId: id, date })
          .onConflictDoUpdate({ target: [challengeDays.challengeId, challengeDays.date], set: body })
          .returning();
        return c.json(row);
      },
    )

    /* ---------------- Self-checks ---------------- */
    .get("/assessments", v("query", z.object({ kind: z.enum(["urgency", "center"]).optional() })), async (c) => {
      const s = c.var.scope;
      const { kind } = c.req.valid("query");
      return c.json(
        await s.db
          .select()
          .from(assessments)
          .where(kind ? and(eq(assessments.userId, s.userId), eq(assessments.kind, kind)) : eq(assessments.userId, s.userId))
          .orderBy(desc(assessments.createdAt)),
      );
    })
    .post(
      "/assessments",
      v(
        "json",
        z.object({
          kind: z.enum(["urgency", "center"]),
          answers: z.record(z.string(), z.number()),
          score: z.number().int().nullable().optional(),
          notes: z.string().max(10000).optional(),
        }),
      ),
      async (c) => {
        const s = c.var.scope;
        const [row] = await s.db
          .insert(assessments)
          .values({ ...c.req.valid("json"), userId: s.userId })
          .returning();
        return c.json(row);
      },
    )
    .delete("/assessments/:id", v("param", idParam), async (c) => {
      const s = c.var.scope;
      await s.db.delete(assessments).where(and(eq(assessments.id, c.req.valid("param").id), eq(assessments.userId, s.userId)));
      return c.json({ ok: true });
    })

    /* ---------------- Insights ---------------- */
    .get("/insights", v("query", z.object({ weeks: z.coerce.number().int().min(4).max(52).optional() })), async (c) =>
      c.json(await getInsights(c.var.scope, c.req.valid("query").weeks ?? 12)),
    );
