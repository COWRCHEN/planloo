-- Common field required flags for base guest fields
ALTER TABLE `event_guest_settings` ADD COLUMN `required_first_name` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `event_guest_settings` ADD COLUMN `required_last_name` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `event_guest_settings` ADD COLUMN `required_email` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `event_guest_settings` ADD COLUMN `required_phone` integer DEFAULT 0 NOT NULL;
