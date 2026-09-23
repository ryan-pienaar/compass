import { and, asc, desc, eq, gte, lte } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { addDaysISO, todayISO } from "../../shared/dates.ts";
import type { AppContext } from "../context.ts";
import {
  assessments,
  challengeDays,
  challenges,
  concerns,
  delegationCheckins,
  delegations,
  journal,
  tasks,
  timeAudits,
  timeEntries,
} from "../db/schema.ts";
import { idParam, isoDate, quadrantNum, v } from "../lib/validate.ts";
import { getInsights } from "../services/insights.ts";
import { triageContext } from "../services/settings.ts";
import { createTask } from "../services/tasks.ts";

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

export const growRoutes = (ctx: AppContext) =>
  new Hono()
    /* ---------------- Circle of Concern / Influence ---------------- */
    .get("/concerns", (c) => c.json(ctx.db.select().from(concerns).orderBy(desc(concerns.createdAt)).all()))
    .post("/concerns", v("json", z.object(concernFields).partial().required({ title: true })), (c) =>
      c.json(ctx.db.insert(concerns).values(c.req.valid("json")).returning().get()),
    )
    .patch("/concerns/:id", v("param", idParam), v("json", z.object(concernFields).partial()), (c) => {
      const row = ctx.db.update(concerns).set(c.req.valid("json")).where(eq(concerns.id, c.req.valid("param").id)).returning().get();
      if (!row) return c.json({ error: "Concern not found" }, 404);
      return c.json(row);
    })
    .delete("/concerns/:id", v("param", idParam), (c) => {
      ctx.db.delete(concerns).where(eq(concerns.id, c.req.valid("param").id)).run();
      return c.json({ ok: true });
    })
    .post(
      "/concerns/:id/first-step",
      v("param", idParam),
      v("json", z.object({ title: z.string().trim().min(1).max(500).optional(), roleId: z.string().nullable().optional(), scheduledDate: isoDate.nullable().optional() })),
      (c) => {
        const { id } = c.req.valid("param");
        const body = c.req.valid("json");
        const concern = ctx.db.select().from(concerns).where(eq(concerns.id, id)).get();
        if (!concern) return c.json({ error: "Concern not found" }, 404);
        const title = body.title ?? (concern.firstStep.trim() || `First step: ${concern.title}`);
        const task = createTask(
          ctx.db,
          {
            title,
            important: true,
            urgent: null,
            roleId: body.roleId ?? null,
            scheduledDate: body.scheduledDate ?? null,
            source: "influence",
            why: `Inside my Circle of Influence: ${concern.title}`,
          },
          triageContext(ctx.db),
        );
        const updated = ctx.db
          .update(concerns)
          .set({ taskId: task.id, status: concern.status === "open" ? "acting" : concern.status, firstStep: concern.firstStep || title })
          .where(eq(concerns.id, id))
          .returning()
          .get();
        return c.json({ concern: updated, task });
      },
    )

    /* ---------------- Stewardship delegation ---------------- */
    .get("/delegations", (c) => {
      const rows = ctx.db.select().from(delegations).orderBy(asc(delegations.status), desc(delegations.createdAt)).all();
      const checkins = ctx.db.select().from(delegationCheckins).orderBy(desc(delegationCheckins.date)).all();
      return c.json(rows.map((d) => ({ ...d, checkins: checkins.filter((x) => x.delegationId === d.id) })));
    })
    .post(
      "/delegations",
      v("json", z.object({ ...delegationFields, taskId: z.string().nullable() }).partial().required({ title: true })),
      (c) => {
        const { taskId, ...body } = c.req.valid("json");
        const today = todayISO();
        const task = taskId ? ctx.db.select().from(tasks).where(eq(tasks.id, taskId)).get() : undefined;
        if (taskId && !task) return c.json({ error: "Task not found" }, 404);
        // A delegated task keeps its deadline and role: the stewardship carries them from now on,
        // and the first check-in comes no later than the deadline.
        const dueDate = body.dueDate !== undefined ? body.dueDate : (task?.dueDate ?? null);
        const roleId = body.roleId !== undefined ? body.roleId : (task?.roleId ?? null);
        const byCadence = body.checkinEveryDays ? addDaysISO(today, body.checkinEveryDays) : null;
        const nextCheckin = body.nextCheckin ?? (byCadence && dueDate && dueDate < byCadence ? dueDate : byCadence);
        const row = ctx.db
          .insert(delegations)
          .values({ ...body, dueDate, roleId, nextCheckin })
          .returning()
          .get();
        if (taskId) {
          // The task leaves your plate: the stewardship now tracks it.
          ctx.db
            .update(tasks)
            .set({ delegationId: row.id, status: "dropped", statusReason: "delegated", statusNote: `Delegated to ${row.delegate || "someone"}` })
            .where(eq(tasks.id, taskId))
            .run();
        }
        return c.json({ ...row, checkins: [] as (typeof delegationCheckins.$inferSelect)[] });
      },
    )
    .patch("/delegations/:id", v("param", idParam), v("json", z.object(delegationFields).partial()), (c) => {
      const row = ctx.db
        .update(delegations)
        .set(c.req.valid("json"))
        .where(eq(delegations.id, c.req.valid("param").id))
        .returning()
        .get();
      if (!row) return c.json({ error: "Stewardship not found" }, 404);
      return c.json(row);
    })
    .delete("/delegations/:id", v("param", idParam), (c) => {
      ctx.db.delete(delegations).where(eq(delegations.id, c.req.valid("param").id)).run();
      return c.json({ ok: true });
    })
    .post(
      "/delegations/:id/checkins",
      v("param", idParam),
      v("json", z.object({ date: isoDate.optional(), notes: z.string().max(5000).default(""), onTrack: z.boolean().nullable().optional() })),
      (c) => {
        const { id } = c.req.valid("param");
        const body = c.req.valid("json");
        const d = ctx.db.select().from(delegations).where(eq(delegations.id, id)).get();
        if (!d) return c.json({ error: "Stewardship not found" }, 404);
        const date = body.date ?? todayISO();
        const row = ctx.db
          .insert(delegationCheckins)
          .values({ delegationId: id, date, notes: body.notes, onTrack: body.onTrack ?? null })
          .returning()
          .get();
        ctx.db
          .update(delegations)
          .set({ nextCheckin: d.checkinEveryDays ? addDaysISO(date, d.checkinEveryDays) : null })
          .where(eq(delegations.id, id))
          .run();
        return c.json(row);
      },
    )

    /* ---------------- Journal ---------------- */
    .get(
      "/journal",
      v("query", z.object({ kind: z.string().optional(), from: isoDate.optional(), to: isoDate.optional(), limit: z.coerce.number().int().min(1).max(1000).optional() })),
      (c) => {
        const q = c.req.valid("query");
        const conds = [];
        if (q.kind) conds.push(eq(journal.kind, q.kind));
        if (q.from) conds.push(gte(journal.date, q.from));
        if (q.to) conds.push(lte(journal.date, q.to));
        return c.json(
          ctx.db
            .select()
            .from(journal)
            .where(conds.length ? and(...conds) : undefined)
            .orderBy(desc(journal.date), desc(journal.createdAt))
            .limit(q.limit ?? 200)
            .all(),
        );
      },
    )
    .post("/journal", v("json", z.object(journalFields).partial().required({ kind: true, body: true })), (c) => {
      const body = c.req.valid("json");
      return c.json(ctx.db.insert(journal).values({ ...body, date: body.date ?? todayISO() }).returning().get());
    })
    .put(
      "/journal/daily/:date",
      v("param", z.object({ date: isoDate })),
      v("json", z.object({ body: z.string().max(50000), data: z.record(z.string(), z.unknown()).nullable().optional() })),
      (c) => {
        const { date } = c.req.valid("param");
        const body = c.req.valid("json");
        const existing = ctx.db
          .select()
          .from(journal)
          .where(and(eq(journal.kind, "daily"), eq(journal.date, date)))
          .get();
        // Never keep an empty reflection around.
        const empty = !body.body.trim() && Object.values(body.data ?? {}).every((v) => !String(v ?? "").trim());
        if (empty) {
          if (existing) ctx.db.delete(journal).where(eq(journal.id, existing.id)).run();
          return c.json(null);
        }
        if (existing) {
          return c.json(ctx.db.update(journal).set(body).where(eq(journal.id, existing.id)).returning().get());
        }
        return c.json(ctx.db.insert(journal).values({ ...body, date, kind: "daily" }).returning().get());
      },
    )
    .patch("/journal/:id", v("param", idParam), v("json", z.object(journalFields).partial()), (c) => {
      const row = ctx.db.update(journal).set(c.req.valid("json")).where(eq(journal.id, c.req.valid("param").id)).returning().get();
      if (!row) return c.json({ error: "Entry not found" }, 404);
      return c.json(row);
    })
    .delete("/journal/:id", v("param", idParam), (c) => {
      ctx.db.delete(journal).where(eq(journal.id, c.req.valid("param").id)).run();
      return c.json({ ok: true });
    })

    /* ---------------- Time audit ---------------- */
    .get("/audits", (c) => c.json(ctx.db.select().from(timeAudits).orderBy(desc(timeAudits.createdAt)).all()))
    .post("/audits", v("json", z.object(auditFields).partial().required({ startDate: true })), (c) =>
      c.json(ctx.db.insert(timeAudits).values(c.req.valid("json")).returning().get()),
    )
    .patch("/audits/:id", v("param", idParam), v("json", z.object({ ...auditFields, completed: z.boolean() }).partial()), (c) => {
      const { completed, ...rest } = c.req.valid("json");
      const row = ctx.db
        .update(timeAudits)
        .set({ ...rest, ...(completed !== undefined ? { completedAt: completed ? new Date().toISOString() : null } : {}) })
        .where(eq(timeAudits.id, c.req.valid("param").id))
        .returning()
        .get();
      if (!row) return c.json({ error: "Audit not found" }, 404);
      return c.json(row);
    })
    .delete("/audits/:id", v("param", idParam), (c) => {
      ctx.db.delete(timeAudits).where(eq(timeAudits.id, c.req.valid("param").id)).run();
      return c.json({ ok: true });
    })
    .get("/time-entries", v("query", z.object({ from: isoDate, to: isoDate })), (c) => {
      const { from, to } = c.req.valid("query");
      return c.json(
        ctx.db
          .select()
          .from(timeEntries)
          .where(and(gte(timeEntries.date, from), lte(timeEntries.date, to)))
          .orderBy(asc(timeEntries.date), asc(timeEntries.slot))
          .all(),
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
      (c) => {
        const { entries } = c.req.valid("json");
        ctx.db.transaction((tx) => {
          for (const e of entries) {
            tx.delete(timeEntries)
              .where(and(eq(timeEntries.date, e.date), eq(timeEntries.slot, e.slot)))
              .run();
            if (e.quadrant != null) {
              tx.insert(timeEntries)
                .values({ date: e.date, slot: e.slot, quadrant: e.quadrant, roleId: e.roleId ?? null, note: e.note ?? "" })
                .run();
            }
          }
        });
        return c.json({ ok: true, count: entries.length });
      },
    )

    /* ---------------- 30-day proactivity test ---------------- */
    .get("/challenge", (c) => {
      const all = ctx.db.select().from(challenges).orderBy(desc(challenges.createdAt)).all();
      const active = all.find((x) => x.status === "active") ?? null;
      const days = active
        ? ctx.db
            .select()
            .from(challengeDays)
            .where(eq(challengeDays.challengeId, active.id))
            .orderBy(asc(challengeDays.date))
            .all()
        : [];
      return c.json({ active, days, history: all.filter((x) => x.status !== "active") });
    })
    .post("/challenge", v("json", z.object({ startedOn: isoDate.optional() })), (c) => {
      const existing = ctx.db.select().from(challenges).where(eq(challenges.status, "active")).get();
      if (existing) return c.json(existing);
      return c.json(ctx.db.insert(challenges).values({ startedOn: c.req.valid("json").startedOn ?? todayISO() }).returning().get());
    })
    .patch("/challenge/:id", v("param", idParam), v("json", z.object({ status: z.enum(["active", "completed", "abandoned"]) })), (c) => {
      const { status } = c.req.valid("json");
      const row = ctx.db
        .update(challenges)
        .set({ status, completedAt: status === "active" ? null : new Date().toISOString() })
        .where(eq(challenges.id, c.req.valid("param").id))
        .returning()
        .get();
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
      (c) => {
        const { id, date } = c.req.valid("param");
        const body = c.req.valid("json");
        const existing = ctx.db
          .select()
          .from(challengeDays)
          .where(and(eq(challengeDays.challengeId, id), eq(challengeDays.date, date)))
          .get();
        if (existing) {
          return c.json(ctx.db.update(challengeDays).set(body).where(eq(challengeDays.id, existing.id)).returning().get());
        }
        return c.json(ctx.db.insert(challengeDays).values({ ...body, challengeId: id, date }).returning().get());
      },
    )

    /* ---------------- Self-checks ---------------- */
    .get("/assessments", v("query", z.object({ kind: z.enum(["urgency", "center"]).optional() })), (c) => {
      const { kind } = c.req.valid("query");
      return c.json(
        ctx.db
          .select()
          .from(assessments)
          .where(kind ? eq(assessments.kind, kind) : undefined)
          .orderBy(desc(assessments.createdAt))
          .all(),
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
      (c) => c.json(ctx.db.insert(assessments).values(c.req.valid("json")).returning().get()),
    )
    .delete("/assessments/:id", v("param", idParam), (c) => {
      ctx.db.delete(assessments).where(eq(assessments.id, c.req.valid("param").id)).run();
      return c.json({ ok: true });
    })

    /* ---------------- Insights ---------------- */
    .get("/insights", v("query", z.object({ weeks: z.coerce.number().int().min(4).max(52).optional() })), (c) =>
      c.json(getInsights(ctx.db, c.req.valid("query").weeks ?? 12)),
    );
