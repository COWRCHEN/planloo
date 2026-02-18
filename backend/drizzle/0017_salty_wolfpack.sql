CREATE TABLE `object_templates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`uuid` text NOT NULL,
	`event_id` integer NOT NULL,
	`object_type` text NOT NULL,
	`table_shape` text,
	`element_type` text,
	`label` text NOT NULL,
	`width_ft` real NOT NULL,
	`height_ft` real NOT NULL,
	`seat_count` integer,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `object_templates_uuid_unique` ON `object_templates` (`uuid`);--> statement-breakpoint
CREATE INDEX `idx_object_templates_event_id` ON `object_templates` (`event_id`);--> statement-breakpoint
CREATE INDEX `idx_object_templates_uuid` ON `object_templates` (`uuid`);