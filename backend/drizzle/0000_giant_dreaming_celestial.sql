CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`id_token` text,
	`password` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_account_user_id` ON `account` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_account_provider` ON `account` (`provider_id`,`account_id`);--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_session_user_id` ON `session` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_session_expires_at` ON `session` (`expires_at`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	`platform_role` text DEFAULT 'user' NOT NULL,
	`phone` text,
	`is_active` integer DEFAULT true NOT NULL,
	`suspended_at` integer,
	`suspended_reason` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE INDEX `idx_user_email` ON `user` (`email`);--> statement-breakpoint
CREATE INDEX `idx_user_platform_role` ON `user` (`platform_role`);--> statement-breakpoint
CREATE INDEX `idx_user_is_active` ON `user` (`is_active`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_verification_identifier` ON `verification` (`identifier`);--> statement-breakpoint
CREATE TABLE `organization` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`type` text DEFAULT 'company' NOT NULL,
	`description` text,
	`logo_url` text,
	`website` text,
	`created_by` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `organization_slug_unique` ON `organization` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_organization_slug` ON `organization` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_organization_type` ON `organization` (`type`);--> statement-breakpoint
CREATE INDEX `idx_organization_created_by` ON `organization` (`created_by`);--> statement-breakpoint
CREATE TABLE `organization_invitation` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`email` text NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`invited_by` text NOT NULL,
	`token` text NOT NULL,
	`expires_at` integer NOT NULL,
	`accepted_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`invited_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `organization_invitation_token_unique` ON `organization_invitation` (`token`);--> statement-breakpoint
CREATE INDEX `idx_org_invitation_org_id` ON `organization_invitation` (`organization_id`);--> statement-breakpoint
CREATE INDEX `idx_org_invitation_email` ON `organization_invitation` (`email`);--> statement-breakpoint
CREATE INDEX `idx_org_invitation_token` ON `organization_invitation` (`token`);--> statement-breakpoint
CREATE TABLE `organization_member` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`organization_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`invited_by` text,
	`invited_at` integer,
	`accepted_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`invited_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_org_member_org_id` ON `organization_member` (`organization_id`);--> statement-breakpoint
CREATE INDEX `idx_org_member_user_id` ON `organization_member` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_org_member_role` ON `organization_member` (`role`);--> statement-breakpoint
CREATE UNIQUE INDEX `unique_org_user` ON `organization_member` (`organization_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `event_collaborators` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_id` integer NOT NULL,
	`user_id` text NOT NULL,
	`role` text DEFAULT 'viewer' NOT NULL,
	`invited_by_user_id` text,
	`invited_at` integer,
	`accepted_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`invited_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_event_collaborators_event_id` ON `event_collaborators` (`event_id`);--> statement-breakpoint
CREATE INDEX `idx_event_collaborators_user_id` ON `event_collaborators` (`user_id`);--> statement-breakpoint
CREATE TABLE `events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`uuid` text NOT NULL,
	`user_id` text,
	`organization_id` text,
	`title` text NOT NULL,
	`description` text,
	`event_type` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`start_date` integer NOT NULL,
	`end_date` integer,
	`timezone` text DEFAULT 'UTC',
	`location_name` text,
	`location_address` text,
	`location_city` text,
	`location_state` text,
	`location_country` text,
	`location_postal_code` text,
	`location_lat` real,
	`location_lng` real,
	`guest_count_expected` integer,
	`guest_count_confirmed` integer DEFAULT 0,
	`budget_total` real,
	`budget_currency` text DEFAULT 'USD',
	`is_public` integer DEFAULT false NOT NULL,
	`slug` text,
	`cover_image_url` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `events_uuid_unique` ON `events` (`uuid`);--> statement-breakpoint
CREATE UNIQUE INDEX `events_slug_unique` ON `events` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_events_user_id` ON `events` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_events_organization_id` ON `events` (`organization_id`);--> statement-breakpoint
CREATE INDEX `idx_events_uuid` ON `events` (`uuid`);--> statement-breakpoint
CREATE INDEX `idx_events_slug` ON `events` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_events_status` ON `events` (`status`);--> statement-breakpoint
CREATE INDEX `idx_events_start_date` ON `events` (`start_date`);--> statement-breakpoint
CREATE INDEX `idx_events_is_public` ON `events` (`is_public`);--> statement-breakpoint
CREATE TABLE `guests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`uuid` text NOT NULL,
	`event_id` integer NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text,
	`email` text,
	`phone` text,
	`category` text,
	`rsvp_status` text DEFAULT 'pending',
	`rsvp_token` text,
	`rsvp_responded_at` integer,
	`plus_ones_allowed` integer DEFAULT 0 NOT NULL,
	`plus_ones_count` integer DEFAULT 0 NOT NULL,
	`dietary_restrictions` text,
	`notes` text,
	`checked_in` integer DEFAULT false NOT NULL,
	`checked_in_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `guests_uuid_unique` ON `guests` (`uuid`);--> statement-breakpoint
CREATE UNIQUE INDEX `guests_rsvp_token_unique` ON `guests` (`rsvp_token`);--> statement-breakpoint
CREATE INDEX `idx_guests_event_id` ON `guests` (`event_id`);--> statement-breakpoint
CREATE INDEX `idx_guests_uuid` ON `guests` (`uuid`);--> statement-breakpoint
CREATE INDEX `idx_guests_rsvp_token` ON `guests` (`rsvp_token`);--> statement-breakpoint
CREATE INDEX `idx_guests_rsvp_status` ON `guests` (`rsvp_status`);--> statement-breakpoint
CREATE INDEX `idx_guests_email` ON `guests` (`email`);--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`uuid` text NOT NULL,
	`event_id` integer NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`category` text,
	`assigned_to_user_id` text,
	`due_date` integer,
	`priority` text DEFAULT 'medium' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`completed_at` integer,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`assigned_to_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tasks_uuid_unique` ON `tasks` (`uuid`);--> statement-breakpoint
CREATE INDEX `idx_tasks_event_id` ON `tasks` (`event_id`);--> statement-breakpoint
CREATE INDEX `idx_tasks_uuid` ON `tasks` (`uuid`);--> statement-breakpoint
CREATE INDEX `idx_tasks_status` ON `tasks` (`status`);--> statement-breakpoint
CREATE INDEX `idx_tasks_assigned_to` ON `tasks` (`assigned_to_user_id`);--> statement-breakpoint
CREATE TABLE `budget_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`uuid` text NOT NULL,
	`event_id` integer NOT NULL,
	`category` text NOT NULL,
	`item_name` text NOT NULL,
	`description` text,
	`estimated_cost` real,
	`actual_cost` real,
	`currency` text DEFAULT 'USD' NOT NULL,
	`service_provider_id` integer,
	`payment_status` text DEFAULT 'pending' NOT NULL,
	`payment_due_date` integer,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`service_provider_id`) REFERENCES `service_providers`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `budget_items_uuid_unique` ON `budget_items` (`uuid`);--> statement-breakpoint
CREATE INDEX `idx_budget_items_event_id` ON `budget_items` (`event_id`);--> statement-breakpoint
CREATE INDEX `idx_budget_items_uuid` ON `budget_items` (`uuid`);--> statement-breakpoint
CREATE INDEX `idx_budget_items_category` ON `budget_items` (`category`);--> statement-breakpoint
CREATE INDEX `idx_budget_items_payment_status` ON `budget_items` (`payment_status`);--> statement-breakpoint
CREATE TABLE `payments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`uuid` text NOT NULL,
	`budget_item_id` integer NOT NULL,
	`amount` real NOT NULL,
	`currency` text DEFAULT 'USD' NOT NULL,
	`payment_method` text,
	`payment_date` integer NOT NULL,
	`reference_number` text,
	`receipt_url` text,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`budget_item_id`) REFERENCES `budget_items`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payments_uuid_unique` ON `payments` (`uuid`);--> statement-breakpoint
CREATE INDEX `idx_payments_budget_item_id` ON `payments` (`budget_item_id`);--> statement-breakpoint
CREATE INDEX `idx_payments_uuid` ON `payments` (`uuid`);--> statement-breakpoint
CREATE INDEX `idx_payments_payment_date` ON `payments` (`payment_date`);--> statement-breakpoint
CREATE TABLE `event_service_providers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_id` integer NOT NULL,
	`service_provider_id` integer NOT NULL,
	`status` text DEFAULT 'inquiry' NOT NULL,
	`quote_amount` real,
	`final_amount` real,
	`currency` text DEFAULT 'USD' NOT NULL,
	`contract_url` text,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`service_provider_id`) REFERENCES `service_providers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_event_service_providers_event` ON `event_service_providers` (`event_id`);--> statement-breakpoint
CREATE INDEX `idx_event_service_providers_provider` ON `event_service_providers` (`service_provider_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `unique_event_provider` ON `event_service_providers` (`event_id`,`service_provider_id`);--> statement-breakpoint
CREATE TABLE `event_venues` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_id` integer NOT NULL,
	`venue_id` integer NOT NULL,
	`status` text DEFAULT 'inquiry' NOT NULL,
	`booking_date` integer,
	`booking_start_time` integer,
	`booking_end_time` integer,
	`quote_amount` real,
	`final_amount` real,
	`currency` text DEFAULT 'USD' NOT NULL,
	`deposit_amount` real,
	`deposit_paid` integer DEFAULT false NOT NULL,
	`contract_url` text,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`venue_id`) REFERENCES `venues`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_event_venues_event` ON `event_venues` (`event_id`);--> statement-breakpoint
CREATE INDEX `idx_event_venues_venue` ON `event_venues` (`venue_id`);--> statement-breakpoint
CREATE INDEX `idx_event_venues_booking_date` ON `event_venues` (`booking_date`);--> statement-breakpoint
CREATE TABLE `images` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`uuid` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` integer NOT NULL,
	`url` text NOT NULL,
	`thumbnail_url` text,
	`alt_text` text,
	`caption` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`is_cover` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `images_uuid_unique` ON `images` (`uuid`);--> statement-breakpoint
CREATE INDEX `idx_images_entity` ON `images` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `idx_images_uuid` ON `images` (`uuid`);--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`uuid` text NOT NULL,
	`user_id` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` integer NOT NULL,
	`event_id` integer,
	`rating` integer NOT NULL,
	`title` text,
	`review_text` text,
	`would_recommend` integer DEFAULT true NOT NULL,
	`is_verified` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reviews_uuid_unique` ON `reviews` (`uuid`);--> statement-breakpoint
CREATE INDEX `idx_reviews_entity` ON `reviews` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `idx_reviews_user_id` ON `reviews` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_reviews_rating` ON `reviews` (`rating`);--> statement-breakpoint
CREATE INDEX `idx_reviews_created_at` ON `reviews` (`created_at`);--> statement-breakpoint
CREATE TABLE `service_providers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`uuid` text NOT NULL,
	`user_id` text,
	`business_name` text NOT NULL,
	`contact_name` text,
	`email` text NOT NULL,
	`phone` text,
	`website` text,
	`category` text NOT NULL,
	`description` text,
	`services_offered` text,
	`price_range` text,
	`location_city` text,
	`location_state` text,
	`location_country` text,
	`service_area_radius` integer,
	`rating_average` real DEFAULT 0 NOT NULL,
	`rating_count` integer DEFAULT 0 NOT NULL,
	`logo_url` text,
	`is_verified` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `service_providers_uuid_unique` ON `service_providers` (`uuid`);--> statement-breakpoint
CREATE INDEX `idx_service_providers_uuid` ON `service_providers` (`uuid`);--> statement-breakpoint
CREATE INDEX `idx_service_providers_user_id` ON `service_providers` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_service_providers_category` ON `service_providers` (`category`);--> statement-breakpoint
CREATE INDEX `idx_service_providers_location` ON `service_providers` (`location_city`,`location_state`);--> statement-breakpoint
CREATE INDEX `idx_service_providers_rating` ON `service_providers` (`rating_average`);--> statement-breakpoint
CREATE INDEX `idx_service_providers_is_active` ON `service_providers` (`is_active`);--> statement-breakpoint
CREATE TABLE `venues` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`uuid` text NOT NULL,
	`user_id` text,
	`name` text NOT NULL,
	`description` text,
	`venue_type` text,
	`capacity_min` integer,
	`capacity_max` integer,
	`address` text NOT NULL,
	`city` text NOT NULL,
	`state` text,
	`country` text NOT NULL,
	`postal_code` text,
	`lat` real,
	`lng` real,
	`price_per_hour` real,
	`price_per_day` real,
	`currency` text DEFAULT 'USD' NOT NULL,
	`amenities` text,
	`policies` text,
	`contact_email` text,
	`contact_phone` text,
	`website` text,
	`rating_average` real DEFAULT 0 NOT NULL,
	`rating_count` integer DEFAULT 0 NOT NULL,
	`is_verified` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `venues_uuid_unique` ON `venues` (`uuid`);--> statement-breakpoint
CREATE INDEX `idx_venues_uuid` ON `venues` (`uuid`);--> statement-breakpoint
CREATE INDEX `idx_venues_city` ON `venues` (`city`);--> statement-breakpoint
CREATE INDEX `idx_venues_type` ON `venues` (`venue_type`);--> statement-breakpoint
CREATE INDEX `idx_venues_capacity` ON `venues` (`capacity_max`);--> statement-breakpoint
CREATE INDEX `idx_venues_location` ON `venues` (`lat`,`lng`);--> statement-breakpoint
CREATE INDEX `idx_venues_is_active` ON `venues` (`is_active`);--> statement-breakpoint
CREATE TABLE `audit_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`actor_id` text NOT NULL,
	`actor_role` text NOT NULL,
	`action` text NOT NULL,
	`target_type` text,
	`target_id` text,
	`target_name` text,
	`details` text,
	`ip_address` text,
	`user_agent` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`actor_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_audit_log_actor_id` ON `audit_log` (`actor_id`);--> statement-breakpoint
CREATE INDEX `idx_audit_log_action` ON `audit_log` (`action`);--> statement-breakpoint
CREATE INDEX `idx_audit_log_target` ON `audit_log` (`target_type`,`target_id`);--> statement-breakpoint
CREATE INDEX `idx_audit_log_created_at` ON `audit_log` (`created_at`);--> statement-breakpoint
CREATE TABLE `impersonation_session` (
	`id` text PRIMARY KEY NOT NULL,
	`admin_id` text NOT NULL,
	`target_user_id` text NOT NULL,
	`reason` text NOT NULL,
	`started_at` integer DEFAULT (unixepoch()) NOT NULL,
	`ended_at` integer,
	`ip_address` text,
	FOREIGN KEY (`admin_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`target_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_impersonation_admin_id` ON `impersonation_session` (`admin_id`);--> statement-breakpoint
CREATE INDEX `idx_impersonation_target_id` ON `impersonation_session` (`target_user_id`);--> statement-breakpoint
CREATE INDEX `idx_impersonation_started_at` ON `impersonation_session` (`started_at`);