CREATE TABLE `task_dependencies` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`task_id` integer NOT NULL REFERENCES `tasks`(`id`) ON DELETE CASCADE,
	`depends_on_task_id` integer NOT NULL REFERENCES `tasks`(`id`) ON DELETE CASCADE,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);--> statement-breakpoint
CREATE INDEX `idx_task_deps_task_id` ON `task_dependencies` (`task_id`);--> statement-breakpoint
CREATE INDEX `idx_task_deps_depends_on` ON `task_dependencies` (`depends_on_task_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_task_deps_unique` ON `task_dependencies` (`task_id`, `depends_on_task_id`);
