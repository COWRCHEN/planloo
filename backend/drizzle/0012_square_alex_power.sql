CREATE TABLE `email_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`recipient_email` text NOT NULL,
	`email_type` text NOT NULL,
	`subject` text NOT NULL,
	`status` text NOT NULL,
	`resend_id` text,
	`error_message` text,
	`user_id` text,
	`event_id` integer,
	`metadata` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_email_log_recipient` ON `email_log` (`recipient_email`);--> statement-breakpoint
CREATE INDEX `idx_email_log_type` ON `email_log` (`email_type`);--> statement-breakpoint
CREATE INDEX `idx_email_log_user` ON `email_log` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_email_log_event` ON `email_log` (`event_id`);--> statement-breakpoint
CREATE INDEX `idx_email_log_created_at` ON `email_log` (`created_at`);--> statement-breakpoint
ALTER TABLE `event_rsvp_settings` ADD `send_rsvp_invitation` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `event_rsvp_settings` ADD `send_rsvp_confirmation` integer DEFAULT true NOT NULL;