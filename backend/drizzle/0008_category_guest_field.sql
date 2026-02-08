-- Category as configurable guest field (enable/required + editable options)
ALTER TABLE `event_guest_settings` ADD COLUMN `enable_category` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `event_guest_settings` ADD COLUMN `required_category` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `event_guest_settings` ADD COLUMN `category_options` text;
