CREATE TABLE `event_provider_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`entity_type` text NOT NULL,
	`link_id` integer NOT NULL,
	`log_date` integer NOT NULL,
	`contact_person` text,
	`result` text,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_event_provider_logs_entity_link` ON `event_provider_logs` (`entity_type`,`link_id`);
--> statement-breakpoint
CREATE INDEX `idx_event_provider_logs_date` ON `event_provider_logs` (`log_date`);
