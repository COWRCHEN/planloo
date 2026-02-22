-- Add address and postal code columns to service_providers
ALTER TABLE `service_providers` ADD `location_address` text;
ALTER TABLE `service_providers` ADD `location_postal_code` text;

-- Add indexes for nearby queries on service_providers
CREATE INDEX `idx_service_providers_city_country` ON `service_providers` (`location_city`, `location_country`);
CREATE INDEX `idx_service_providers_postal_code` ON `service_providers` (`location_postal_code`);

-- Add indexes for nearby queries on venues
CREATE INDEX `idx_venues_city_country` ON `venues` (`city`, `country`);
CREATE INDEX `idx_venues_postal_code` ON `venues` (`postal_code`);
