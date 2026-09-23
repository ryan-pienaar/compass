CREATE TABLE "affirmations" (
	"id" text PRIMARY KEY,
	"user_id" text NOT NULL,
	"text" text NOT NULL,
	"role_id" text,
	"active" boolean DEFAULT true NOT NULL,
	"visual_confirmed" boolean DEFAULT false NOT NULL,
	"sort_order" double precision DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "affirmations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "assessments" (
	"id" text PRIMARY KEY,
	"user_id" text NOT NULL,
	"kind" text NOT NULL,
	"answers" jsonb NOT NULL,
	"score" integer,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "assessments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "blocks" (
	"id" text PRIMARY KEY,
	"user_id" text NOT NULL,
	"date" date NOT NULL,
	"start_min" integer NOT NULL,
	"end_min" integer NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"task_id" text,
	"role_id" text,
	"kind" text DEFAULT 'focus' NOT NULL,
	"quadrant" integer,
	"status" text DEFAULT 'planned' NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "blocks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "challenge_days" (
	"id" text PRIMARY KEY,
	"user_id" text NOT NULL,
	"challenge_id" text NOT NULL,
	"date" date NOT NULL,
	"commitment" text DEFAULT '' NOT NULL,
	"kept" boolean,
	"in_influence" boolean,
	"proactive_language" boolean,
	"owned_mistakes" boolean,
	"note" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "challenge_days" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "challenges" (
	"id" text PRIMARY KEY,
	"user_id" text NOT NULL,
	"started_on" date NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "challenges" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "concerns" (
	"id" text PRIMARY KEY,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"control" text,
	"approach" text DEFAULT '' NOT NULL,
	"first_step" text DEFAULT '' NOT NULL,
	"be_statement" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"task_id" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "concerns" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "delegation_checkins" (
	"id" text PRIMARY KEY,
	"user_id" text NOT NULL,
	"delegation_id" text NOT NULL,
	"date" date NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"on_track" boolean,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "delegation_checkins" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "delegations" (
	"id" text PRIMARY KEY,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"delegate" text DEFAULT '' NOT NULL,
	"desired_results" text DEFAULT '' NOT NULL,
	"due_date" date,
	"guidelines" text DEFAULT '' NOT NULL,
	"resources" text DEFAULT '' NOT NULL,
	"accountability" text DEFAULT '' NOT NULL,
	"consequences" text DEFAULT '' NOT NULL,
	"checkin_every_days" integer,
	"next_checkin" date,
	"status" text DEFAULT 'active' NOT NULL,
	"role_id" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "delegations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "goals" (
	"id" text PRIMARY KEY,
	"user_id" text NOT NULL,
	"role_id" text,
	"title" text NOT NULL,
	"end_in_mind" text DEFAULT '' NOT NULL,
	"measure" text DEFAULT '' NOT NULL,
	"target_date" date,
	"status" text DEFAULT 'active' NOT NULL,
	"sort_order" double precision DEFAULT 0 NOT NULL,
	"achieved_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "goals" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "journal" (
	"id" text PRIMARY KEY,
	"user_id" text NOT NULL,
	"date" date NOT NULL,
	"kind" text DEFAULT 'note' NOT NULL,
	"title" text,
	"body" text DEFAULT '' NOT NULL,
	"data" jsonb,
	"week_id" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "journal" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "mission_versions" (
	"id" text PRIMARY KEY,
	"user_id" text NOT NULL,
	"mission_id" text NOT NULL,
	"content" text NOT NULL,
	"note" text,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mission_versions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "missions" (
	"id" text PRIMARY KEY,
	"user_id" text NOT NULL,
	"kind" text DEFAULT 'personal' NOT NULL,
	"title" text DEFAULT 'My mission' NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "missions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "roles" (
	"id" text PRIMARY KEY,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"color" text DEFAULT '#0f766e' NOT NULL,
	"sort_order" double precision DEFAULT 0 NOT NULL,
	"is_saw" boolean DEFAULT false NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "roles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "settings" (
	"user_id" text,
	"key" text,
	"value" jsonb NOT NULL,
	CONSTRAINT "settings_pkey" PRIMARY KEY("user_id","key")
);
--> statement-breakpoint
ALTER TABLE "settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" text PRIMARY KEY,
	"user_id" text NOT NULL,
	"kind" text DEFAULT 'task' NOT NULL,
	"title" text NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"end_in_mind" text DEFAULT '' NOT NULL,
	"why" text DEFAULT '' NOT NULL,
	"if_then" text DEFAULT '' NOT NULL,
	"role_id" text,
	"goal_id" text,
	"week_id" text,
	"parent_id" text,
	"saw_dimension" text,
	"important" boolean,
	"urgent" boolean,
	"created_quadrant" integer,
	"due_date" date,
	"scheduled_date" date,
	"priority" text,
	"sort_order" double precision DEFAULT 0 NOT NULL,
	"estimate_minutes" integer,
	"actual_minutes" integer DEFAULT 0 NOT NULL,
	"carry_count" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"status_reason" text,
	"status_note" text DEFAULT '' NOT NULL,
	"delegation_id" text,
	"prevention_for_id" text,
	"carried_from_id" text,
	"source" text,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tasks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "time_audits" (
	"id" text PRIMARY KEY,
	"user_id" text NOT NULL,
	"start_date" date NOT NULL,
	"days" integer DEFAULT 3 NOT NULL,
	"est_q1" integer DEFAULT 25 NOT NULL,
	"est_q2" integer DEFAULT 25 NOT NULL,
	"est_q3" integer DEFAULT 25 NOT NULL,
	"est_q4" integer DEFAULT 25 NOT NULL,
	"reflection" text DEFAULT '' NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "time_audits" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "time_entries" (
	"id" text PRIMARY KEY,
	"user_id" text NOT NULL,
	"date" date NOT NULL,
	"slot" integer NOT NULL,
	"quadrant" integer NOT NULL,
	"role_id" text,
	"note" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "time_entries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "week_roles" (
	"user_id" text NOT NULL,
	"week_id" text,
	"role_id" text,
	"sort_order" double precision DEFAULT 0 NOT NULL,
	CONSTRAINT "week_roles_pkey" PRIMARY KEY("week_id","role_id")
);
--> statement-breakpoint
ALTER TABLE "week_roles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "weeks" (
	"id" text PRIMARY KEY,
	"user_id" text NOT NULL,
	"start_date" date NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"intention" text DEFAULT '' NOT NULL,
	"planned_at" timestamp with time zone,
	"reviewed_at" timestamp with time zone,
	"review_rating" integer,
	"review_notes" text DEFAULT '' NOT NULL,
	"lessons" text DEFAULT '' NOT NULL,
	"wins" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "weeks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "affirmations_user_idx" ON "affirmations" ("user_id");--> statement-breakpoint
CREATE INDEX "assessments_user_idx" ON "assessments" ("user_id","kind");--> statement-breakpoint
CREATE INDEX "blocks_user_date_idx" ON "blocks" ("user_id","date");--> statement-breakpoint
CREATE INDEX "blocks_task_idx" ON "blocks" ("task_id");--> statement-breakpoint
CREATE UNIQUE INDEX "challenge_days_unique" ON "challenge_days" ("challenge_id","date");--> statement-breakpoint
CREATE INDEX "challenges_user_idx" ON "challenges" ("user_id","status");--> statement-breakpoint
CREATE INDEX "concerns_user_idx" ON "concerns" ("user_id");--> statement-breakpoint
CREATE INDEX "delegation_checkins_idx" ON "delegation_checkins" ("delegation_id","date");--> statement-breakpoint
CREATE INDEX "delegations_user_idx" ON "delegations" ("user_id","status");--> statement-breakpoint
CREATE INDEX "goals_user_idx" ON "goals" ("user_id");--> statement-breakpoint
CREATE INDEX "goals_role_idx" ON "goals" ("role_id");--> statement-breakpoint
CREATE INDEX "journal_user_kind_date_idx" ON "journal" ("user_id","kind","date");--> statement-breakpoint
CREATE UNIQUE INDEX "journal_daily_unique" ON "journal" ("user_id","date") WHERE "kind" = 'daily';--> statement-breakpoint
CREATE INDEX "mission_versions_mission_idx" ON "mission_versions" ("mission_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "missions_user_kind_unique" ON "missions" ("user_id","kind");--> statement-breakpoint
CREATE INDEX "roles_user_idx" ON "roles" ("user_id","sort_order");--> statement-breakpoint
CREATE INDEX "tasks_user_status_idx" ON "tasks" ("user_id","status");--> statement-breakpoint
CREATE INDEX "tasks_user_scheduled_idx" ON "tasks" ("user_id","scheduled_date");--> statement-breakpoint
CREATE INDEX "tasks_week_idx" ON "tasks" ("week_id","kind");--> statement-breakpoint
CREATE INDEX "tasks_role_idx" ON "tasks" ("role_id");--> statement-breakpoint
CREATE INDEX "tasks_goal_idx" ON "tasks" ("goal_id");--> statement-breakpoint
CREATE INDEX "time_audits_user_idx" ON "time_audits" ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "time_entries_slot_unique" ON "time_entries" ("user_id","date","slot");--> statement-breakpoint
CREATE UNIQUE INDEX "weeks_user_start_unique" ON "weeks" ("user_id","start_date");--> statement-breakpoint
ALTER TABLE "affirmations" ADD CONSTRAINT "affirmations_role_id_roles_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_task_id_tasks_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_role_id_roles_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "challenge_days" ADD CONSTRAINT "challenge_days_challenge_id_challenges_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "challenges"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "concerns" ADD CONSTRAINT "concerns_task_id_tasks_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "delegation_checkins" ADD CONSTRAINT "delegation_checkins_delegation_id_delegations_id_fkey" FOREIGN KEY ("delegation_id") REFERENCES "delegations"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "delegations" ADD CONSTRAINT "delegations_role_id_roles_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_role_id_roles_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "journal" ADD CONSTRAINT "journal_week_id_weeks_id_fkey" FOREIGN KEY ("week_id") REFERENCES "weeks"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "mission_versions" ADD CONSTRAINT "mission_versions_mission_id_missions_id_fkey" FOREIGN KEY ("mission_id") REFERENCES "missions"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_role_id_roles_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_goal_id_goals_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "goals"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_week_id_weeks_id_fkey" FOREIGN KEY ("week_id") REFERENCES "weeks"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_parent_id_tasks_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "tasks"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_delegation_id_delegations_id_fkey" FOREIGN KEY ("delegation_id") REFERENCES "delegations"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_prevention_for_id_tasks_id_fkey" FOREIGN KEY ("prevention_for_id") REFERENCES "tasks"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_carried_from_id_tasks_id_fkey" FOREIGN KEY ("carried_from_id") REFERENCES "tasks"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_role_id_roles_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "week_roles" ADD CONSTRAINT "week_roles_week_id_weeks_id_fkey" FOREIGN KEY ("week_id") REFERENCES "weeks"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "week_roles" ADD CONSTRAINT "week_roles_role_id_roles_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE;