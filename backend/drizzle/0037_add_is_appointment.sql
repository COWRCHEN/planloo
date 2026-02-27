ALTER TABLE `event_provider_logs` ADD `is_appointment` integer NOT NULL DEFAULT 0;
CREATE INDEX `idx_event_provider_logs_appointment` ON `event_provider_logs` (`is_appointment`,`booking_start_time`);
