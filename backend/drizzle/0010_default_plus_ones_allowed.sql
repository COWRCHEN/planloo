-- Event-level default for plus-ones allowed per guest (no per-guest input in form)
ALTER TABLE `event_guest_settings` ADD COLUMN `default_plus_ones_allowed` integer DEFAULT 0 NOT NULL;
