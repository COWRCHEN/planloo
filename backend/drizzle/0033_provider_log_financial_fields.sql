ALTER TABLE `event_provider_logs` ADD `quote_amount` real;
--> statement-breakpoint
ALTER TABLE `event_provider_logs` ADD `deposit_amount` real;
--> statement-breakpoint
ALTER TABLE `event_provider_logs` ADD `deposit_paid` integer;
--> statement-breakpoint
ALTER TABLE `event_provider_logs` ADD `payment_due_date` integer;
