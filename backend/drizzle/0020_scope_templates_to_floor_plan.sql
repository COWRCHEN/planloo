-- Rescope object_templates from event to floor plan.
-- Templates are auto-seeded per plan on first GET, so no data migration needed.
DROP TABLE IF EXISTS `object_templates`;--> statement-breakpoint
CREATE TABLE `object_templates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`uuid` text NOT NULL,
	`floor_plan_id` integer NOT NULL REFERENCES `floor_plans`(`id`) ON DELETE CASCADE,
	`object_type` text NOT NULL,
	`table_shape` text,
	`element_type` text,
	`label` text NOT NULL,
	`width_ft` real NOT NULL,
	`height_ft` real NOT NULL,
	`seat_count` integer,
	`seat_top` integer,
	`seat_bottom` integer,
	`seat_left` integer,
	`seat_right` integer,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX `object_templates_uuid_unique` ON `object_templates` (`uuid`);--> statement-breakpoint
CREATE INDEX `idx_object_templates_floor_plan_id` ON `object_templates` (`floor_plan_id`);--> statement-breakpoint
CREATE INDEX `idx_object_templates_uuid` ON `object_templates` (`uuid`);
