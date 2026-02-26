ALTER TABLE `event_provider_logs` ADD `created_by_user_id` text REFERENCES user(id);
