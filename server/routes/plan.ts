import { and, asc, desc, eq, isNull, lt, ne, or } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { isValidISODate, todayISO } from "../../shared/dates.ts";
import type { AppContext } from "../context.ts";
import { blocks, journal, tasks, weeks } from "../db/schema.ts";
import { idParam, isoDate, minuteOfDay, quadrantNum, sawDimension, startParam, v } from "../lib/validate.ts";
import { byPriority, toBlockDTO, toTaskDTO } from "../services/dto.ts";
import { triageContext } from "../services/settings.ts";
import { createPreventionTask, createTask, deleteTask, getTask, reorderDay, updateTask } from "../services/tasks.ts";
import { getToday } from "../services/today.ts";
import { applyReview, commitWeek, ensureWeek, getBoard, getReview, setWeekRoles, weekHistory } from "../services/weeks.ts";

const taskFields = {
  title: z.string().trim().min(1).max(500),
  notes: z.string().max(20000),
  kind: z.enum(["task", "goal"]),
  endInMind: z.string().max(5000),
  why: z.string().max(2000),
  ifThen: z.string().max(2000),
  roleId: z.string().nullable(),
  goalId: z.string().nullable(),
  parentId: z.string().nullable(),
  sawDimension: sawDimension.nullable(),
  important: z.boolean().nullable(),
  urgent: z.boolean().nullable(),
  dueDate: isoDate.nullable(),
  scheduledDate: isoDate.nullable(),
  priority: z.enum(["A", "B", "C"]).nullable(),
  sortOrder: z.number(),
  estimateMinutes: z.number().int().min(0).max(1440).nullable(),
  actualMinutes: z.number().int().min(0).max(100000),
  status: z.enum(["open", "done", "missed", "dropped"]),
  statusReason: z.string().max(64).nullable(),
  statusNote: z.string().max(5000),
  delegationId: z.string().nullable(),
  source: z.string().max(32).nullable(),
};
const taskCreate = z
  .object({ ...taskFields, weekStart: isoDate })
  .partial()
  .required({ title: true });
const taskPatch = z.object({ ...taskFields, weekStart: isoDate.nullable() }).partial();

const blockFields = {
  date: isoDate,
  startMin: minuteOfDay,
  endMin: minuteOfDay,
  title: z.string().max(300),
  notes: z.string().max(5000),
  taskId: z.string().nullable(),
  roleId: z.string().nullable(),
  kind: z.enum(["focus", "appointment"]),
  quadrant: quadrantNum.nullable(),
  status: z.enum(["planned", "done", "skipped"]),
};

const reviewBody = z.object({
  dispositions: z.array(
    z.object({
      taskId: z.string(),
      outcome: z.enum(["done", "missed", "dropped"]),
      reason: z.enum(["higher_value", "integrity", "overcommitted", "no_longer_relevant"]).nullable().optional(),
      note: z.string().max(2000).optional(),
      carry: z.boolean().optional(),
    }),
  ),
  carryTo: isoDate.optional(),
  rating: z.number().int().min(1).max(5).nullable().optional(),
  notes: z.string().max(10000).optional(),
  lessons: z.string().max(10000).optional(),
  wins: z.string().max(10000).optional(),
});

export const planRoutes = (ctx: AppContext) =>
  new Hono()
    /* ---------------- Weeks ---------------- */
    .get("/weeks", v("query", z.object({ limit: z.coerce.number().int().min(1).max(104).optional() })), (c) =>
      c.json(weekHistory(ctx.db, c.req.valid("query").limit ?? 12)),
    )
    .get("/weeks/:start", v("param", startParam), (c) => c.json(getBoard(ctx.db, c.req.valid("param").start)))
    .patch(
      "/weeks/:start",
      v("param", startParam),
      v(
        "json",
        z
          .object({
            intention: z.string().max(2000),
            reviewRating: z.number().int().min(1).max(5).nullable(),
            reviewNotes: z.string().max(10000),
            lessons: z.string().max(10000),
            wins: z.string().max(10000),
          })
          .partial(),
      ),
      (c) => {
        const week = ensureWeek(ctx.db, c.req.valid("param").start);
        const row = ctx.db.update(weeks).set(c.req.valid("json")).where(eq(weeks.id, week.id)).returning().get();
        return c.json(row);
      },
    )
    .put("/weeks/:start/roles", v("param", startParam), v("json", z.object({ roleIds: z.array(z.string()) })), (c) => {
      setWeekRoles(ctx.db, c.req.valid("param").start, c.req.valid("json").roleIds);
      return c.json({ ok: true });
    })
    .post("/weeks/:start/commit", v("param", startParam), (c) => c.json(commitWeek(ctx.db, c.req.valid("param").start)))
    .get("/weeks/:start/review", v("param", startParam), (c) => c.json(getReview(ctx.db, c.req.valid("param").start)))
    .post("/weeks/:start/review", v("param", startParam), v("json", reviewBody), (c) =>
      c.json(applyReview(ctx.db, c.req.valid("param").start, c.req.valid("json"))),
    )

    /* ---------------- Tasks ---------------- */
    .get(
      "/tasks",
      v(
        "query",
        z.object({
          view: z.enum(["open", "inbox", "done", "all", "backlog", "dropped"]).optional(),
          roleId: z.string().optional(),
          goalId: z.string().optional(),
          kind: z.enum(["task", "goal"]).optional(),
        }),
      ),
      (c) => {
        const q = c.req.valid("query");
        const tctx = triageContext(ctx.db);
        const conds = [];
        const view = q.view ?? "open";
        if (view === "open" || view === "inbox" || view === "backlog") conds.push(eq(tasks.status, "open"));
        if (view === "done") conds.push(eq(tasks.status, "done"));
        if (view === "dropped") conds.push(ne(tasks.status, "open"), ne(tasks.status, "done"));
        // The backlog also takes back anything planned for a day that has passed: it still needs a decision.
        if (view === "backlog") conds.push(eq(tasks.kind, "task"), or(isNull(tasks.scheduledDate), lt(tasks.scheduledDate, tctx.today)));
        if (q.roleId) conds.push(eq(tasks.roleId, q.roleId));
        if (q.goalId) conds.push(eq(tasks.goalId, q.goalId));
        if (q.kind) conds.push(eq(tasks.kind, q.kind));
        const rows = ctx.db
          .select()
          .from(tasks)
          .where(conds.length ? and(...conds) : undefined)
          .orderBy(view === "done" ? desc(tasks.completedAt) : asc(tasks.createdAt))
          .limit(view === "done" || view === "all" || view === "dropped" ? 500 : 2000)
          .all();
        let list = rows.map((r) => toTaskDTO(r, tctx));
        if (view === "inbox") list = list.filter((t) => t.inbox);
        return c.json(list);
      },
    )
    .get("/tasks/:id", v("param", idParam), (c) => {
      const row = getTask(ctx.db, c.req.valid("param").id);
      if (!row) return c.json({ error: "Task not found" }, 404);
      return c.json(toTaskDTO(row, triageContext(ctx.db)));
    })
    .post("/tasks", v("json", taskCreate), (c) => {
      const { weekStart, ...body } = c.req.valid("json");
      const tctx = triageContext(ctx.db);
      const weekId = weekStart ? ensureWeek(ctx.db, weekStart).id : undefined;
      return c.json(createTask(ctx.db, { ...body, ...(weekId ? { weekId } : {}) }, tctx));
    })
    .patch("/tasks/:id", v("param", idParam), v("json", taskPatch), (c) => {
      const { weekStart, ...body } = c.req.valid("json");
      const tctx = triageContext(ctx.db);
      const patch = { ...body, ...(weekStart !== undefined ? { weekId: weekStart ? ensureWeek(ctx.db, weekStart).id : null } : {}) };
      const row = updateTask(ctx.db, c.req.valid("param").id, patch, tctx);
      if (!row) return c.json({ error: "Task not found" }, 404);
      return c.json(row);
    })
    .delete("/tasks/:id", v("param", idParam), (c) => c.json({ ok: deleteTask(ctx.db, c.req.valid("param").id) }))
    .post("/tasks/:id/prevent", v("param", idParam), v("json", z.object({ title: z.string().max(500).optional() })), (c) => {
      const row = createPreventionTask(ctx.db, c.req.valid("param").id, c.req.valid("json").title, triageContext(ctx.db));
      if (!row) return c.json({ error: "Task not found" }, 404);
      return c.json(row);
    })
    .post(
      "/tasks/:id/reschedule",
      v("param", idParam),
      v(
        "json",
        z.object({
          toDate: isoDate.nullable(),
          reason: z.enum(["higher_value", "crisis", "interruption", "overplanned", "not_today", "other"]).optional(),
          note: z.string().max(2000).optional(),
        }),
      ),
      (c) => {
        const { id } = c.req.valid("param");
        const { toDate, reason, note } = c.req.valid("json");
        const tctx = triageContext(ctx.db);
        const current = getTask(ctx.db, id);
        if (!current) return c.json({ error: "Task not found" }, 404);
        const row = updateTask(ctx.db, id, { scheduledDate: toDate, priority: toDate ? current.priority : null }, tctx);
        // Record the moment of choice (no judgement, just awareness for the weekly review).
        if (reason) {
          ctx.db
            .insert(journal)
            .values({
              date: tctx.today,
              kind: "choice",
              title: current.title,
              body: note ?? "",
              data: { taskId: id, from: current.scheduledDate, to: toDate, reason },
            })
            .run();
        }
        return c.json(row);
      },
    )
    .put(
      "/tasks/day/:date/order",
      v("param", z.object({ date: isoDate })),
      v(
        "json",
        z.object({
          items: z.array(z.object({ id: z.string(), priority: z.enum(["A", "B", "C"]).nullable(), sortOrder: z.number() })),
        }),
      ),
      (c) => {
        reorderDay(ctx.db, c.req.valid("param").date, c.req.valid("json").items);
        return c.json({ ok: true });
      },
    )

    /* ---------------- Calendar blocks ---------------- */
    .post("/blocks", v("json", z.object(blockFields).partial().required({ date: true, startMin: true, endMin: true })), (c) => {
      const body = c.req.valid("json");
      if (body.endMin <= body.startMin) return c.json({ error: "A block must end after it starts." }, 400);
      const tctx = triageContext(ctx.db);
      const task = body.taskId ? getTask(ctx.db, body.taskId) : undefined;
      if (body.taskId && !task) return c.json({ error: "Task not found" }, 404);
      const row = ctx.db
        .insert(blocks)
        .values({
          ...body,
          title: body.title ?? task?.title ?? "",
          roleId: body.roleId !== undefined ? body.roleId : (task?.roleId ?? null),
          kind: body.kind ?? (task ? "focus" : "appointment"),
        })
        .returning()
        .get();
      return c.json(toBlockDTO(row, task ? toTaskDTO(task, tctx) : undefined));
    })
    .patch("/blocks/:id", v("param", idParam), v("json", z.object(blockFields).partial()), (c) => {
      const { id } = c.req.valid("param");
      const body = c.req.valid("json");
      const current = ctx.db.select().from(blocks).where(eq(blocks.id, id)).get();
      if (!current) return c.json({ error: "Block not found" }, 404);
      const start = body.startMin ?? current.startMin;
      const end = body.endMin ?? current.endMin;
      if (end <= start) return c.json({ error: "A block must end after it starts." }, 400);
      const row = ctx.db.update(blocks).set(body).where(eq(blocks.id, id)).returning().get();
      const task = row.taskId ? getTask(ctx.db, row.taskId) : undefined;
      return c.json(toBlockDTO(row, task ? toTaskDTO(task, triageContext(ctx.db)) : undefined));
    })
    .delete("/blocks/:id", v("param", idParam), (c) => {
      ctx.db.delete(blocks).where(eq(blocks.id, c.req.valid("param").id)).run();
      return c.json({ ok: true });
    })

    /* ---------------- Today ---------------- */
    .get("/today", v("query", z.object({ date: isoDate.optional() })), (c) => {
      const date = c.req.valid("query").date ?? todayISO();
      if (!isValidISODate(date)) return c.json({ error: "Invalid date" }, 400);
      return c.json(getToday(ctx.db, date));
    })
    .get("/day/:date/tasks", v("param", z.object({ date: isoDate })), (c) => {
      const tctx = triageContext(ctx.db);
      const rows = ctx.db.select().from(tasks).where(eq(tasks.scheduledDate, c.req.valid("param").date)).all();
      return c.json(rows.sort(byPriority).map((r) => toTaskDTO(r, tctx)));
    });
