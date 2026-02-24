-- Make rating nullable and add comment column to user_venue_ratings
-- SQLite requires a table recreation to change column nullability

CREATE TABLE `user_venue_ratings_new` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `user_id` text NOT NULL REFERENCES `user`(`id`) ON DELETE CASCADE,
  `venue_id` integer NOT NULL REFERENCES `venues`(`id`) ON DELETE CASCADE,
  `rating` integer,
  `comment` text,
  `created_at` integer DEFAULT (unixepoch()) NOT NULL,
  `updated_at` integer DEFAULT (unixepoch()) NOT NULL
);

INSERT INTO `user_venue_ratings_new`
  SELECT `id`, `user_id`, `venue_id`, `rating`, NULL, `created_at`, `updated_at`
  FROM `user_venue_ratings`;

DROP TABLE `user_venue_ratings`;
ALTER TABLE `user_venue_ratings_new` RENAME TO `user_venue_ratings`;

CREATE INDEX `idx_uvr_user` ON `user_venue_ratings` (`user_id`);
CREATE INDEX `idx_uvr_venue` ON `user_venue_ratings` (`venue_id`);
CREATE UNIQUE INDEX `unique_user_venue_rating` ON `user_venue_ratings` (`user_id`, `venue_id`);
