import { index, integer, primaryKey, real, sqliteTable, text, uniqueIndex, type AnySQLiteColumn } from "drizzle-orm/sqlite-core";
import { newId } from "../../shared/id.ts";

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => newId());
const now = () => new Date().toISOString();
const createdAt = () => text("created_at").notNull().$defaultFn(now);
const updatedAt = () =>
  text("updated_at")
    .notNull()
    .$defaultFn(now)
    .$onUpdateFn(now);

/* ------------------------------------------------------------------ */
/* Settings                                                             */
/* ------------------------------------------------------------------ */

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value", { mode: "json" }).notNull(),
});

/* ------------------------------------------------------------------ */
/* Habit 2: mission, roles, long-term goals, affirmations               */
/* ------------------------------------------------------------------ */

export const missions = sqliteTable("missions", {
  id: id(),
  kind: text("kind", { enum: ["personal", "family", "team"] }).notNull().default("personal"),
  title: text("title").notNull().default("My mission"),
  content: text("content").notNull().default(""),
  reviewedAt: text("reviewed_at"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const missionVersions = sqliteTable(
  "mission_versions",
  {
    id: id(),
    missionId: text("mission_id")
      .notNull()
      .references(() => missions.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    note: text("note"),
    createdAt: createdAt(),
  },
  (t) => [index("mission_versions_mission_idx").on(t.missionId, t.createdAt)],
);

export const roles = sqliteTable("roles", {
  id: id(),
  name: text("name").notNull(),
  /** "Who I want to be in this role" */
  description: text("description").notNull().default(""),
  color: text("color").notNull().default("#0f766e"),
  sortOrder: real("sort_order").notNull().default(0),
  /** The special "Sharpen the Saw" role (renewal in four dimensions). */
  isSaw: integer("is_saw", { mode: "boolean" }).notNull().default(false),
  archivedAt: text("archived_at"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const goals = sqliteTable(
  "goals",
  {
    id: id(),
    roleId: text("role_id").references(() => roles.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    /** First creation: the desired result. */
    endInMind: text("end_in_mind").notNull().default(""),
    /** How I'll know I've arrived. */
    measure: text("measure").notNull().default(""),
    targetDate: text("target_date"),
    status: text("status", { enum: ["active", "achieved", "paused", "archived"] })
      .notNull()
      .default("active"),
    sortOrder: real("sort_order").notNull().default(0),
    achievedAt: text("achieved_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("goals_role_idx").on(t.roleId)],
);

export const affirmations = sqliteTable("affirmations", {
  id: id(),
  text: text("text").notNull(),
  roleId: text("role_id").references(() => roles.id, { onDelete: "set null" }),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  visualConfirmed: integer("visual_confirmed", { mode: "boolean" }).notNull().default(false),
  sortOrder: real("sort_order").notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/* ------------------------------------------------------------------ */
/* Habit 3: weeks, tasks (incl. weekly goals), calendar blocks          */
/* ------------------------------------------------------------------ */

export const weeks = sqliteTable("weeks", {
  id: id(),
  startDate: text("start_date").notNull().unique(),
  status: text("status", { enum: ["draft", "planned", "reviewed"] })
    .notNull()
    .default("draft"),
  intention: text("intention").notNull().default(""),
  plannedAt: text("planned_at"),
  reviewedAt: text("reviewed_at"),
  /** 1-5: how well did the week translate my values into my days? */
  reviewRating: integer("review_rating"),
  reviewNotes: text("review_notes").notNull().default(""),
  lessons: text("lessons").notNull().default(""),
  /** Three wins from the week (celebrate before assessing). */
  wins: text("wins").notNull().default(""),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const weekRoles = sqliteTable(
  "week_roles",
  {
    weekId: text("week_id")
      .notNull()
      .references(() => weeks.id, { onDelete: "cascade" }),
    roleId: text("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    sortOrder: real("sort_order").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.weekId, t.roleId] })],
);

export const delegations = sqliteTable("delegations", {
  id: id(),
  title: text("title").notNull(),
  delegate: text("delegate").notNull().default(""),
  desiredResults: text("desired_results").notNull().default(""),
  dueDate: text("due_date"),
  guidelines: text("guidelines").notNull().default(""),
  resources: text("resources").notNull().default(""),
  accountability: text("accountability").notNull().default(""),
  consequences: text("consequences").notNull().default(""),
  checkinEveryDays: integer("checkin_every_days"),
  nextCheckin: text("next_checkin"),
  status: text("status", { enum: ["active", "done", "cancelled"] })
    .notNull()
    .default("active"),
  roleId: text("role_id").references(() => roles.id, { onDelete: "set null" }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const delegationCheckins = sqliteTable(
  "delegation_checkins",
  {
    id: id(),
    delegationId: text("delegation_id")
      .notNull()
      .references(() => delegations.id, { onDelete: "cascade" }),
    date: text("date").notNull(),
    notes: text("notes").notNull().default(""),
    onTrack: integer("on_track", { mode: "boolean" }),
    createdAt: createdAt(),
  },
  (t) => [index("delegation_checkins_idx").on(t.delegationId, t.date)],
);

export const tasks = sqliteTable(
  "tasks",
  {
    id: id(),
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
    parentId: text("parent_id").references((): AnySQLiteColumn => tasks.id, { onDelete: "set null" }),
    sawDimension: text("saw_dimension", { enum: ["physical", "mental", "spiritual", "social"] }),
    important: integer("important", { mode: "boolean" }),
    urgent: integer("urgent", { mode: "boolean" }),
    createdQuadrant: integer("created_quadrant"),
    dueDate: text("due_date"),
    scheduledDate: text("scheduled_date"),
    priority: text("priority", { enum: ["A", "B", "C"] }),
    sortOrder: real("sort_order").notNull().default(0),
    estimateMinutes: integer("estimate_minutes"),
    actualMinutes: integer("actual_minutes").notNull().default(0),
    carryCount: integer("carry_count").notNull().default(0),
    status: text("status", { enum: ["open", "done", "missed", "dropped"] })
      .notNull()
      .default("open"),
    statusReason: text("status_reason"),
    statusNote: text("status_note").notNull().default(""),
    delegationId: text("delegation_id").references(() => delegations.id, { onDelete: "set null" }),
    preventionForId: text("prevention_for_id").references((): AnySQLiteColumn => tasks.id, { onDelete: "set null" }),
    carriedFromId: text("carried_from_id").references((): AnySQLiteColumn => tasks.id, { onDelete: "set null" }),
    source: text("source"),
    completedAt: text("completed_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("tasks_status_idx").on(t.status),
    index("tasks_scheduled_idx").on(t.scheduledDate),
    index("tasks_week_idx").on(t.weekId, t.kind),
    index("tasks_role_idx").on(t.roleId),
    index("tasks_goal_idx").on(t.goalId),
  ],
);

export const blocks = sqliteTable(
  "blocks",
  {
    id: id(),
    date: text("date").notNull(),
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
  (t) => [index("blocks_date_idx").on(t.date), index("blocks_task_idx").on(t.taskId)],
);

/* ------------------------------------------------------------------ */
/* Habit 1: circle of influence, 30-day test                            */
/* ------------------------------------------------------------------ */

export const concerns = sqliteTable("concerns", {
  id: id(),
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
});

export const challenges = sqliteTable("challenges", {
  id: id(),
  startedOn: text("started_on").notNull(),
  status: text("status", { enum: ["active", "completed", "abandoned"] })
    .notNull()
    .default("active"),
  completedAt: text("completed_at"),
  createdAt: createdAt(),
});

export const challengeDays = sqliteTable(
  "challenge_days",
  {
    id: id(),
    challengeId: text("challenge_id")
      .notNull()
      .references(() => challenges.id, { onDelete: "cascade" }),
    date: text("date").notNull(),
    commitment: text("commitment").notNull().default(""),
    kept: integer("kept", { mode: "boolean" }),
    inInfluence: integer("in_influence", { mode: "boolean" }),
    proactiveLanguage: integer("proactive_language", { mode: "boolean" }),
    ownedMistakes: integer("owned_mistakes", { mode: "boolean" }),
    note: text("note").notNull().default(""),
  },
  (t) => [uniqueIndex("challenge_days_unique").on(t.challengeId, t.date)],
);

/* ------------------------------------------------------------------ */
/* Reflection, time audit, assessments                                  */
/* ------------------------------------------------------------------ */

export const journal = sqliteTable(
  "journal",
  {
    id: id(),
    date: text("date").notNull(),
    /** daily | weekly | tribute | freewrite | mission_q | resource | mistake | choice | note */
    kind: text("kind").notNull().default("note"),
    title: text("title"),
    body: text("body").notNull().default(""),
    data: text("data", { mode: "json" }).$type<Record<string, unknown>>(),
    weekId: text("week_id").references(() => weeks.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("journal_kind_date_idx").on(t.kind, t.date)],
);

export const timeAudits = sqliteTable("time_audits", {
  id: id(),
  startDate: text("start_date").notNull(),
  days: integer("days").notNull().default(3),
  estQ1: integer("est_q1").notNull().default(25),
  estQ2: integer("est_q2").notNull().default(25),
  estQ3: integer("est_q3").notNull().default(25),
  estQ4: integer("est_q4").notNull().default(25),
  reflection: text("reflection").notNull().default(""),
  completedAt: text("completed_at"),
  createdAt: createdAt(),
});

export const timeEntries = sqliteTable(
  "time_entries",
  {
    id: id(),
    date: text("date").notNull(),
    /** 15-minute slot index, 0..95 */
    slot: integer("slot").notNull(),
    quadrant: integer("quadrant").notNull(),
    roleId: text("role_id").references(() => roles.id, { onDelete: "set null" }),
    note: text("note").notNull().default(""),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("time_entries_slot_unique").on(t.date, t.slot)],
);

export const assessments = sqliteTable("assessments", {
  id: id(),
  kind: text("kind", { enum: ["urgency", "center"] }).notNull(),
  answers: text("answers", { mode: "json" }).$type<Record<string, number>>().notNull(),
  score: integer("score"),
  notes: text("notes").notNull().default(""),
  createdAt: createdAt(),
});

