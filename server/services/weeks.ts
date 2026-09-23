import { and, asc, desc, eq, gte, inArray, lt, lte } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { addWeeksISO, weekDays, weekStartFor } from "../../shared/dates.ts";
import { integritySummary, type MissReason } from "../../shared/integrity.ts";
import type { SawDimension } from "../../shared/content.ts";
import type { Scope } from "../context.ts";
import { blocks, roles as rolesTable, tasks, weekRoles, weeks } from "../db/schema.ts";
import { blockDone, blockMinutes, toBlockDTO, toTaskDTO, type BlockDTO, type TaskDTO, type TaskRow, type TriageCtx } from "./dto.ts";
import { listRoles, type RoleRow } from "./roles.ts";
import { getSettings } from "./settings.ts";

export type WeekRow = typeof weeks.$inferSelect;

export async function getWeek(s: Scope, start: string): Promise<WeekRow | undefined> {
  const [row] = await s.db
    .select()
    .from(weeks)
    .where(and(eq(weeks.userId, s.userId), eq(weeks.startDate, start)))
    .limit(1);
  return row;
}

/** A week that has not been touched yet: read-only views use this instead of inserting a row. */
function virtualWeek(s: Scope, start: string): WeekRow {
  const now = new Date().toISOString();
  return {
    id: "",
    userId: s.userId,
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

export async function ensureWeek(s: Scope, start: string): Promise<WeekRow> {
  const existing = await getWeek(s, start);
  if (existing) return existing;
  // Only the configured first day of a week can start one; any other date would split a week in two.
  const expected = weekStartFor(start, (await getSettings(s)).weekStartsOn);
  if (expected !== start) throw new HTTPException(400, { message: `${start} is not the start of a week (expected ${expected})` });
  await s.db.insert(weeks).values({ userId: s.userId, startDate: start }).onConflictDoNothing();
  return (await getWeek(s, start))!;
}

export async function selectedRoleIds(s: Scope, week: WeekRow, active: RoleRow[]): Promise<string[]> {
  const rows = await s.db
    .select()
    .from(weekRoles)
    .where(and(eq(weekRoles.userId, s.userId), eq(weekRoles.weekId, week.id)))
    .orderBy(asc(weekRoles.sortOrder));
  const activeIds = new Set(active.map((r) => r.id));
  if (rows.length === 0) return active.map((r) => r.id);
  return rows.map((r) => r.roleId).filter((id) => activeIds.has(id));
}

export async function setWeekRoles(s: Scope, start: string, roleIds: string[]): Promise<void> {
  const week = await ensureWeek(s, start);
  // Only the person's own roles can be chosen for their week.
  const owned = roleIds.length
    ? new Set(
        (
          await s.db
            .select({ id: rolesTable.id })
            .from(rolesTable)
            .where(and(eq(rolesTable.userId, s.userId), inArray(rolesTable.id, roleIds)))
        ).map((r) => r.id),
      )
    : new Set<string>();
  await s.db.transaction(async (tx) => {
    await tx.delete(weekRoles).where(and(eq(weekRoles.userId, s.userId), eq(weekRoles.weekId, week.id)));
    const rows = roleIds.filter((id) => owned.has(id)).map((roleId, i) => ({ userId: s.userId, weekId: week.id, roleId, sortOrder: i }));
    if (rows.length) await tx.insert(weekRoles).values(rows);
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

async function loadWeek(s: Scope, week: WeekRow, ctx: TriageCtx): Promise<LoadedWeek> {
  const days = weekDays(week.startDate);
  const start = days[0];
  const end = days[6];
  const mine = eq(tasks.userId, s.userId);

  const [goalRows, dayTaskRows, blockRows] = await Promise.all([
    week.id
      ? s.db
          .select()
          .from(tasks)
          .where(and(mine, eq(tasks.weekId, week.id), eq(tasks.kind, "goal")))
          .orderBy(asc(tasks.sortOrder), asc(tasks.createdAt))
      : Promise.resolve([] as TaskRow[]),
    s.db
      .select()
      .from(tasks)
      // Dropped, delegated and missed tasks have left the plan; only open and done ones belong in the day lanes.
      .where(
        and(
          mine,
          eq(tasks.kind, "task"),
          gte(tasks.scheduledDate, start),
          lte(tasks.scheduledDate, end),
          inArray(tasks.status, ["open", "done"]),
        ),
      ),
    s.db
      .select()
      .from(blocks)
      .where(and(eq(blocks.userId, s.userId), gte(blocks.date, start), lte(blocks.date, end)))
      .orderBy(asc(blocks.date), asc(blocks.startMin)),
  ]);

  const taskMap = new Map<string, TaskDTO>();
  for (const r of [...goalRows, ...dayTaskRows]) taskMap.set(r.id, toTaskDTO(r, ctx));
  const missing = [...new Set(blockRows.map((b) => b.taskId).filter((id): id is string => !!id && !taskMap.has(id)))];
  if (missing.length) {
    const rows = await s.db
      .select()
      .from(tasks)
      .where(and(mine, inArray(tasks.id, missing)));
    for (const r of rows) taskMap.set(r.id, toTaskDTO(r, ctx));
  }

  const blockDTOs = blockRows.map((b) => toBlockDTO(b, b.taskId ? taskMap.get(b.taskId) : undefined));
  const goals: GoalWithTime[] = goalRows.map((r) => {
    const own = blockDTOs.filter((b) => b.taskId === r.id && b.status !== "skipped");
    const dto = taskMap.get(r.id)!;
    return {
      ...dto,
      blockMinutes: own.reduce((sum, b) => sum + blockMinutes(b), 0),
      blockCount: own.length,
      doneMinutes: own.filter((b) => blockDone(b, ctx.today)).reduce((sum, b) => sum + blockMinutes(b), 0),
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
  const plannedMinutes = live.reduce((sum, b) => sum + blockMinutes(b), 0);
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

export async function getBoard(s: Scope, start: string) {
  const settings = await getSettings(s);
  const ctx: TriageCtx = { today: s.today, urgentWithinDays: settings.urgentWithinDays };
  const week = (await getWeek(s, start)) ?? virtualWeek(s, start);
  const roles = await listRoles(s);
  const loaded = await loadWeek(s, week, ctx);
  const availableMinutes = Math.max(0, settings.dayEndHour - settings.dayStartHour) * 60 * 7;

  // The most recent earlier week that had goals but was never reviewed.
  const earlier = await s.db
    .select()
    .from(weeks)
    .where(and(eq(weeks.userId, s.userId), lt(weeks.startDate, start)))
    .orderBy(desc(weeks.startDate))
    .limit(8);
  let lastUnreviewed: { startDate: string; openGoals: number; weeksAgo: number } | null = null;
  for (const w of earlier) {
    if (w.status === "reviewed") break;
    const goalRows = await s.db
      .select({ status: tasks.status })
      .from(tasks)
      .where(and(eq(tasks.userId, s.userId), eq(tasks.weekId, w.id), eq(tasks.kind, "goal")));
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
    weekRoleIds: await selectedRoleIds(s, week, roles),
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

export async function getReview(s: Scope, start: string) {
  const settings = await getSettings(s);
  const ctx: TriageCtx = { today: s.today, urgentWithinDays: settings.urgentWithinDays };
  const week = (await getWeek(s, start)) ?? virtualWeek(s, start);
  const roles = await listRoles(s, true);
  const loaded = await loadWeek(s, week, ctx);
  const byRole = roles
    .map((r) => {
      const goals = loaded.goals.filter((g) => g.roleId === r.id);
      const roleBlocks = loaded.blocks.filter((b) => b.effectiveRoleId === r.id && b.status !== "skipped");
      return {
        roleId: r.id,
        goals: goals.length,
        goalsDone: goals.filter((g) => g.status === "done").length,
        plannedMinutes: roleBlocks.reduce((sum, b) => sum + blockMinutes(b), 0),
        doneMinutes: roleBlocks.filter((b) => blockDone(b, s.today)).reduce((sum, b) => sum + blockMinutes(b), 0),
      };
    })
    .filter((r) => r.goals > 0 || r.plannedMinutes > 0);
  const q2Blocks = loaded.blocks.filter((b) => b.effectiveQuadrant === 2 && b.status !== "skipped");

  // Balance over the last four weeks (balance is judged over time, not every week).
  const last4 = [0, 1, 2, 3].map((i) => addWeeksISO(start, -i)).reverse();
  const balance = await Promise.all(
    last4.map(async (ws) => {
      const w = await getWeek(s, ws);
      if (!w) return { weekStart: ws, roleIds: [] as string[], saw: [] as string[], planned: false };
      const g = await s.db
        .select({ roleId: tasks.roleId, saw: tasks.sawDimension })
        .from(tasks)
        .where(and(eq(tasks.userId, s.userId), eq(tasks.weekId, w.id), eq(tasks.kind, "goal")));
      return {
        weekStart: ws,
        roleIds: [...new Set(g.map((x) => x.roleId).filter(Boolean))] as string[],
        saw: [...new Set(g.map((x) => x.saw).filter(Boolean))] as string[],
        planned: w.status !== "draft",
      };
    }),
  );

  return {
    week: loaded.week,
    days: loaded.days,
    roles,
    goals: loaded.goals,
    integrity: integritySummary(loaded.goals),
    byRole,
    q2: {
      plannedMinutes: q2Blocks.reduce((sum, b) => sum + blockMinutes(b), 0),
      doneMinutes: q2Blocks.filter((b) => blockDone(b, s.today)).reduce((sum, b) => sum + blockMinutes(b), 0),
    },
    balance,
  };
}

export async function commitWeek(s: Scope, start: string): Promise<WeekRow> {
  const week = await ensureWeek(s, start);
  const chosen = await s.db
    .select({ roleId: weekRoles.roleId })
    .from(weekRoles)
    .where(and(eq(weekRoles.userId, s.userId), eq(weekRoles.weekId, week.id)))
    .limit(1);
  if (chosen.length === 0) await setWeekRoles(s, start, (await listRoles(s)).map((r) => r.id));
  const [row] = await s.db
    .update(weeks)
    .set({ status: week.status === "reviewed" ? "reviewed" : "planned", plannedAt: week.plannedAt ?? new Date().toISOString() })
    .where(and(eq(weeks.id, week.id), eq(weeks.userId, s.userId)))
    .returning();
  return row;
}

export interface Disposition {
  taskId: string;
  outcome: "done" | "missed" | "dropped";
  reason?: MissReason | null;
  note?: string;
  carry?: boolean;
}

export async function carryGoal(s: Scope, goal: TaskRow, toStart: string): Promise<TaskRow> {
  const target = await ensureWeek(s, toStart);
  const [row] = await s.db
    .insert(tasks)
    .values({
      userId: s.userId,
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
    .returning();
  return row;
}

export async function applyReview(
  s: Scope,
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
  const week = await ensureWeek(s, start);
  const carryTo = input.carryTo ?? addWeeksISO(start, 1);
  let carried = 0;
  await s.db.transaction(async (tx) => {
    const ts: Scope = { ...s, db: tx };
    for (const d of input.dispositions) {
      const [goal] = await tx
        .select()
        .from(tasks)
        .where(and(eq(tasks.id, d.taskId), eq(tasks.userId, s.userId)))
        .limit(1);
      if (!goal || goal.weekId !== week.id) continue;
      if (d.outcome === "done") {
        await tx
          .update(tasks)
          .set({ status: "done", statusReason: null, completedAt: goal.completedAt ?? new Date().toISOString() })
          .where(eq(tasks.id, goal.id));
      } else if (d.outcome === "dropped") {
        await tx
          .update(tasks)
          .set({ status: "dropped", statusReason: "no_longer_relevant", statusNote: d.note ?? "", completedAt: null })
          .where(eq(tasks.id, goal.id));
      } else {
        await tx
          .update(tasks)
          // No reason given means no judgement: it counts neither as kept nor as a lapse.
          .set({ status: "missed", statusReason: d.reason ?? null, statusNote: d.note ?? "", completedAt: null })
          .where(eq(tasks.id, goal.id));
      }
      if (d.carry && d.outcome !== "done") {
        const already = await tx
          .select({ id: tasks.id })
          .from(tasks)
          .where(and(eq(tasks.userId, s.userId), eq(tasks.carriedFromId, goal.id)))
          .limit(1);
        if (already.length === 0) {
          await carryGoal(ts, goal, carryTo);
          carried++;
        }
      }
    }
    await tx
      .update(weeks)
      .set({
        status: "reviewed",
        reviewedAt: new Date().toISOString(),
        ...(input.rating !== undefined ? { reviewRating: input.rating } : {}),
        ...(input.notes !== undefined ? { reviewNotes: input.notes } : {}),
        ...(input.lessons !== undefined ? { lessons: input.lessons } : {}),
        ...(input.wins !== undefined ? { wins: input.wins } : {}),
      })
      .where(eq(weeks.id, week.id));
  });
  return { week: (await getWeek(s, start))!, carried };
}

/** Compact history for the last `limit` weeks up to (and including) the current one. */
export async function weekHistory(s: Scope, limit = 12) {
  const settings = await getSettings(s);
  const current = weekStartFor(s.today, settings.weekStartsOn);
  const starts = Array.from({ length: limit }, (_, i) => addWeeksISO(current, -(limit - 1 - i)));
  const rows = await s.db
    .select()
    .from(weeks)
    .where(and(eq(weeks.userId, s.userId), inArray(weeks.startDate, starts)));
  const byStart = new Map(rows.map((w) => [w.startDate, w]));
  const weekIds = rows.map((w) => w.id);
  const goalRows = weekIds.length
    ? await s.db
        .select({ weekId: tasks.weekId, status: tasks.status, statusReason: tasks.statusReason })
        .from(tasks)
        .where(and(eq(tasks.userId, s.userId), inArray(tasks.weekId, weekIds), eq(tasks.kind, "goal")))
    : [];
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
    const g = goalRows.filter((x) => x.weekId === w.id);
    const summary = integritySummary(g);
    return {
      weekStart: ws,
      status: w.status,
      goals: g.length,
      done: summary.done,
      score: summary.score,
      current: ws === current,
      rating: w.reviewRating,
      wins: w.wins,
      lessons: w.lessons,
      reviewedAt: w.reviewedAt,
    };
  });
}
