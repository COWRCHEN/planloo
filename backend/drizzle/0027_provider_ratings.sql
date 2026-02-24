-- Add user_provider_ratings table for 5-star rating on service providers

CREATE TABLE `user_provider_ratings` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `user_id` text NOT NULL REFERENCES `user`(`id`) ON DELETE CASCADE,
  `provider_id` integer NOT NULL REFERENCES `service_providers`(`id`) ON DELETE CASCADE,
  `rating` integer,
  `created_at` integer DEFAULT (unixepoch()) NOT NULL,
  `updated_at` integer DEFAULT (unixepoch()) NOT NULL
);

CREATE INDEX `idx_upr_user` ON `user_provider_ratings` (`user_id`);
CREATE INDEX `idx_upr_provider` ON `user_provider_ratings` (`provider_id`);
CREATE UNIQUE INDEX `unique_user_provider_rating` ON `user_provider_ratings` (`user_id`, `provider_id`);
