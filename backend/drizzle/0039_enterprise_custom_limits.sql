-- Add custom_limits column to subscriptions for per-customer enterprise plan overrides
ALTER TABLE `subscriptions` ADD COLUMN `custom_limits` text;
