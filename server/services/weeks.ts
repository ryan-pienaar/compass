import { and, asc, desc, eq, gte, inArray, lt, lte } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { addWeeksISO, todayISO, weekDays, weekStartFor } from "../../shared/dates.ts";
import { integritySummary, type MissReason } from "../../shared/integrity.ts";
import type { SawDimension } from "../../shared/content.ts";
import type { DB } from "../db/client.ts";
import { blocks, tasks, weekRoles, weeks } from "../db/schema.ts";
import { blockDone, blockMinutes, toBlockDTO, toTaskDTO, type BlockDTO, type TaskDTO, type TaskRow, type TriageCtx } from "./dto.ts";
import { listRoles, type RoleRow } from "./roles.ts";
import { getSettings } from "./settings.ts";

export type WeekRow = typeof weeks.$inferSelect;

export function getWeek(db: DB, start: string): WeekRow | undefined {
  return db.select().from(weeks).where(eq(weeks.startDate, start)).get();
}

/** A week that has not been touched yet: read-only views use this instead of inserting a row. */
function virtualWeek(start: string): WeekRow {
  const now = new Date().toISOString();
  return {
    id: "",
    startDate: start,
    status: "draft",
    intention: "",
    plannedAt: null,
    reviewedAt: null,
    reviewRating: null,
    reviewNotes: "",
    lessons: "",
    wins: "",
    createdAt: now,
    updatedAt: now,
  };
}

export function ensureWeek(db: DB, start: string): WeekRow {
  const existing = getWeek(db, start);
  if (existing) return existing;
  // Only the configured first day of a week can start one; any other date would split a week in two.
  const expected = weekStartFor(start, getSettings(db).weekStartsOn);
  if (expected !== start) throw new HTTPException(400, { message: `${start} is not the start of a week (expected ${expected})` });
  db.insert(weeks).values({ startDate: start }).onConflictDoNothing().run();
  return getWeek(db, start)!;
}

export function selectedRoleIds(db: DB, week: WeekRow, active: RoleRow[]): string[] {
  const rows = db.select().from(weekRoles).where(eq(weekRoles.weekId, week.id)).orderBy(asc(weekRoles.sortOrder)).all();
  const activeIds = new Set(active.map((r) => r.id));
  if (rows.length === 0) return active.map((r) => r.id);
  return rows.map((r) => r.roleId).filter((id) => activeIds.has(id));
}

export function setWeekRoles(db: DB, start: string, roleIds: string[]): void {
  const week = ensureWeek(db, start);
  db.transaction((tx) => {
    tx.delete(weekRoles).where(eq(weekRoles.weekId, week.id)).run();
    roleIds.forEach((roleId, i) => tx.insert(weekRoles).values({ weekId: week.id, roleId, sortOrder: i }).run());
  });
}

export interface GoalWithTime extends TaskDTO {
  blockMinutes: number;
  blockCount: number;
  doneMinutes: number;
}

interface LoadedWeek {
  week: WeekRow;
  days: string[];
  goals: GoalWithTime[];
  blocks: BlockDTO[];
  dayTasks: TaskDTO[];
}

function loadWeek(db: DB, week: WeekRow, ctx: TriageCtx): LoadedWeek {
  const days = weekDays(week.startDate);
  const start = days[0];
  const end = days[6];

  const goalRows = db
    .select()
    .from(tasks)
    .where(and(eq(tasks.weekId, week.id), eq(tasks.kind, "goal")))
    .orderBy(asc(tasks.sortOrder), asc(tasks.createdAt))
    .all();
  const dayTaskRows = db
    .select()
    .from(tasks)
    // Dropped, delegated and missed tasks have left the plan; only open and done ones belong in the day lanes.
    .where(
      and(
        eq(tasks.kind, "task"),
        gte(tasks.scheduledDate, start),
        lte(tasks.scheduledDate, end),
        inArray(tasks.status, ["open", "done"]),
      ),
    )
    .all();
  const blockRows = db
    .select()
    .from(blocks)
    .where(and(gte(blocks.date, start), lte(blocks.date, end)))
    .orderBy(asc(blocks.date), asc(blocks.startMin))
    .all();

  const taskMap = new Map<string, TaskDTO>();
  for (const r of [...goalRows, ...dayTaskRows]) taskMap.set(r.id, toTaskDTO(r, ctx));
  const missing = [...new Set(blockRows.map((b) => b.taskId).filter((id): id is string => !!id && !taskMap.has(id)))];
  if (missing.length) {
    for (const r of db.select().from(tasks).where(inArray(tasks.id, missing)).all()) taskMap.set(r.id, toTaskDTO(r, ctx));
  }

  const blockDTOs = blockRows.map((b) => toBlockDTO(b, b.taskId ? taskMap.get(b.taskId) : undefined));
  const goals: GoalWithTime[] = goalRows.map((r) => {
    const mine = blockDTOs.filter((b) => b.taskId === r.id && b.status !== "skipped");
    const dto = taskMap.get(r.id)!;
    return {
      ...dto,
      blockMinutes: mine.reduce((s, b) => s + blockMinutes(b), 0),
      blockCount: mine.length,
      doneMinutes: mine.filter((b) => blockDone(b, ctx.today)).reduce((s, b) => s + blockMinutes(b), 0),
    };
  });
  return {
    week,
    days,
    goals,
    blocks: blockDTOs,
    dayTasks: dayTaskRows.map((r) => taskMap.get(r.id)!),
  };
}

function weekStats(loaded: LoadedWeek, availableMinutes: number, roles: RoleRow[]) {
  const live = loaded.blocks.filter((b) => b.status !== "skipped");
  const plannedMinutes = live.reduce((s, b) => s + blockMinutes(b), 0);
  const byQuadrant: Record<string, number> = { "1": 0, "2": 0, "3": 0, "4": 0, none: 0 };
  const byRole: Record<string, number> = {};
  for (const b of live) {
    const m = blockMinutes(b);
    byQuadrant[b.effectiveQuadrant ? String(b.effectiveQuadrant) : "none"] += m;
    if (b.effectiveRoleId) byRole[b.effectiveRoleId] = (byRole[b.effectiveRoleId] ?? 0) + m;
  }
  const sawRoleIds = new Set(roles.filter((r) => r.isSaw).map((r) => r.id));
  const rolesWithGoals = [
    ...new Set(loaded.goals.filter((g) => g.roleId && !sawRoleIds.has(g.roleId)).map((g) => g.roleId as string)),
  ];
  const sawCovered = [...new Set(loaded.goals.map((g) => g.sawDimension).filter(Boolean))] as SawDimension[];
  const unscheduledGoals = loaded.goals.filter(
    (g) => g.status === "open" && g.blockCount === 0 && !g.scheduledDate,
  ).length;
  return {
    plannedMinutes,
    availableMinutes,
    capacityRatio: availableMinutes > 0 ? plannedMinutes / availableMinutes : 0,
    q2Minutes: byQuadrant["2"],
    byQuadrant,
    byRole,
    rolesWithGoals,
    sawCovered,
    unscheduledGoals,
    goalsTotal: loaded.goals.length,
    goalsDone: loaded.goals.filter((g) => g.status === "done").length,
  };
}

export function getBoard(db: DB, start: string, today = todayISO()) {
  const settings = getSettings(db);
  const ctx: TriageCtx = { today, urgentWithinDays: settings.urgentWithinDays };
  const week = getWeek(db, start) ?? virtualWeek(start);
  const roles = listRoles(db);
  const loaded = loadWeek(db, week, ctx);
  const availableMinutes = Math.max(0, settings.dayEndHour - settings.dayStartHour) * 60 * 7;

  // The most recent earlier week that had goals but was never reviewed.
  const earlier = db
    .select()
    .from(weeks)
    .where(and(lt(weeks.startDate, start)))
    .orderBy(desc(weeks.startDate))
    .limit(8)
    .all();
  let lastUnreviewed: { startDate: string; openGoals: number; weeksAgo: number } | null = null;
  for (const w of earlier) {
    if (w.status === "reviewed") break;
    const goalRows = db
      .select({ status: tasks.status })
      .from(tasks)
      .where(and(eq(tasks.weekId, w.id), eq(tasks.kind, "goal")))
      .all();
    if (goalRows.length > 0) {
      const weeksAgo = Math.round(
        (Date.parse(`${start}T00:00:00Z`) - Date.parse(`${w.startDate}T00:00:00Z`)) / (7 * 86_400_000),
      );
      lastUnreviewed = { startDate: w.startDate, openGoals: goalRows.filter((g) => g.status === "open").length, weeksAgo };
      break;
    }
  }

  return {
    week: loaded.week,
    days: loaded.days,
    roles,
    weekRoleIds: selectedRoleIds(db, week, roles),
    goals: loaded.goals,
    blocks: loaded.blocks,
    dayTasks: loaded.dayTasks,
    stats: weekStats(loaded, availableMinutes, roles),
    lastUnreviewed,
    settings: {
      dayStartHour: settings.dayStartHour,
      dayEndHour: settings.dayEndHour,
      defaultBlockMinutes: settings.defaultBlockMinutes,
      capacityTarget: settings.capacityTarget,
      weekStartsOn: settings.weekStartsOn,
    },
  };
}

export function getReview(db: DB, start: string, today = todayISO()) {
  const settings = getSettings(db);
  const ctx: TriageCtx = { today, urgentWithinDays: settings.urgentWithinDays };
  const week = getWeek(db, start) ?? virtualWeek(start);
  const roles = listRoles(db, true);
  const loaded = loadWeek(db, week, ctx);
  const byRole = roles
    .map((r) => {
      const goals = loaded.goals.filter((g) => g.roleId === r.id);
      const roleBlocks = loaded.blocks.filter((b) => b.effectiveRoleId === r.id && b.status !== "skipped");
      return {
        roleId: r.id,
        goals: goals.length,
        goalsDone: goals.filter((g) => g.status === "done").length,
        plannedMinutes: roleBlocks.reduce((s, b) => s + blockMinutes(b), 0),
        doneMinutes: roleBlocks.filter((b) => blockDone(b, today)).reduce((s, b) => s + blockMinutes(b), 0),
      };
    })
    .filter((r) => r.goals > 0 || r.plannedMinutes > 0);
  const q2Blocks = loaded.blocks.filter((b) => b.effectiveQuadrant === 2 && b.status !== "skipped");

  // Balance over the last four weeks (balance is judged over time, not every week).
  const last4 = [0, 1, 2, 3].map((i) => addWeeksISO(start, -i)).reverse();
  const balance = last4.map((ws) => {
    const w = getWeek(db, ws);
    if (!w) return { weekStart: ws, roleIds: [] as string[], saw: [] as string[], planned: false };
    const g = db
      .select({ roleId: tasks.roleId, saw: tasks.sawDimension })
      .from(tasks)
      .where(and(eq(tasks.weekId, w.id), eq(tasks.kind, "goal")))
      .all();
    return {
      weekStart: ws,
      roleIds: [...new Set(g.map((x) => x.roleId).filter(Boolean))] as string[],
      saw: [...new Set(g.map((x) => x.saw).filter(Boolean))] as string[],
      planned: w.status !== "draft",
    };
  });

  return {
    week: loaded.week,
    days: loaded.days,
    roles,
    goals: loaded.goals,
    integrity: integritySummary(loaded.goals),
    byRole,
    q2: {
      plannedMinutes: q2Blocks.reduce((s, b) => s + blockMinutes(b), 0),
      doneMinutes: q2Blocks.filter((b) => blockDone(b, today)).reduce((s, b) => s + blockMinutes(b), 0),
    },
    balance,
  };
}

export function commitWeek(db: DB, start: string): WeekRow {
  const week = ensureWeek(db, start);
  const hasRoles = db.select().from(weekRoles).where(eq(weekRoles.weekId, week.id)).all().length > 0;
  if (!hasRoles) setWeekRoles(db, start, listRoles(db).map((r) => r.id));
  return db
    .update(weeks)
    .set({ status: week.status === "reviewed" ? "reviewed" : "planned", plannedAt: week.plannedAt ?? new Date().toISOString() })
    .where(eq(weeks.id, week.id))
    .returning()
    .get();
}

export interface Disposition {
  taskId: string;
  outcome: "done" | "missed" | "dropped";
  reason?: MissReason | null;
  note?: string;
  carry?: boolean;
}

export function carryGoal(db: DB, goal: TaskRow, toStart: string): TaskRow {
  const target = ensureWeek(db, toStart);
  return db
    .insert(tasks)
    .values({
      kind: "goal",
      title: goal.title,
      notes: goal.notes,
      endInMind: goal.endInMind,
      why: goal.why,
      ifThen: goal.ifThen,
      roleId: goal.roleId,
      goalId: goal.goalId,
      weekId: target.id,
      sawDimension: goal.sawDimension,
      important: goal.important,
      urgent: goal.urgent,
      dueDate: goal.dueDate,
      estimateMinutes: goal.estimateMinutes,
      sortOrder: goal.sortOrder,
      carriedFromId: goal.id,
      carryCount: goal.carryCount + 1,
      source: "carry",
    })
    .returning()
    .get();
}

export function applyReview(
  db: DB,
  start: string,
  input: {
    dispositions: Disposition[];
    carryTo?: string;
    rating?: number | null;
    notes?: string;
    lessons?: string;
    wins?: string;
  },
) {
  const week = ensureWeek(db, start);
  const carryTo = input.carryTo ?? addWeeksISO(start, 1);
  let carried = 0;
  db.transaction((tx) => {
    for (const d of input.dispositions) {
      const goal = tx.select().from(tasks).where(eq(tasks.id, d.taskId)).get();
      if (!goal || goal.weekId !== week.id) continue;
      if (d.outcome === "done") {
        tx.update(tasks)
          .set({ status: "done", statusReason: null, completedAt: goal.completedAt ?? new Date().toISOString() })
          .where(eq(tasks.id, goal.id))
          .run();
      } else if (d.outcome === "dropped") {
        tx.update(tasks)
          .set({ status: "dropped", statusReason: "no_longer_relevant", statusNote: d.note ?? "", completedAt: null })
          .where(eq(tasks.id, goal.id))
          .run();
      } else {
        tx.update(tasks)
          // No reason given means no judgement: it counts neither as kept nor as a lapse.
          .set({ status: "missed", statusReason: d.reason ?? null, statusNote: d.note ?? "", completedAt: null })
          .where(eq(tasks.id, goal.id))
          .run();
      }
      if (d.carry && d.outcome !== "done") {
        const already = tx
          .select({ id: tasks.id })
          .from(tasks)
          .where(eq(tasks.carriedFromId, goal.id))
          .get();
        if (!already) {
          carryGoal(tx as unknown as DB, goal, carryTo);
          carried++;
        }
      }
    }
    tx.update(weeks)
      .set({
        status: "reviewed",
        reviewedAt: new Date().toISOString(),
        ...(input.rating !== undefined ? { reviewRating: input.rating } : {}),
        ...(input.notes !== undefined ? { reviewNotes: input.notes } : {}),
        ...(input.lessons !== undefined ? { lessons: input.lessons } : {}),
        ...(input.wins !== undefined ? { wins: input.wins } : {}),
      })
      .where(eq(weeks.id, week.id))
      .run();
  });
  return { week: getWeek(db, start)!, carried };
}

/** Compact history for the last `limit` weeks up to (and including) the current one. */
export function weekHistory(db: DB, limit = 12, today = todayISO()) {
  const settings = getSettings(db);
  const current = weekStartFor(today, settings.weekStartsOn);
  const starts = Array.from({ length: limit }, (_, i) => addWeeksISO(current, -(limit - 1 - i)));
  const rows = db.select().from(weeks).where(inArray(weeks.startDate, starts)).all();
  const byStart = new Map(rows.map((w) => [w.startDate, w]));
  return starts.map((ws) => {
    const w = byStart.get(ws);
    if (!w)
      return {
        weekStart: ws,
        status: null,
        goals: 0,
        done: 0,
        score: null as number | null,
        current: ws === current,
        rating: null as number | null,
        wins: "",
        lessons: "",
        reviewedAt: null as string | null,
      };
    const g = db
      .select({ status: tasks.status, statusReason: tasks.statusReason })
      .from(tasks)
      .where(and(eq(tasks.weekId, w.id), eq(tasks.kind, "goal")))
      .all();
    const s = integritySummary(g as { status: "open" | "done" | "missed" | "dropped"; statusReason: string | null }[]);
    return {
      weekStart: ws,
      status: w.status,
      goals: g.length,
      done: s.done,
      score: s.score,
      current: ws === current,
      rating: w.reviewRating,
      wins: w.wins,
      lessons: w.lessons,
      reviewedAt: w.reviewedAt,
    };
  });
}
