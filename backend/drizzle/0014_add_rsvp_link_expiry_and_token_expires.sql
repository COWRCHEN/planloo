ALTER TABLE `event_rsvp_settings` ADD `rsvp_link_expiry_hours` integer DEFAULT 12 NOT NULL;--> statement-breakpoint
ALTER TABLE `guests` ADD `rsvp_token_expires_at` integer;
