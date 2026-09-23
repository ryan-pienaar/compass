import { and, asc, desc, eq, isNull, lt, ne, or } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import type { ApiEnv, AppContext } from "../context.ts";
import { blocks, journal, tasks, weeks } from "../db/schema.ts";
import { idParam, isoDate, minuteOfDay, quadrantNum, sawDimension, startParam, v } from "../lib/validate.ts";
import { byPriority, toBlockDTO, toTaskDTO } from "../services/dto.ts";
import { assertOwned } from "../services/owned.ts";
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

export const planRoutes = (_ctx: AppContext) =>
  new Hono<ApiEnv>()
    /* ---------------- Weeks ---------------- */
    .get("/weeks", v("query", z.object({ limit: z.coerce.number().int().min(1).max(104).optional() })), async (c) =>
      c.json(await weekHistory(c.var.scope, c.req.valid("query").limit ?? 12)),
    )
    .get("/weeks/:start", v("param", startParam), async (c) => c.json(await getBoard(c.var.scope, c.req.valid("param").start)))
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
      async (c) => {
        const s = c.var.scope;
        const week = await ensureWeek(s, c.req.valid("param").start);
        const [row] = await s.db
          .update(weeks)
          .set(c.req.valid("json"))
          .where(and(eq(weeks.id, week.id), eq(weeks.userId, s.userId)))
          .returning();
        return c.json(row);
      },
    )
    .put("/weeks/:start/roles", v("param", startParam), v("json", z.object({ roleIds: z.array(z.string()) })), async (c) => {
      await setWeekRoles(c.var.scope, c.req.valid("param").start, c.req.valid("json").roleIds);
      return c.json({ ok: true });
    })
    .post("/weeks/:start/commit", v("param", startParam), async (c) => c.json(await commitWeek(c.var.scope, c.req.valid("param").start)))
    .get("/weeks/:start/review", v("param", startParam), async (c) => c.json(await getReview(c.var.scope, c.req.valid("param").start)))
    .post("/weeks/:start/review", v("param", startParam), v("json", reviewBody), async (c) =>
      c.json(await applyReview(c.var.scope, c.req.valid("param").start, c.req.valid("json"))),
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
      async (c) => {
        const s = c.var.scope;
        const q = c.req.valid("query");
        const tctx = await triageContext(s);
        const conds = [eq(tasks.userId, s.userId)];
        const view = q.view ?? "open";
        if (view === "open" || view === "inbox" || view === "backlog") conds.push(eq(tasks.status, "open"));
        if (view === "done") conds.push(eq(tasks.status, "done"));
        if (view === "dropped") conds.push(ne(tasks.status, "open"), ne(tasks.status, "done"));
        // The backlog also takes back anything planned for a day that has passed: it still needs a decision.
        if (view === "backlog") conds.push(eq(tasks.kind, "task"), or(isNull(tasks.scheduledDate), lt(tasks.scheduledDate, tctx.today))!);
        if (q.roleId) conds.push(eq(tasks.roleId, q.roleId));
        if (q.goalId) conds.push(eq(tasks.goalId, q.goalId));
        if (q.kind) conds.push(eq(tasks.kind, q.kind));
        const rows = await s.db
          .select()
          .from(tasks)
          .where(and(...conds))
          .orderBy(view === "done" ? desc(tasks.completedAt) : asc(tasks.createdAt))
          .limit(view === "done" || view === "all" || view === "dropped" ? 500 : 2000);
        let list = rows.map((r) => toTaskDTO(r, tctx));
        if (view === "inbox") list = list.filter((t) => t.inbox);
        return c.json(list);
      },
    )
    .get("/tasks/:id", v("param", idParam), async (c) => {
      const s = c.var.scope;
      const row = await getTask(s, c.req.valid("param").id);
      if (!row) return c.json({ error: "Task not found" }, 404);
      return c.json(toTaskDTO(row, await triageContext(s)));
    })
    .post("/tasks", v("json", taskCreate), async (c) => {
      const s = c.var.scope;
      const { weekStart, ...body } = c.req.valid("json");
      await assertOwned(s, { roleId: body.roleId, goalId: body.goalId, parentId: body.parentId, delegationId: body.delegationId });
      const tctx = await triageContext(s);
      const weekId = weekStart ? (await ensureWeek(s, weekStart)).id : undefined;
      return c.json(await createTask(s, { ...body, ...(weekId ? { weekId } : {}) }, tctx));
    })
    .patch("/tasks/:id", v("param", idParam), v("json", taskPatch), async (c) => {
      const s = c.var.scope;
      const { weekStart, ...body } = c.req.valid("json");
      await assertOwned(s, { roleId: body.roleId, goalId: body.goalId, parentId: body.parentId, delegationId: body.delegationId });
      const tctx = await triageContext(s);
      const patch = { ...body, ...(weekStart !== undefined ? { weekId: weekStart ? (await ensureWeek(s, weekStart)).id : null } : {}) };
      const row = await updateTask(s, c.req.valid("param").id, patch, tctx);
      if (!row) return c.json({ error: "Task not found" }, 404);
      return c.json(row);
    })
    .delete("/tasks/:id", v("param", idParam), async (c) => c.json({ ok: await deleteTask(c.var.scope, c.req.valid("param").id) }))
    .post("/tasks/:id/prevent", v("param", idParam), v("json", z.object({ title: z.string().max(500).optional() })), async (c) => {
      const s = c.var.scope;
      const row = await createPreventionTask(s, c.req.valid("param").id, c.req.valid("json").title, await triageContext(s));
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
      async (c) => {
        const s = c.var.scope;
        const { id } = c.req.valid("param");
        const { toDate, reason, note } = c.req.valid("json");
        const tctx = await triageContext(s);
        const current = await getTask(s, id);
        if (!current) return c.json({ error: "Task not found" }, 404);
        const row = await updateTask(s, id, { scheduledDate: toDate, priority: toDate ? current.priority : null }, tctx);
        // Record the moment of choice (no judgement, just awareness for the weekly review).
        if (reason) {
          await s.db.insert(journal).values({
            userId: s.userId,
            date: tctx.today,
            kind: "choice",
            title: current.title,
            body: note ?? "",
            data: { taskId: id, from: current.scheduledDate, to: toDate, reason },
          });
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
      async (c) => {
        await reorderDay(c.var.scope, c.req.valid("param").date, c.req.valid("json").items);
        return c.json({ ok: true });
      },
    )

    /* ---------------- Calendar blocks ---------------- */
    .post("/blocks", v("json", z.object(blockFields).partial().required({ date: true, startMin: true, endMin: true })), async (c) => {
      const s = c.var.scope;
      const body = c.req.valid("json");
      if (body.endMin <= body.startMin) return c.json({ error: "A block must end after it starts." }, 400);
      await assertOwned(s, { roleId: body.roleId });
      const tctx = await triageContext(s);
      const task = body.taskId ? await getTask(s, body.taskId) : undefined;
      if (body.taskId && !task) return c.json({ error: "Task not found" }, 404);
      const [row] = await s.db
        .insert(blocks)
        .values({
          ...body,
          userId: s.userId,
          title: body.title ?? task?.title ?? "",
          roleId: body.roleId !== undefined ? body.roleId : (task?.roleId ?? null),
          kind: body.kind ?? (task ? "focus" : "appointment"),
        })
        .returning();
      return c.json(toBlockDTO(row, task ? toTaskDTO(task, tctx) : undefined));
    })
    .patch("/blocks/:id", v("param", idParam), v("json", z.object(blockFields).partial()), async (c) => {
      const s = c.var.scope;
      const { id } = c.req.valid("param");
      const body = c.req.valid("json");
      await assertOwned(s, { roleId: body.roleId, taskId: body.taskId });
      const mine = and(eq(blocks.id, id), eq(blocks.userId, s.userId));
      const [current] = await s.db.select().from(blocks).where(mine).limit(1);
      if (!current) return c.json({ error: "Block not found" }, 404);
      const start = body.startMin ?? current.startMin;
      const end = body.endMin ?? current.endMin;
      if (end <= start) return c.json({ error: "A block must end after it starts." }, 400);
      const [row] = await s.db.update(blocks).set(body).where(mine).returning();
      const task = row.taskId ? await getTask(s, row.taskId) : undefined;
      return c.json(toBlockDTO(row, task ? toTaskDTO(task, await triageContext(s)) : undefined));
    })
    .delete("/blocks/:id", v("param", idParam), async (c) => {
      const s = c.var.scope;
      await s.db.delete(blocks).where(and(eq(blocks.id, c.req.valid("param").id), eq(blocks.userId, s.userId)));
      return c.json({ ok: true });
    })

    /* ---------------- Today ---------------- */
    .get("/today", v("query", z.object({ date: isoDate.optional() })), async (c) => {
      const s = c.var.scope;
      return c.json(await getToday(s, c.req.valid("query").date ?? s.today));
    })
    .get("/day/:date/tasks", v("param", z.object({ date: isoDate })), async (c) => {
      const s = c.var.scope;
      const tctx = await triageContext(s);
      const rows = await s.db
        .select()
        .from(tasks)
        .where(and(eq(tasks.userId, s.userId), eq(tasks.scheduledDate, c.req.valid("param").date)));
      return c.json(rows.sort(byPriority).map((r) => toTaskDTO(r, tctx)));
    });
