-- Unit-based pricing: per-user subscription items table
CREATE TABLE `user_subscription_items` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `user_id` text NOT NULL REFERENCES `user`(`id`) ON DELETE CASCADE,
  `item_type` text NOT NULL,
  `quantity` integer DEFAULT 1 NOT NULL,
  `stripe_item_id` text,
  `active_from` integer,
  `active_to` integer,
  `created_at` integer DEFAULT (unixepoch()) NOT NULL,
  `updated_at` integer DEFAULT (unixepoch()) NOT NULL
);

CREATE INDEX `sub_items_user_id_idx` ON `user_subscription_items` (`user_id`);
CREATE INDEX `sub_items_active_idx` ON `user_subscription_items` (`user_id`, `active_to`);
