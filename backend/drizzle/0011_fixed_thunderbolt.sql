CREATE TABLE `event_privacy_settings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_id` integer NOT NULL,
	`enable_password` integer DEFAULT false NOT NULL,
	`page_password` text,
	`show_guest_list` integer DEFAULT false NOT NULL,
	`enable_social_preview` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `event_privacy_settings_event_id_unique` ON `event_privacy_settings` (`event_id`);--> statement-breakpoint
CREATE INDEX `idx_event_privacy_settings_event_id` ON `event_privacy_settings` (`event_id`);--> statement-breakpoint
CREATE TABLE `event_rsvp_settings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_id` integer NOT NULL,
	`enable_rsvp` integer DEFAULT false NOT NULL,
	`allow_maybe_response` integer DEFAULT true NOT NULL,
	`rsvp_deadline` integer,
	`rsvp_confirmation_message` text,
	`allow_rsvp_update` integer DEFAULT true NOT NULL,
	`allow_rsvp_plus_ones` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `event_rsvp_settings_event_id_unique` ON `event_rsvp_settings` (`event_id`);--> statement-breakpoint
CREATE INDEX `idx_event_rsvp_settings_event_id` ON `event_rsvp_settings` (`event_id`);
