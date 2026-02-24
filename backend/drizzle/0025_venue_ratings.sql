-- Replace user_venue_favorites with user_venue_ratings (5-star rating system)

CREATE TABLE `user_venue_ratings` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `user_id` text NOT NULL REFERENCES `user`(`id`) ON DELETE CASCADE,
  `venue_id` integer NOT NULL REFERENCES `venues`(`id`) ON DELETE CASCADE,
  `rating` integer NOT NULL,
  `created_at` integer DEFAULT (unixepoch()) NOT NULL,
  `updated_at` integer DEFAULT (unixepoch()) NOT NULL
);

CREATE INDEX `idx_uvr_user` ON `user_venue_ratings` (`user_id`);
CREATE INDEX `idx_uvr_venue` ON `user_venue_ratings` (`venue_id`);
CREATE UNIQUE INDEX `unique_user_venue_rating` ON `user_venue_ratings` (`user_id`, `venue_id`);

DROP TABLE `user_venue_favorites`;
