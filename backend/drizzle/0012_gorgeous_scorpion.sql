CREATE TABLE `email_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`recipient_email` text NOT NULL,
	`email_type` text NOT NULL,
	`subject` text NOT NULL,
	`status` text NOT NULL,
	`resend_id` text,
	`error_message` text,
	`user_id` text,
	`metadata` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_email_log_recipient` ON `email_log` (`recipient_email`);--> statement-breakpoint
CREATE INDEX `idx_email_log_type` ON `email_log` (`email_type`);--> statement-breakpoint
CREATE INDEX `idx_email_log_user` ON `email_log` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_email_log_created_at` ON `email_log` (`created_at`);--> statement-breakpoint
CREATE TABLE `notification_settings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`email_welcome` integer DEFAULT true NOT NULL,
	`email_rsvp_received` integer DEFAULT true NOT NULL,
	`email_rsvp_invitation` integer DEFAULT true NOT NULL,
	`email_rsvp_confirmation` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `notification_settings_user_id_unique` ON `notification_settings` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_notification_settings_user` ON `notification_settings` (`user_id`);