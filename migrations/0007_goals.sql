CREATE TABLE `goals` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`target_minor` integer NOT NULL,
	`saved_minor` integer DEFAULT 0 NOT NULL,
	`currency` text NOT NULL,
	`account_id` text,
	`target_on` text,
	`created_at` integer NOT NULL,
	`reached_at` integer,
	`archived_at` integer
);
--> statement-breakpoint
CREATE INDEX `goals_owner_idx` ON `goals` (`user_id`,`archived_at`);