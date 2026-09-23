import { and, asc, desc, eq, isNotNull, isNull, lt, lte, ne, or } from "drizzle-orm";
import { addDaysISO, daysBetween, weekStartFor } from "../../shared/dates.ts";
import type { DB } from "../db/client.ts";
import {
  affirmations,
  blocks,
  challengeDays,
  challenges,
  delegations,
  journal,
  missions,
  tasks,
} from "../db/schema.ts";
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

export function getToday(db: DB, date: string) {
  const settings = getSettings(db);
  const ctx: TriageCtx = { today: date, urgentWithinDays: settings.urgentWithinDays };
  const weekStart = weekStartFor(date, settings.weekStartsOn);
  const week = getWeek(db, weekStart) ?? null;

  const priorities = db
    .select()
    .from(tasks)
    .where(and(eq(tasks.scheduledDate, date), or(eq(tasks.status, "open"), eq(tasks.status, "done"))))
    .all()
    .sort(byPriority)
    .map((r) => toTaskDTO(r, ctx));

  const bigRocks = week
    ? db
        .select()
        .from(tasks)
        .where(and(eq(tasks.weekId, week.id), eq(tasks.kind, "goal")))
        .orderBy(asc(tasks.sortOrder), asc(tasks.createdAt))
        .all()
        .map((r) => toTaskDTO(r, ctx))
    : [];

  const blockRows = db.select().from(blocks).where(eq(blocks.date, date)).orderBy(asc(blocks.startMin)).all();
  const taskIds = [...new Set(blockRows.map((b) => b.taskId).filter((x): x is string => !!x))];
  const blockTasks = new Map<string, TaskDTO>();
  for (const id of taskIds) {
    const r = db.select().from(tasks).where(eq(tasks.id, id)).get();
    if (r) blockTasks.set(id, toTaskDTO(r, ctx));
  }
  const dayBlocks = blockRows.map((b) => toBlockDTO(b, b.taskId ? blockTasks.get(b.taskId) : undefined));

  // Things you planned for an earlier day that are still open. Not "overdue":
  // a planned day is not a deadline. They just need a decision, however old they are.
  const unfinished = db
    .select()
    .from(tasks)
    .where(and(eq(tasks.status, "open"), eq(tasks.kind, "task"), lt(tasks.scheduledDate, date)))
    .orderBy(desc(tasks.scheduledDate))
    .all()
    .map((r) => toTaskDTO(r, ctx));

  const dueSoon = db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.status, "open"),
        isNotNull(tasks.dueDate),
        lte(tasks.dueDate, addDaysISO(date, Math.max(1, settings.urgentWithinDays))),
        or(isNull(tasks.scheduledDate), ne(tasks.scheduledDate, date)),
      ),
    )
    .orderBy(asc(tasks.dueDate))
    .all()
    .map((r) => toTaskDTO(r, ctx));

  const checkins = db
    .select()
    .from(delegations)
    .where(and(eq(delegations.status, "active"), isNotNull(delegations.nextCheckin), lte(delegations.nextCheckin, date)))
    .orderBy(asc(delegations.nextCheckin))
    .all();

  const activeAffirmations = db
    .select()
    .from(affirmations)
    .where(eq(affirmations.active, true))
    .orderBy(asc(affirmations.sortOrder), asc(affirmations.createdAt))
    .all();
  const dayNumber = Math.abs(daysBetween("2000-01-01", date));
  const affirmation = activeAffirmations.length ? activeAffirmations[dayNumber % activeAffirmations.length] : null;

  const mission = db.select().from(missions).where(eq(missions.kind, "personal")).orderBy(asc(missions.createdAt)).get();

  const challenge = db.select().from(challenges).where(eq(challenges.status, "active")).get() ?? null;
  const challengeDay = challenge
    ? (db
        .select()
        .from(challengeDays)
        .where(and(eq(challengeDays.challengeId, challenge.id), eq(challengeDays.date, date)))
        .get() ?? null)
    : null;

  const reflection =
    db
      .select()
      .from(journal)
      .where(and(eq(journal.kind, "daily"), eq(journal.date, date)))
      .get() ?? null;

  return {
    date,
    weekStart,
    week: week ? { id: week.id, status: week.status, intention: week.intention } : null,
    priorities,
    bigRocks,
    blocks: dayBlocks,
    unfinished,
    dueSoon,
    checkins,
    affirmation,
    missionExcerpt: mission ? excerpt(mission.content) : "",
    challenge: challenge
      ? { id: challenge.id, startedOn: challenge.startedOn, dayNumber: daysBetween(challenge.startedOn, date) + 1, today: challengeDay }
      : null,
    reflection,
    settings: {
      dayStartHour: settings.dayStartHour,
      dayEndHour: settings.dayEndHour,
      defaultBlockMinutes: settings.defaultBlockMinutes,
      planningDay: settings.planningDay,
    },
  };
}
