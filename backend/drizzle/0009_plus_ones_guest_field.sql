-- Plus-ones as configurable guest field (enablePlusOnes) and adults/children breakdown
ALTER TABLE `event_guest_settings` ADD COLUMN `enable_plus_ones` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `guests` ADD COLUMN `plus_ones_count_adults` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `guests` ADD COLUMN `plus_ones_count_children` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
-- Backfill: existing plus_ones_count becomes adults, children = 0
UPDATE `guests` SET `plus_ones_count_adults` = `plus_ones_count`, `plus_ones_count_children` = 0;
