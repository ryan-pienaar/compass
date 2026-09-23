import { and, eq, gte, inArray, lte } from "drizzle-orm";
import { addDaysISO, addWeeksISO, startOfDayTimestamp, todayISO, weekStartFor } from "../../shared/dates.ts";
import { integritySummary } from "../../shared/integrity.ts";
import type { DB } from "../db/client.ts";
import { blocks, concerns, delegations, tasks, timeAudits, timeEntries, weeks } from "../db/schema.ts";
import { blockMinutes, toBlockDTO, toTaskDTO, type TaskDTO, type TriageCtx } from "./dto.ts";
import { listRoles } from "./roles.ts";
import { getSettings } from "./settings.ts";

export function getInsights(db: DB, count = 12, today = todayISO()) {
  const settings = getSettings(db);
  const ctx: TriageCtx = { today, urgentWithinDays: settings.urgentWithinDays };
  const current = weekStartFor(today, settings.weekStartsOn);
  const starts = Array.from({ length: count }, (_, i) => addWeeksISO(current, -(count - 1 - i)));
  const rangeStart = starts[0];
  const rangeEnd = addDaysISO(current, 6);
  const roles = listRoles(db, true);

  const allBlocks = db
    .select()
    .from(blocks)
    .where(and(gte(blocks.date, rangeStart), lte(blocks.date, rangeEnd)))
    .all();
  const taskIds = [...new Set(allBlocks.map((b) => b.taskId).filter((x): x is string => !!x))];
  const taskMap = new Map<string, TaskDTO>();
  if (taskIds.length) {
    for (const r of db.select().from(tasks).where(inArray(tasks.id, taskIds)).all()) taskMap.set(r.id, toTaskDTO(r, ctx));
  }
  const blockDTOs = allBlocks.map((b) => toBlockDTO(b, b.taskId ? taskMap.get(b.taskId) : undefined));

  const weekRows = db.select().from(weeks).where(inArray(weeks.startDate, starts)).all();
  const weekByStart = new Map(weekRows.map((w) => [w.startDate, w]));

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
    const goalRows = w
      ? db
          .select()
          .from(tasks)
          .where(and(eq(tasks.weekId, w.id), eq(tasks.kind, "goal")))
          .all()
      : [];
    const integrity = integritySummary(goalRows);
    return {
      weekStart: ws,
      status: w?.status ?? null,
      rating: w?.reviewRating ?? null,
      plannedMinutes: wb.reduce((s, b) => s + blockMinutes(b), 0),
      byQuadrant,
      byRole,
      goals: goalRows.length,
      goalsDone: integrity.done,
      integrity: integrity.score,
      rolesCovered: new Set(goalRows.map((g) => g.roleId).filter(Boolean)).size,
      sawCovered: new Set(goalRows.map((g) => g.sawDimension).filter(Boolean)).size,
    };
  });

  // Tasks completed in the range, grouped by the quadrant they were in when captured.
  const completed = db
    .select()
    .from(tasks)
    .where(and(eq(tasks.status, "done"), gte(tasks.completedAt, startOfDayTimestamp(rangeStart))))
    .all();
  const completedByCreatedQuadrant = { q1: 0, q2: 0, q3: 0, q4: 0, none: 0 };
  for (const t of completed) {
    const key = t.createdQuadrant ? (`q${t.createdQuadrant}` as "q1") : "none";
    completedByCreatedQuadrant[key]++;
  }

  // Quadrant II work that has become urgent: the cost of putting it off.
  const openTasks = db.select().from(tasks).where(eq(tasks.status, "open")).all();
  const drift = openTasks
    .map((r) => toTaskDTO(r, ctx))
    .filter((t) => t.createdQuadrant === 2 && t.quadrant === 1)
    .map((t) => ({ id: t.id, title: t.title, dueDate: t.dueDate }));

  const declined = db
    .select()
    .from(tasks)
    .where(and(eq(tasks.status, "dropped"), gte(tasks.updatedAt, startOfDayTimestamp(rangeStart))))
    .all()
    .filter((t) => t.statusReason === "declined" || t.statusReason === "delegated").length;

  const concernRows = db.select({ status: concerns.status, control: concerns.control }).from(concerns).all();
  const delegationRows = db.select({ status: delegations.status }).from(delegations).all();

  const audit = db.select().from(timeAudits).all().sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null;
  let auditActual: { q1: number; q2: number; q3: number; q4: number; slots: number } | null = null;
  if (audit) {
    const end = addDaysISO(audit.startDate, audit.days - 1);
    const entries = db
      .select()
      .from(timeEntries)
      .where(and(gte(timeEntries.date, audit.startDate), lte(timeEntries.date, end)))
      .all();
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
