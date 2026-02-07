-- Accommodation: event-level hotel list and guest room number
ALTER TABLE `guests` ADD COLUMN `room_number` text;
--> statement-breakpoint
ALTER TABLE `event_guest_settings` ADD COLUMN `accommodation_hotels` text;
