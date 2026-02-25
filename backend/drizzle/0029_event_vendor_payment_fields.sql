-- Add payment tracking fields to event_service_providers
ALTER TABLE `event_service_providers` ADD `deposit_amount` real;
ALTER TABLE `event_service_providers` ADD `deposit_paid` integer NOT NULL DEFAULT 0;
ALTER TABLE `event_service_providers` ADD `payment_due_date` integer;
ALTER TABLE `event_service_providers` ADD `price_includes` text;

-- Add payment tracking fields to event_venues
ALTER TABLE `event_venues` ADD `payment_due_date` integer;
ALTER TABLE `event_venues` ADD `price_includes` text;
