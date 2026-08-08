CREATE TABLE `recurring` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`kind` text NOT NULL,
	`type` text NOT NULL,
	`name` text NOT NULL,
	`amount_minor` integer NOT NULL,
	`currency` text NOT NULL,
	`account_id` text NOT NULL,
	`category_id` text,
	`every` text NOT NULL,
	`day_of_month` integer NOT NULL,
	`next_on` text NOT NULL,
	`last_run_on` text,
	`created_at` integer NOT NULL,
	`archived_at` integer
);
--> statement-breakpoint
CREATE INDEX `recurring_due_idx` ON `recurring` (`next_on`,`archived_at`);--> statement-breakpoint
CREATE INDEX `recurring_owner_idx` ON `recurring` (`user_id`,`archived_at`);