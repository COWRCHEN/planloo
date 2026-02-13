PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`uuid` text NOT NULL,
	`user_id` text NOT NULL,
	`organization_id` text,
	`title` text NOT NULL,
	`description` text,
	`event_type` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`start_date` integer NOT NULL,
	`end_date` integer,
	`timezone` text DEFAULT 'UTC',
	`location_name` text,
	`location_address` text,
	`location_city` text,
	`location_state` text,
	`location_country` text,
	`location_postal_code` text,
	`location_lat` real,
	`location_lng` real,
	`guest_count_expected` integer,
	`guest_count_confirmed` integer DEFAULT 0,
	`budget_total` real,
	`budget_currency` text DEFAULT 'USD',
	`is_public` integer DEFAULT false NOT NULL,
	`slug` text,
	`cover_image_url` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_events`("id", "uuid", "user_id", "organization_id", "title", "description", "event_type", "status", "start_date", "end_date", "timezone", "location_name", "location_address", "location_city", "location_state", "location_country", "location_postal_code", "location_lat", "location_lng", "guest_count_expected", "guest_count_confirmed", "budget_total", "budget_currency", "is_public", "slug", "cover_image_url", "created_at", "updated_at", "deleted_at") SELECT "id", "uuid", "user_id", "organization_id", "title", "description", "event_type", "status", "start_date", "end_date", "timezone", "location_name", "location_address", "location_city", "location_state", "location_country", "location_postal_code", "location_lat", "location_lng", "guest_count_expected", "guest_count_confirmed", "budget_total", "budget_currency", "is_public", "slug", "cover_image_url", "created_at", "updated_at", "deleted_at" FROM `events`;--> statement-breakpoint
DROP TABLE `events`;--> statement-breakpoint
ALTER TABLE `__new_events` RENAME TO `events`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `events_uuid_unique` ON `events` (`uuid`);--> statement-breakpoint
CREATE UNIQUE INDEX `events_slug_unique` ON `events` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_events_user_id` ON `events` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_events_organization_id` ON `events` (`organization_id`);--> statement-breakpoint
CREATE INDEX `idx_events_uuid` ON `events` (`uuid`);--> statement-breakpoint
CREATE INDEX `idx_events_slug` ON `events` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_events_status` ON `events` (`status`);--> statement-breakpoint
CREATE INDEX `idx_events_start_date` ON `events` (`start_date`);--> statement-breakpoint
CREATE INDEX `idx_events_is_public` ON `events` (`is_public`);