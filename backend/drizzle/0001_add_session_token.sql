-- Add token column required by Better Auth session schema
ALTER TABLE `session` ADD COLUMN `token` text NOT NULL DEFAULT '';
--> statement-breakpoint
-- Backfill existing sessions so token is unique (use id as token for legacy rows)
UPDATE `session` SET `token` = `id` WHERE `token` = '';
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);
--> statement-breakpoint
CREATE INDEX `idx_session_token` ON `session` (`token`);
