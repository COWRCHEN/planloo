-- Event-level accommodation check-in/check-out (same for all hotels)
ALTER TABLE `event_guest_settings` ADD COLUMN `accommodation_check_in_date` text;
--> statement-breakpoint
ALTER TABLE `event_guest_settings` ADD COLUMN `accommodation_check_out_date` text;
