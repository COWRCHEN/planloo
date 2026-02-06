CREATE TABLE `event_guest_settings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_id` integer NOT NULL,
	`enable_address` integer DEFAULT false NOT NULL,
	`enable_meal_choice` integer DEFAULT false NOT NULL,
	`enable_accommodation` integer DEFAULT false NOT NULL,
	`enable_plus_one_name` integer DEFAULT false NOT NULL,
	`enable_table_assignment` integer DEFAULT false NOT NULL,
	`enable_transportation` integer DEFAULT false NOT NULL,
	`enable_accessibility` integer DEFAULT false NOT NULL,
	`meal_choice_options` text,
	`custom_field_definitions` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `event_guest_settings_event_id_unique` ON `event_guest_settings` (`event_id`);--> statement-breakpoint
CREATE INDEX `idx_event_guest_settings_event_id` ON `event_guest_settings` (`event_id`);--> statement-breakpoint
CREATE TABLE `birthday_guest_details` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`guest_id` integer NOT NULL,
	`relationship_to_birthday_person` text,
	`age_group` text,
	`gift_contribution` real,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`guest_id`) REFERENCES `guests`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `birthday_guest_details_guest_id_unique` ON `birthday_guest_details` (`guest_id`);--> statement-breakpoint
CREATE INDEX `idx_birthday_guest_details_guest_id` ON `birthday_guest_details` (`guest_id`);--> statement-breakpoint
CREATE INDEX `idx_birthday_guest_details_age_group` ON `birthday_guest_details` (`age_group`);--> statement-breakpoint
CREATE TABLE `conference_guest_details` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`guest_id` integer NOT NULL,
	`badge_type` text DEFAULT 'standard',
	`organization` text,
	`session_registrations` text,
	`special_access` integer DEFAULT false NOT NULL,
	`attending_days` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`guest_id`) REFERENCES `guests`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `conference_guest_details_guest_id_unique` ON `conference_guest_details` (`guest_id`);--> statement-breakpoint
CREATE INDEX `idx_conference_guest_details_guest_id` ON `conference_guest_details` (`guest_id`);--> statement-breakpoint
CREATE INDEX `idx_conference_guest_details_badge` ON `conference_guest_details` (`badge_type`);--> statement-breakpoint
CREATE INDEX `idx_conference_guest_details_organization` ON `conference_guest_details` (`organization`);--> statement-breakpoint
CREATE TABLE `corporate_guest_details` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`guest_id` integer NOT NULL,
	`company_name` text,
	`job_title` text,
	`department` text,
	`attendee_type` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`guest_id`) REFERENCES `guests`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `corporate_guest_details_guest_id_unique` ON `corporate_guest_details` (`guest_id`);--> statement-breakpoint
CREATE INDEX `idx_corporate_guest_details_guest_id` ON `corporate_guest_details` (`guest_id`);--> statement-breakpoint
CREATE INDEX `idx_corporate_guest_details_company` ON `corporate_guest_details` (`company_name`);--> statement-breakpoint
CREATE INDEX `idx_corporate_guest_details_attendee_type` ON `corporate_guest_details` (`attendee_type`);--> statement-breakpoint
CREATE TABLE `wedding_guest_details` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`guest_id` integer NOT NULL,
	`guest_side` text,
	`invited_to` text DEFAULT 'both',
	`wedding_gift_description` text,
	`wedding_gift_thank_you_sent` integer DEFAULT false NOT NULL,
	`shower_gift_description` text,
	`shower_gift_thank_you_sent` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`guest_id`) REFERENCES `guests`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `wedding_guest_details_guest_id_unique` ON `wedding_guest_details` (`guest_id`);--> statement-breakpoint
CREATE INDEX `idx_wedding_guest_details_guest_id` ON `wedding_guest_details` (`guest_id`);--> statement-breakpoint
CREATE INDEX `idx_wedding_guest_details_side` ON `wedding_guest_details` (`guest_side`);--> statement-breakpoint
CREATE INDEX `idx_wedding_guest_details_invited_to` ON `wedding_guest_details` (`invited_to`);--> statement-breakpoint
ALTER TABLE `guests` ADD `address_street` text;--> statement-breakpoint
ALTER TABLE `guests` ADD `address_city` text;--> statement-breakpoint
ALTER TABLE `guests` ADD `address_state` text;--> statement-breakpoint
ALTER TABLE `guests` ADD `address_zip_code` text;--> statement-breakpoint
ALTER TABLE `guests` ADD `address_country` text;--> statement-breakpoint
ALTER TABLE `guests` ADD `meal_choice` text;--> statement-breakpoint
ALTER TABLE `guests` ADD `needs_accommodation` integer;--> statement-breakpoint
ALTER TABLE `guests` ADD `hotel_name` text;--> statement-breakpoint
ALTER TABLE `guests` ADD `check_in_date` integer;--> statement-breakpoint
ALTER TABLE `guests` ADD `check_out_date` integer;--> statement-breakpoint
ALTER TABLE `guests` ADD `plus_one_name` text;--> statement-breakpoint
ALTER TABLE `guests` ADD `table_assignment` text;--> statement-breakpoint
ALTER TABLE `guests` ADD `transportation_needed` integer;--> statement-breakpoint
ALTER TABLE `guests` ADD `accessibility_needs` text;--> statement-breakpoint
ALTER TABLE `guests` ADD `custom_field_data` text;--> statement-breakpoint
CREATE INDEX `idx_guests_needs_accommodation` ON `guests` (`needs_accommodation`);--> statement-breakpoint
CREATE INDEX `idx_guests_table_assignment` ON `guests` (`table_assignment`);