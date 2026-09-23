import { and, asc, desc, eq, inArray, isNotNull, isNull, lt, lte, ne, or } from "drizzle-orm";
import { addDaysISO, daysBetween, weekStartFor } from "../../shared/dates.ts";
import type { Scope } from "../context.ts";
import { affirmations, blocks, challengeDays, challenges, delegations, journal, missions, tasks } from "../db/schema.ts";
import { byPriority, toBlockDTO, toTaskDTO, type TaskDTO, type TriageCtx } from "./dto.ts";
import { getSettings } from "./settings.ts";
import { getWeek } from "./weeks.ts";

function excerpt(text: string, max = 280): string {
  const clean = text.trim();
  if (!clean) return "";
  const firstPara = clean.split(/\n\s*\n/)[0];
  if (firstPara.length <= max) return firstPara;
  return `${firstPara.slice(0, max).replace(/\s+\S*$/, "")}…`;
}

export async function getToday(s: Scope, date: string) {
  const settings = await getSettings(s);
  // Triage is relative to the day being viewed.
  const ctx: TriageCtx = { today: date, urgentWithinDays: settings.urgentWithinDays };
  const weekStart = weekStartFor(date, settings.weekStartsOn);
  const week = (await getWeek(s, weekStart)) ?? null;
  const mineTask = eq(tasks.userId, s.userId);

  const [priorityRows, rockRows, blockRows, unfinishedRows, dueRows, checkins, activeAffirmations, missionRows, challengeRows, reflectionRows] =
    await Promise.all([
      s.db
        .select()
        .from(tasks)
        .where(and(mineTask, eq(tasks.scheduledDate, date), or(eq(tasks.status, "open"), eq(tasks.status, "done")))),
      week
        ? s.db
            .select()
            .from(tasks)
            .where(and(mineTask, eq(tasks.weekId, week.id), eq(tasks.kind, "goal")))
            .orderBy(asc(tasks.sortOrder), asc(tasks.createdAt))
        : Promise.resolve([]),
      s.db
        .select()
        .from(blocks)
        .where(and(eq(blocks.userId, s.userId), eq(blocks.date, date)))
        .orderBy(asc(blocks.startMin)),
      // Things you planned for an earlier day that are still open. Not "overdue":
      // a planned day is not a deadline. They just need a decision, however old they are.
      s.db
        .select()
        .from(tasks)
        .where(and(mineTask, eq(tasks.status, "open"), eq(tasks.kind, "task"), lt(tasks.scheduledDate, date)))
        .orderBy(desc(tasks.scheduledDate)),
      s.db
        .select()
        .from(tasks)
        .where(
          and(
            mineTask,
            eq(tasks.status, "open"),
            isNotNull(tasks.dueDate),
            lte(tasks.dueDate, addDaysISO(date, Math.max(1, settings.urgentWithinDays))),
            or(isNull(tasks.scheduledDate), ne(tasks.scheduledDate, date)),
          ),
        )
        .orderBy(asc(tasks.dueDate)),
      s.db
        .select()
        .from(delegations)
        .where(
          and(
            eq(delegations.userId, s.userId),
            eq(delegations.status, "active"),
            isNotNull(delegations.nextCheckin),
            lte(delegations.nextCheckin, date),
          ),
        )
        .orderBy(asc(delegations.nextCheckin)),
      s.db
        .select()
        .from(affirmations)
        .where(and(eq(affirmations.userId, s.userId), eq(affirmations.active, true)))
        .orderBy(asc(affirmations.sortOrder), asc(affirmations.createdAt)),
      s.db
        .select()
        .from(missions)
        .where(and(eq(missions.userId, s.userId), eq(missions.kind, "personal")))
        .orderBy(asc(missions.createdAt))
        .limit(1),
      s.db
        .select()
        .from(challenges)
        .where(and(eq(challenges.userId, s.userId), eq(challenges.status, "active")))
        .limit(1),
      s.db
        .select()
        .from(journal)
        .where(and(eq(journal.userId, s.userId), eq(journal.kind, "daily"), eq(journal.date, date)))
        .limit(1),
    ]);

  const priorities = priorityRows.sort(byPriority).map((r) => toTaskDTO(r, ctx));
  const bigRocks = rockRows.map((r) => toTaskDTO(r, ctx));

  const taskIds = [...new Set(blockRows.map((b) => b.taskId).filter((x): x is string => !!x))];
  const blockTasks = new Map<string, TaskDTO>();
  if (taskIds.length) {
    const rows = await s.db
      .select()
      .from(tasks)
      .where(and(mineTask, inArray(tasks.id, taskIds)));
    for (const r of rows) blockTasks.set(r.id, toTaskDTO(r, ctx));
  }
  const dayBlocks = blockRows.map((b) => toBlockDTO(b, b.taskId ? blockTasks.get(b.taskId) : undefined));

  const dayNumber = Math.abs(daysBetween("2000-01-01", date));
  const affirmation = activeAffirmations.length ? activeAffirmations[dayNumber % activeAffirmations.length] : null;
  const mission = missionRows[0];
  const challenge = challengeRows[0] ?? null;
  const challengeDay = challenge
    ? ((
        await s.db
          .select()
          .from(challengeDays)
          .where(and(eq(challengeDays.challengeId, challenge.id), eq(challengeDays.date, date)))
          .limit(1)
      )[0] ?? null)
    : null;

  return {
    date,
    weekStart,
    week: week ? { id: week.id, status: week.status, intention: week.intention } : null,
    priorities,
    bigRocks,
    blocks: dayBlocks,
    unfinished: unfinishedRows.map((r) => toTaskDTO(r, ctx)),
    dueSoon: dueRows.map((r) => toTaskDTO(r, ctx)),
    checkins,
    affirmation,
    missionExcerpt: mission ? excerpt(mission.content) : "",
    challenge: challenge
      ? { id: challenge.id, startedOn: challenge.startedOn, dayNumber: daysBetween(challenge.startedOn, date) + 1, today: challengeDay }
      : null,
    reflection: reflectionRows[0] ?? null,
    settings: {
      dayStartHour: settings.dayStartHour,
      dayEndHour: settings.dayEndHour,
      defaultBlockMinutes: settings.defaultBlockMinutes,
      planningDay: settings.planningDay,
    },
  };
}
