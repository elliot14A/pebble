CREATE TABLE `push_subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`endpoint` text NOT NULL,
	`created_at` integer NOT NULL,
	`failed_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `push_endpoint_idx` ON `push_subscriptions` (`endpoint`);--> statement-breakpoint
CREATE INDEX `push_owner_idx` ON `push_subscriptions` (`user_id`);