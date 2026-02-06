-- Add required flag for each optional guest field
ALTER TABLE `event_guest_settings` ADD COLUMN `required_address` integer DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE `event_guest_settings` ADD COLUMN `required_meal_choice` integer DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE `event_guest_settings` ADD COLUMN `required_accommodation` integer DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE `event_guest_settings` ADD COLUMN `required_plus_one_name` integer DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE `event_guest_settings` ADD COLUMN `required_table_assignment` integer DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE `event_guest_settings` ADD COLUMN `required_transportation` integer DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE `event_guest_settings` ADD COLUMN `required_accessibility` integer DEFAULT false NOT NULL;
