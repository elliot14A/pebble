CREATE TABLE `shares` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token` text NOT NULL,
	`label` text DEFAULT '' NOT NULL,
	`span` text NOT NULL,
	`from_date` text NOT NULL,
	`to_date` text NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer,
	`revoked_at` integer,
	`view_count` integer DEFAULT 0 NOT NULL,
	`last_viewed_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `shares_token_idx` ON `shares` (`token`);--> statement-breakpoint
CREATE INDEX `shares_owner_idx` ON `shares` (`user_id`,`created_at`);