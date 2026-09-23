import { and, desc, eq, gte, inArray, lte } from "drizzle-orm";
import { addDaysISO, addWeeksISO, startOfDayInZone, weekStartFor } from "../../shared/dates.ts";
import { integritySummary } from "../../shared/integrity.ts";
import type { Scope } from "../context.ts";
import { blocks, concerns, delegations, tasks, timeAudits, timeEntries, weeks } from "../db/schema.ts";
import { blockMinutes, toBlockDTO, toTaskDTO, type TaskDTO, type TaskRow, type TriageCtx } from "./dto.ts";
import { listRoles } from "./roles.ts";
import { getSettings } from "./settings.ts";

export async function getInsights(s: Scope, count = 12) {
  const settings = await getSettings(s);
  const ctx: TriageCtx = { today: s.today, urgentWithinDays: settings.urgentWithinDays };
  const current = weekStartFor(s.today, settings.weekStartsOn);
  const starts = Array.from({ length: count }, (_, i) => addWeeksISO(current, -(count - 1 - i)));
  const rangeStart = starts[0];
  const rangeEnd = addDaysISO(current, 6);
  // Timestamps are instants; the range starts at midnight where the user lives.
  const since = startOfDayInZone(rangeStart, s.timeZone);
  const mineTask = eq(tasks.userId, s.userId);

  const [roles, allBlocks, weekRows, completed, openTasks, dropped, concernRows, delegationRows, auditRows] = await Promise.all([
    listRoles(s, true),
    s.db
      .select()
      .from(blocks)
      .where(and(eq(blocks.userId, s.userId), gte(blocks.date, rangeStart), lte(blocks.date, rangeEnd))),
    s.db
      .select()
      .from(weeks)
      .where(and(eq(weeks.userId, s.userId), inArray(weeks.startDate, starts))),
    s.db
      .select()
      .from(tasks)
      .where(and(mineTask, eq(tasks.status, "done"), gte(tasks.completedAt, since))),
    s.db
      .select()
      .from(tasks)
      .where(and(mineTask, eq(tasks.status, "open"))),
    s.db
      .select()
      .from(tasks)
      .where(and(mineTask, eq(tasks.status, "dropped"), gte(tasks.updatedAt, since))),
    s.db.select({ status: concerns.status, control: concerns.control }).from(concerns).where(eq(concerns.userId, s.userId)),
    s.db.select({ status: delegations.status }).from(delegations).where(eq(delegations.userId, s.userId)),
    s.db.select().from(timeAudits).where(eq(timeAudits.userId, s.userId)).orderBy(desc(timeAudits.createdAt)).limit(1),
  ]);

  const taskIds = [...new Set(allBlocks.map((b) => b.taskId).filter((x): x is string => !!x))];
  const taskMap = new Map<string, TaskDTO>();
  if (taskIds.length) {
    const rows = await s.db
      .select()
      .from(tasks)
      .where(and(mineTask, inArray(tasks.id, taskIds)));
    for (const r of rows) taskMap.set(r.id, toTaskDTO(r, ctx));
  }
  const blockDTOs = allBlocks.map((b) => toBlockDTO(b, b.taskId ? taskMap.get(b.taskId) : undefined));

  const weekByStart = new Map(weekRows.map((w) => [w.startDate, w]));
  const weekIds = weekRows.map((w) => w.id);
  const goalRows: TaskRow[] = weekIds.length
    ? await s.db
        .select()
        .from(tasks)
        .where(and(mineTask, inArray(tasks.weekId, weekIds), eq(tasks.kind, "goal")))
    : [];

  const perWeek = starts.map((ws) => {
    const we = addDaysISO(ws, 6);
    const wb = blockDTOs.filter((b) => b.date >= ws && b.date <= we && b.status !== "skipped");
    const byQuadrant = { q1: 0, q2: 0, q3: 0, q4: 0, none: 0 };
    const byRole: Record<string, number> = {};
    for (const b of wb) {
      const m = blockMinutes(b);
      const key = b.effectiveQuadrant ? (`q${b.effectiveQuadrant}` as const) : "none";
      byQuadrant[key] += m;
      if (b.effectiveRoleId) byRole[b.effectiveRoleId] = (byRole[b.effectiveRoleId] ?? 0) + m;
    }
    const w = weekByStart.get(ws);
    const goals = w ? goalRows.filter((g) => g.weekId === w.id) : [];
    const integrity = integritySummary(goals);
    return {
      weekStart: ws,
      status: w?.status ?? null,
      rating: w?.reviewRating ?? null,
      plannedMinutes: wb.reduce((sum, b) => sum + blockMinutes(b), 0),
      byQuadrant,
      byRole,
      goals: goals.length,
      goalsDone: integrity.done,
      integrity: integrity.score,
      rolesCovered: new Set(goals.map((g) => g.roleId).filter(Boolean)).size,
      sawCovered: new Set(goals.map((g) => g.sawDimension).filter(Boolean)).size,
    };
  });

  // Tasks completed in the range, grouped by the quadrant they were in when captured.
  const completedByCreatedQuadrant = { q1: 0, q2: 0, q3: 0, q4: 0, none: 0 };
  for (const t of completed) {
    const key = t.createdQuadrant ? (`q${t.createdQuadrant}` as "q1") : "none";
    completedByCreatedQuadrant[key]++;
  }

  // Quadrant II work that has become urgent: the cost of putting it off.
  const drift = openTasks
    .map((r) => toTaskDTO(r, ctx))
    .filter((t) => t.createdQuadrant === 2 && t.quadrant === 1)
    .map((t) => ({ id: t.id, title: t.title, dueDate: t.dueDate }));

  const declined = dropped.filter((t) => t.statusReason === "declined" || t.statusReason === "delegated").length;

  const audit = auditRows[0] ?? null;
  let auditActual: { q1: number; q2: number; q3: number; q4: number; slots: number } | null = null;
  if (audit) {
    const end = addDaysISO(audit.startDate, audit.days - 1);
    const entries = await s.db
      .select()
      .from(timeEntries)
      .where(and(eq(timeEntries.userId, s.userId), gte(timeEntries.date, audit.startDate), lte(timeEntries.date, end)));
    auditActual = { q1: 0, q2: 0, q3: 0, q4: 0, slots: entries.length };
    for (const e of entries) auditActual[`q${e.quadrant}` as "q1"]++;
  }

  return {
    weeks: perWeek,
    roles,
    completedByCreatedQuadrant,
    drift,
    declined,
    concerns: {
      total: concernRows.length,
      acting: concernRows.filter((c) => c.status === "acting").length,
      resolved: concernRows.filter((c) => c.status === "resolved" || c.status === "accepted").length,
      unsorted: concernRows.filter((c) => !c.control).length,
    },
    delegations: {
      active: delegationRows.filter((d) => d.status === "active").length,
      done: delegationRows.filter((d) => d.status === "done").length,
    },
    audit: audit ? { ...audit, actual: auditActual } : null,
  };
}
