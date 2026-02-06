CREATE TABLE `guest_audit` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`guest_id` integer NOT NULL,
	`user_id` text,
	`action` text NOT NULL,
	`details` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`guest_id`) REFERENCES `guests`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_guest_audit_guest_id` ON `guest_audit` (`guest_id`);--> statement-breakpoint
CREATE INDEX `idx_guest_audit_created_at` ON `guest_audit` (`created_at`);
