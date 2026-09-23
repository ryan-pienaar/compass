import { sql } from "drizzle-orm";
import {
  boolean,
  customType,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  uniqueIndex,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { newId } from "../../shared/id.ts";

/*
 * Every row belongs to one person: `user_id` is their Auth0 subject. The API scopes
 * every query by it. Row-level security is enabled on every table with no policies,
 * so Supabase's public Data API can't read anything; only the server's own
 * connection (which bypasses RLS) reaches the data.
 */

/** timestamptz in Postgres, ISO-8601 UTC strings in the app (the client relies on that format). */
const isoTimestamp = customType<{ data: string; driverData: string }>({
  dataType: () => "timestamp with time zone",
  fromDriver: (value) => new Date(value).toISOString(),
});

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => newId());
const userId = () => text("user_id").notNull();
const now = () => new Date().toISOString();
const createdAt = () => isoTimestamp("created_at").notNull().$defaultFn(now);
const updatedAt = () =>
  isoTimestamp("updated_at")
    .notNull()
    .$defaultFn(now)
    .$onUpdateFn(now);
/** A calendar day, "YYYY-MM-DD" in the user's own time zone. */
const day = (name: string) => date(name, { mode: "string" });

/* ------------------------------------------------------------------ */
/* Settings                                                             */
/* ------------------------------------------------------------------ */

export const settings = pgTable.withRLS(
  "settings",
  {
    userId: userId(),
    key: text("key").notNull(),
    value: jsonb("value").$type<unknown>().notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.key] })],
);

/* ------------------------------------------------------------------ */
/* Habit 2: mission, roles, long-term goals, affirmations               */
/* ------------------------------------------------------------------ */

export const missions = pgTable.withRLS(
  "missions",
  {
    id: id(),
    userId: userId(),
    kind: text("kind", { enum: ["personal", "family", "team"] }).notNull().default("personal"),
    title: text("title").notNull().default("My mission"),
    content: text("content").notNull().default(""),
    reviewedAt: isoTimestamp("reviewed_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("missions_user_kind_unique").on(t.userId, t.kind)],
);

export const missionVersions = pgTable.withRLS(
  "mission_versions",
  {
    id: id(),
    userId: userId(),
    missionId: text("mission_id")
      .notNull()
      .references(() => missions.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    note: text("note"),
    createdAt: createdAt(),
  },
  (t) => [index("mission_versions_mission_idx").on(t.missionId, t.createdAt)],
);

export const roles = pgTable.withRLS(
  "roles",
  {
    id: id(),
    userId: userId(),
    name: text("name").notNull(),
    /** "Who I want to be in this role" */
    description: text("description").notNull().default(""),
    color: text("color").notNull().default("#0f766e"),
    sortOrder: doublePrecision("sort_order").notNull().default(0),
    /** The special "Sharpen the Saw" role (renewal in four dimensions). */
    isSaw: boolean("is_saw").notNull().default(false),
    archivedAt: isoTimestamp("archived_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("roles_user_idx").on(t.userId, t.sortOrder)],
);

export const goals = pgTable.withRLS(
  "goals",
  {
    id: id(),
    userId: userId(),
    roleId: text("role_id").references(() => roles.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    /** First creation: the desired result. */
    endInMind: text("end_in_mind").notNull().default(""),
    /** How I'll know I've arrived. */
    measure: text("measure").notNull().default(""),
    targetDate: day("target_date"),
    status: text("status", { enum: ["active", "achieved", "paused", "archived"] })
      .notNull()
      .default("active"),
    sortOrder: doublePrecision("sort_order").notNull().default(0),
    achievedAt: isoTimestamp("achieved_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("goals_user_idx").on(t.userId), index("goals_role_idx").on(t.roleId)],
);

export const affirmations = pgTable.withRLS(
  "affirmations",
  {
    id: id(),
    userId: userId(),
    text: text("text").notNull(),
    roleId: text("role_id").references(() => roles.id, { onDelete: "set null" }),
    active: boolean("active").notNull().default(true),
    visualConfirmed: boolean("visual_confirmed").notNull().default(false),
    sortOrder: doublePrecision("sort_order").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("affirmations_user_idx").on(t.userId)],
);

/* ------------------------------------------------------------------ */
/* Habit 3: weeks, tasks (incl. weekly goals), calendar blocks          */
/* ------------------------------------------------------------------ */

export const weeks = pgTable.withRLS(
  "weeks",
  {
    id: id(),
    userId: userId(),
    startDate: day("start_date").notNull(),
    status: text("status", { enum: ["draft", "planned", "reviewed"] })
      .notNull()
      .default("draft"),
    intention: text("intention").notNull().default(""),
    plannedAt: isoTimestamp("planned_at"),
    reviewedAt: isoTimestamp("reviewed_at"),
    /** 1-5: how well did the week translate my values into my days? */
    reviewRating: integer("review_rating"),
    reviewNotes: text("review_notes").notNull().default(""),
    lessons: text("lessons").notNull().default(""),
    /** Three wins from the week (celebrate before assessing). */
    wins: text("wins").notNull().default(""),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("weeks_user_start_unique").on(t.userId, t.startDate)],
);

export const weekRoles = pgTable.withRLS(
  "week_roles",
  {
    userId: userId(),
    weekId: text("week_id")
      .notNull()
      .references(() => weeks.id, { onDelete: "cascade" }),
    roleId: text("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    sortOrder: doublePrecision("sort_order").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.weekId, t.roleId] })],
);

export const delegations = pgTable.withRLS(
  "delegations",
  {
    id: id(),
    userId: userId(),
    title: text("title").notNull(),
    delegate: text("delegate").notNull().default(""),
    desiredResults: text("desired_results").notNull().default(""),
    dueDate: day("due_date"),
    guidelines: text("guidelines").notNull().default(""),
    resources: text("resources").notNull().default(""),
    accountability: text("accountability").notNull().default(""),
    consequences: text("consequences").notNull().default(""),
    checkinEveryDays: integer("checkin_every_days"),
    nextCheckin: day("next_checkin"),
    status: text("status", { enum: ["active", "done", "cancelled"] })
      .notNull()
      .default("active"),
    roleId: text("role_id").references(() => roles.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("delegations_user_idx").on(t.userId, t.status)],
);

export const delegationCheckins = pgTable.withRLS(
  "delegation_checkins",
  {
    id: id(),
    userId: userId(),
    delegationId: text("delegation_id")
      .notNull()
      .references(() => delegations.id, { onDelete: "cascade" }),
    date: day("date").notNull(),
    notes: text("notes").notNull().default(""),
    onTrack: boolean("on_track"),
    createdAt: createdAt(),
  },
  (t) => [index("delegation_checkins_idx").on(t.delegationId, t.date)],
);

export const tasks = pgTable.withRLS(
  "tasks",
  {
    id: id(),
    userId: userId(),
    /** "goal" = a weekly goal / big rock (a promise for the week). */
    kind: text("kind", { enum: ["task", "goal"] }).notNull().default("task"),
    title: text("title").notNull(),
    notes: text("notes").notNull().default(""),
    endInMind: text("end_in_mind").notNull().default(""),
    /** The bigger "yes" behind this item. */
    why: text("why").notNull().default(""),
    /** Implementation intention for top rocks: "If X, then I will Y." */
    ifThen: text("if_then").notNull().default(""),
    roleId: text("role_id").references(() => roles.id, { onDelete: "set null" }),
    goalId: text("goal_id").references(() => goals.id, { onDelete: "set null" }),
    weekId: text("week_id").references(() => weeks.id, { onDelete: "set null" }),
    parentId: text("parent_id").references((): AnyPgColumn => tasks.id, { onDelete: "set null" }),
    sawDimension: text("saw_dimension", { enum: ["physical", "mental", "spiritual", "social"] }),
    important: boolean("important"),
    urgent: boolean("urgent"),
    createdQuadrant: integer("created_quadrant"),
    dueDate: day("due_date"),
    scheduledDate: day("scheduled_date"),
    priority: text("priority", { enum: ["A", "B", "C"] }),
    sortOrder: doublePrecision("sort_order").notNull().default(0),
    estimateMinutes: integer("estimate_minutes"),
    actualMinutes: integer("actual_minutes").notNull().default(0),
    carryCount: integer("carry_count").notNull().default(0),
    status: text("status", { enum: ["open", "done", "missed", "dropped"] })
      .notNull()
      .default("open"),
    statusReason: text("status_reason"),
    statusNote: text("status_note").notNull().default(""),
    delegationId: text("delegation_id").references(() => delegations.id, { onDelete: "set null" }),
    preventionForId: text("prevention_for_id").references((): AnyPgColumn => tasks.id, { onDelete: "set null" }),
    carriedFromId: text("carried_from_id").references((): AnyPgColumn => tasks.id, { onDelete: "set null" }),
    source: text("source"),
    completedAt: isoTimestamp("completed_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("tasks_user_status_idx").on(t.userId, t.status),
    index("tasks_user_scheduled_idx").on(t.userId, t.scheduledDate),
    index("tasks_week_idx").on(t.weekId, t.kind),
    index("tasks_role_idx").on(t.roleId),
    index("tasks_goal_idx").on(t.goalId),
  ],
);

export const blocks = pgTable.withRLS(
  "blocks",
  {
    id: id(),
    userId: userId(),
    date: day("date").notNull(),
    startMin: integer("start_min").notNull(),
    endMin: integer("end_min").notNull(),
    title: text("title").notNull().default(""),
    notes: text("notes").notNull().default(""),
    taskId: text("task_id").references(() => tasks.id, { onDelete: "set null" }),
    roleId: text("role_id").references(() => roles.id, { onDelete: "set null" }),
    /** focus = time for a goal/task; appointment = a commitment with others */
    kind: text("kind", { enum: ["focus", "appointment"] }).notNull().default("focus"),
    quadrant: integer("quadrant"),
    status: text("status", { enum: ["planned", "done", "skipped"] })
      .notNull()
      .default("planned"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("blocks_user_date_idx").on(t.userId, t.date), index("blocks_task_idx").on(t.taskId)],
);

/* ------------------------------------------------------------------ */
/* Habit 1: circle of influence, 30-day test                            */
/* ------------------------------------------------------------------ */

export const concerns = pgTable.withRLS(
  "concerns",
  {
    id: id(),
    userId: userId(),
    title: text("title").notNull(),
    notes: text("notes").notNull().default(""),
    control: text("control", { enum: ["direct", "indirect", "none"] }),
    approach: text("approach").notNull().default(""),
    firstStep: text("first_step").notNull().default(""),
    beStatement: text("be_statement").notNull().default(""),
    status: text("status", { enum: ["open", "acting", "resolved", "accepted"] })
      .notNull()
      .default("open"),
    taskId: text("task_id").references(() => tasks.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("concerns_user_idx").on(t.userId)],
);

export const challenges = pgTable.withRLS(
  "challenges",
  {
    id: id(),
    userId: userId(),
    startedOn: day("started_on").notNull(),
    status: text("status", { enum: ["active", "completed", "abandoned"] })
      .notNull()
      .default("active"),
    completedAt: isoTimestamp("completed_at"),
    createdAt: createdAt(),
  },
  (t) => [index("challenges_user_idx").on(t.userId, t.status)],
);

export const challengeDays = pgTable.withRLS(
  "challenge_days",
  {
    id: id(),
    userId: userId(),
    challengeId: text("challenge_id")
      .notNull()
      .references(() => challenges.id, { onDelete: "cascade" }),
    date: day("date").notNull(),
    commitment: text("commitment").notNull().default(""),
    kept: boolean("kept"),
    inInfluence: boolean("in_influence"),
    proactiveLanguage: boolean("proactive_language"),
    ownedMistakes: boolean("owned_mistakes"),
    note: text("note").notNull().default(""),
  },
  (t) => [uniqueIndex("challenge_days_unique").on(t.challengeId, t.date)],
);

/* ------------------------------------------------------------------ */
/* Reflection, time audit, assessments                                  */
/* ------------------------------------------------------------------ */

export const journal = pgTable.withRLS(
  "journal",
  {
    id: id(),
    userId: userId(),
    date: day("date").notNull(),
    /** daily | weekly | tribute | freewrite | mission_q | resource | mistake | choice | note */
    kind: text("kind").notNull().default("note"),
    title: text("title"),
    body: text("body").notNull().default(""),
    data: jsonb("data").$type<Record<string, unknown>>(),
    weekId: text("week_id").references(() => weeks.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("journal_user_kind_date_idx").on(t.userId, t.kind, t.date),
    // One evening reflection per person per day (saved with an upsert).
    uniqueIndex("journal_daily_unique")
      .on(t.userId, t.date)
      .where(sql`${t.kind} = 'daily'`),
  ],
);

export const timeAudits = pgTable.withRLS(
  "time_audits",
  {
    id: id(),
    userId: userId(),
    startDate: day("start_date").notNull(),
    days: integer("days").notNull().default(3),
    estQ1: integer("est_q1").notNull().default(25),
    estQ2: integer("est_q2").notNull().default(25),
    estQ3: integer("est_q3").notNull().default(25),
    estQ4: integer("est_q4").notNull().default(25),
    reflection: text("reflection").notNull().default(""),
    completedAt: isoTimestamp("completed_at"),
    createdAt: createdAt(),
  },
  (t) => [index("time_audits_user_idx").on(t.userId)],
);

export const timeEntries = pgTable.withRLS(
  "time_entries",
  {
    id: id(),
    userId: userId(),
    date: day("date").notNull(),
    /** 15-minute slot index, 0..95 */
    slot: integer("slot").notNull(),
    quadrant: integer("quadrant").notNull(),
    roleId: text("role_id").references(() => roles.id, { onDelete: "set null" }),
    note: text("note").notNull().default(""),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("time_entries_slot_unique").on(t.userId, t.date, t.slot)],
);

export const assessments = pgTable.withRLS(
  "assessments",
  {
    id: id(),
    userId: userId(),
    kind: text("kind", { enum: ["urgency", "center"] }).notNull(),
    answers: jsonb("answers").$type<Record<string, number>>().notNull(),
    score: integer("score"),
    notes: text("notes").notNull().default(""),
    createdAt: createdAt(),
  },
  (t) => [index("assessments_user_idx").on(t.userId, t.kind)],
);
