CREATE TABLE `floor_plan_objects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`uuid` text NOT NULL,
	`floor_plan_id` integer NOT NULL,
	`object_type` text NOT NULL,
	`table_shape` text,
	`element_type` text,
	`label` text NOT NULL,
	`pos_x` real DEFAULT 10 NOT NULL,
	`pos_y` real DEFAULT 10 NOT NULL,
	`width_ft` real DEFAULT 6 NOT NULL,
	`height_ft` real DEFAULT 6 NOT NULL,
	`rotation` integer DEFAULT 0 NOT NULL,
	`seat_count` integer,
	`table_number` integer,
	`style` text,
	`is_locked` integer DEFAULT false NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`floor_plan_id`) REFERENCES `floor_plans`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `floor_plan_objects_uuid_unique` ON `floor_plan_objects` (`uuid`);--> statement-breakpoint
CREATE INDEX `idx_floor_plan_objects_floor_plan_id` ON `floor_plan_objects` (`floor_plan_id`);--> statement-breakpoint
CREATE INDEX `idx_floor_plan_objects_uuid` ON `floor_plan_objects` (`uuid`);--> statement-breakpoint
CREATE TABLE `floor_plans` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`uuid` text NOT NULL,
	`event_id` integer NOT NULL,
	`name` text NOT NULL,
	`width_ft` real DEFAULT 100 NOT NULL,
	`height_ft` real DEFAULT 80 NOT NULL,
	`grid_snap` integer DEFAULT 1 NOT NULL,
	`is_default` integer DEFAULT false NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `floor_plans_uuid_unique` ON `floor_plans` (`uuid`);--> statement-breakpoint
CREATE INDEX `idx_floor_plans_event_id` ON `floor_plans` (`event_id`);--> statement-breakpoint
CREATE INDEX `idx_floor_plans_uuid` ON `floor_plans` (`uuid`);--> statement-breakpoint
CREATE TABLE `guest_relationships` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_id` integer NOT NULL,
	`guest_id_1` integer NOT NULL,
	`guest_id_2` integer NOT NULL,
	`relationship_type` text NOT NULL,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`guest_id_1`) REFERENCES `guests`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`guest_id_2`) REFERENCES `guests`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_guest_relationships_event_id` ON `guest_relationships` (`event_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_guest_relationship_pair` ON `guest_relationships` (`event_id`,`guest_id_1`,`guest_id_2`);--> statement-breakpoint
CREATE TABLE `seat_assignments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`floor_plan_object_id` integer NOT NULL,
	`guest_id` integer NOT NULL,
	`seat_number` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`floor_plan_object_id`) REFERENCES `floor_plan_objects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`guest_id`) REFERENCES `guests`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_seat_assignments_object_id` ON `seat_assignments` (`floor_plan_object_id`);--> statement-breakpoint
CREATE INDEX `idx_seat_assignments_guest_id` ON `seat_assignments` (`guest_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_seat_assignment_guest_object` ON `seat_assignments` (`guest_id`,`floor_plan_object_id`);