CREATE TABLE `category_prefs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`category_id` text NOT NULL,
	`hidden_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `category_prefs_unique_idx` ON `category_prefs` (`user_id`,`category_id`);