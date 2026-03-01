-- Add subscriptions table for billing/plan management
CREATE TABLE `subscriptions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL UNIQUE REFERENCES `user`(`id`) ON DELETE CASCADE,
	`plan` text NOT NULL DEFAULT 'free',
	`stripe_customer_id` text UNIQUE,
	`stripe_subscription_id` text UNIQUE,
	`stripe_price_id` text,
	`status` text NOT NULL DEFAULT 'free',
	`current_period_start` integer,
	`current_period_end` integer,
	`cancel_at_period_end` integer NOT NULL DEFAULT false,
	`canceled_at` integer,
	`emails_sent_this_period` integer NOT NULL DEFAULT 0,
	`sms_sent_this_period` integer NOT NULL DEFAULT 0,
	`created_at` integer NOT NULL DEFAULT (unixepoch()),
	`updated_at` integer NOT NULL DEFAULT (unixepoch())
);
--> statement-breakpoint
CREATE INDEX `subscriptions_user_id_idx` ON `subscriptions` (`user_id`);
--> statement-breakpoint
CREATE INDEX `subscriptions_stripe_customer_idx` ON `subscriptions` (`stripe_customer_id`);
