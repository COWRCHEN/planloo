CREATE TABLE `user_venue_favorites` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL REFERENCES `user`(`id`) ON DELETE cascade,
	`venue_id` integer NOT NULL REFERENCES `venues`(`id`) ON DELETE cascade,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_uvf_user` ON `user_venue_favorites` (`user_id`);
--> statement-breakpoint
CREATE INDEX `idx_uvf_venue` ON `user_venue_favorites` (`venue_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `unique_user_venue_favorite` ON `user_venue_favorites` (`user_id`,`venue_id`);
