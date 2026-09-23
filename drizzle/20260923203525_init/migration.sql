CREATE TABLE `affirmations` (
	`id` text PRIMARY KEY,
	`text` text NOT NULL,
	`role_id` text,
	`active` integer DEFAULT true NOT NULL,
	`visual_confirmed` integer DEFAULT false NOT NULL,
	`sort_order` real DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT `fk_affirmations_role_id_roles_id_fk` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
CREATE TABLE `assessments` (
	`id` text PRIMARY KEY,
	`kind` text NOT NULL,
	`answers` text NOT NULL,
	`score` integer,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `blocks` (
	`id` text PRIMARY KEY,
	`date` text NOT NULL,
	`start_min` integer NOT NULL,
	`end_min` integer NOT NULL,
	`title` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`task_id` text,
	`role_id` text,
	`kind` text DEFAULT 'focus' NOT NULL,
	`quadrant` integer,
	`status` text DEFAULT 'planned' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT `fk_blocks_task_id_tasks_id_fk` FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE SET NULL,
	CONSTRAINT `fk_blocks_role_id_roles_id_fk` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
CREATE TABLE `challenge_days` (
	`id` text PRIMARY KEY,
	`challenge_id` text NOT NULL,
	`date` text NOT NULL,
	`commitment` text DEFAULT '' NOT NULL,
	`kept` integer,
	`in_influence` integer,
	`proactive_language` integer,
	`owned_mistakes` integer,
	`note` text DEFAULT '' NOT NULL,
	CONSTRAINT `fk_challenge_days_challenge_id_challenges_id_fk` FOREIGN KEY (`challenge_id`) REFERENCES `challenges`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `challenges` (
	`id` text PRIMARY KEY,
	`started_on` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`completed_at` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `concerns` (
	`id` text PRIMARY KEY,
	`title` text NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`control` text,
	`approach` text DEFAULT '' NOT NULL,
	`first_step` text DEFAULT '' NOT NULL,
	`be_statement` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`task_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT `fk_concerns_task_id_tasks_id_fk` FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
CREATE TABLE `delegation_checkins` (
	`id` text PRIMARY KEY,
	`delegation_id` text NOT NULL,
	`date` text NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`on_track` integer,
	`created_at` text NOT NULL,
	CONSTRAINT `fk_delegation_checkins_delegation_id_delegations_id_fk` FOREIGN KEY (`delegation_id`) REFERENCES `delegations`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `delegations` (
	`id` text PRIMARY KEY,
	`title` text NOT NULL,
	`delegate` text DEFAULT '' NOT NULL,
	`desired_results` text DEFAULT '' NOT NULL,
	`due_date` text,
	`guidelines` text DEFAULT '' NOT NULL,
	`resources` text DEFAULT '' NOT NULL,
	`accountability` text DEFAULT '' NOT NULL,
	`consequences` text DEFAULT '' NOT NULL,
	`checkin_every_days` integer,
	`next_checkin` text,
	`status` text DEFAULT 'active' NOT NULL,
	`role_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT `fk_delegations_role_id_roles_id_fk` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
CREATE TABLE `goals` (
	`id` text PRIMARY KEY,
	`role_id` text,
	`title` text NOT NULL,
	`end_in_mind` text DEFAULT '' NOT NULL,
	`measure` text DEFAULT '' NOT NULL,
	`target_date` text,
	`status` text DEFAULT 'active' NOT NULL,
	`sort_order` real DEFAULT 0 NOT NULL,
	`achieved_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT `fk_goals_role_id_roles_id_fk` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
CREATE TABLE `journal` (
	`id` text PRIMARY KEY,
	`date` text NOT NULL,
	`kind` text DEFAULT 'note' NOT NULL,
	`title` text,
	`body` text DEFAULT '' NOT NULL,
	`data` text,
	`week_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT `fk_journal_week_id_weeks_id_fk` FOREIGN KEY (`week_id`) REFERENCES `weeks`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
CREATE TABLE `mission_versions` (
	`id` text PRIMARY KEY,
	`mission_id` text NOT NULL,
	`content` text NOT NULL,
	`note` text,
	`created_at` text NOT NULL,
	CONSTRAINT `fk_mission_versions_mission_id_missions_id_fk` FOREIGN KEY (`mission_id`) REFERENCES `missions`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `missions` (
	`id` text PRIMARY KEY,
	`kind` text DEFAULT 'personal' NOT NULL,
	`title` text DEFAULT 'My mission' NOT NULL,
	`content` text DEFAULT '' NOT NULL,
	`reviewed_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `roles` (
	`id` text PRIMARY KEY,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`color` text DEFAULT '#0f766e' NOT NULL,
	`sort_order` real DEFAULT 0 NOT NULL,
	`is_saw` integer DEFAULT false NOT NULL,
	`archived_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY,
	`kind` text DEFAULT 'task' NOT NULL,
	`title` text NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`end_in_mind` text DEFAULT '' NOT NULL,
	`why` text DEFAULT '' NOT NULL,
	`if_then` text DEFAULT '' NOT NULL,
	`role_id` text,
	`goal_id` text,
	`week_id` text,
	`parent_id` text,
	`saw_dimension` text,
	`important` integer,
	`urgent` integer,
	`created_quadrant` integer,
	`due_date` text,
	`scheduled_date` text,
	`priority` text,
	`sort_order` real DEFAULT 0 NOT NULL,
	`estimate_minutes` integer,
	`actual_minutes` integer DEFAULT 0 NOT NULL,
	`carry_count` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`status_reason` text,
	`status_note` text DEFAULT '' NOT NULL,
	`delegation_id` text,
	`prevention_for_id` text,
	`carried_from_id` text,
	`source` text,
	`completed_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT `fk_tasks_role_id_roles_id_fk` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE SET NULL,
	CONSTRAINT `fk_tasks_goal_id_goals_id_fk` FOREIGN KEY (`goal_id`) REFERENCES `goals`(`id`) ON DELETE SET NULL,
	CONSTRAINT `fk_tasks_week_id_weeks_id_fk` FOREIGN KEY (`week_id`) REFERENCES `weeks`(`id`) ON DELETE SET NULL,
	CONSTRAINT `fk_tasks_parent_id_tasks_id_fk` FOREIGN KEY (`parent_id`) REFERENCES `tasks`(`id`) ON DELETE SET NULL,
	CONSTRAINT `fk_tasks_delegation_id_delegations_id_fk` FOREIGN KEY (`delegation_id`) REFERENCES `delegations`(`id`) ON DELETE SET NULL,
	CONSTRAINT `fk_tasks_prevention_for_id_tasks_id_fk` FOREIGN KEY (`prevention_for_id`) REFERENCES `tasks`(`id`) ON DELETE SET NULL,
	CONSTRAINT `fk_tasks_carried_from_id_tasks_id_fk` FOREIGN KEY (`carried_from_id`) REFERENCES `tasks`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
CREATE TABLE `time_audits` (
	`id` text PRIMARY KEY,
	`start_date` text NOT NULL,
	`days` integer DEFAULT 3 NOT NULL,
	`est_q1` integer DEFAULT 25 NOT NULL,
	`est_q2` integer DEFAULT 25 NOT NULL,
	`est_q3` integer DEFAULT 25 NOT NULL,
	`est_q4` integer DEFAULT 25 NOT NULL,
	`reflection` text DEFAULT '' NOT NULL,
	`completed_at` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `time_entries` (
	`id` text PRIMARY KEY,
	`date` text NOT NULL,
	`slot` integer NOT NULL,
	`quadrant` integer NOT NULL,
	`role_id` text,
	`note` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	CONSTRAINT `fk_time_entries_role_id_roles_id_fk` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
CREATE TABLE `week_roles` (
	`week_id` text NOT NULL,
	`role_id` text NOT NULL,
	`sort_order` real DEFAULT 0 NOT NULL,
	CONSTRAINT `week_roles_pk` PRIMARY KEY(`week_id`, `role_id`),
	CONSTRAINT `fk_week_roles_week_id_weeks_id_fk` FOREIGN KEY (`week_id`) REFERENCES `weeks`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_week_roles_role_id_roles_id_fk` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `weeks` (
	`id` text PRIMARY KEY,
	`start_date` text NOT NULL UNIQUE,
	`status` text DEFAULT 'draft' NOT NULL,
	`intention` text DEFAULT '' NOT NULL,
	`planned_at` text,
	`reviewed_at` text,
	`review_rating` integer,
	`review_notes` text DEFAULT '' NOT NULL,
	`lessons` text DEFAULT '' NOT NULL,
	`wins` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `blocks_date_idx` ON `blocks` (`date`);--> statement-breakpoint
CREATE INDEX `blocks_task_idx` ON `blocks` (`task_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `challenge_days_unique` ON `challenge_days` (`challenge_id`,`date`);--> statement-breakpoint
CREATE INDEX `delegation_checkins_idx` ON `delegation_checkins` (`delegation_id`,`date`);--> statement-breakpoint
CREATE INDEX `goals_role_idx` ON `goals` (`role_id`);--> statement-breakpoint
CREATE INDEX `journal_kind_date_idx` ON `journal` (`kind`,`date`);--> statement-breakpoint
CREATE INDEX `mission_versions_mission_idx` ON `mission_versions` (`mission_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `tasks_status_idx` ON `tasks` (`status`);--> statement-breakpoint
CREATE INDEX `tasks_scheduled_idx` ON `tasks` (`scheduled_date`);--> statement-breakpoint
CREATE INDEX `tasks_week_idx` ON `tasks` (`week_id`,`kind`);--> statement-breakpoint
CREATE INDEX `tasks_role_idx` ON `tasks` (`role_id`);--> statement-breakpoint
CREATE INDEX `tasks_goal_idx` ON `tasks` (`goal_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `time_entries_slot_unique` ON `time_entries` (`date`,`slot`);