CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`kind` text NOT NULL,
	`currency` text NOT NULL,
	`opening_balance_minor` integer DEFAULT 0 NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`archived_at` integer
);
--> statement-breakpoint
CREATE INDEX `accounts_user_idx` ON `accounts` (`user_id`,`sort_order`);--> statement-breakpoint
CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`kind` text NOT NULL,
	`glyph` text NOT NULL,
	`tint` text DEFAULT 'money' NOT NULL,
	`parent_id` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`archived_at` integer
);
--> statement-breakpoint
CREATE INDEX `categories_owner_idx` ON `categories` (`owner_id`,`sort_order`);--> statement-breakpoint
CREATE TABLE `fx_rates` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`currency` text NOT NULL,
	`rate_e8` integer NOT NULL,
	`effective_from` text NOT NULL,
	`note` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `fx_rates_unique_idx` ON `fx_rates` (`user_id`,`currency`,`effective_from`);--> statement-breakpoint
CREATE INDEX `fx_rates_lookup_idx` ON `fx_rates` (`user_id`,`currency`,`effective_from`);--> statement-breakpoint
CREATE TABLE `merchants` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`normalized_name` text NOT NULL,
	`display_name` text NOT NULL,
	`default_category_id` text,
	`seen_count` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `merchants_user_name_idx` ON `merchants` (`user_id`,`normalized_name`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` integer NOT NULL,
	`last_seen_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_token_idx` ON `sessions` (`token_hash`);--> statement-breakpoint
CREATE INDEX `sessions_user_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`wallet_id` text,
	`account_id` text NOT NULL,
	`counter_account_id` text,
	`category_id` text,
	`merchant_id` text,
	`type` text NOT NULL,
	`amount_minor` integer NOT NULL,
	`currency` text NOT NULL,
	`base_amount_minor` integer,
	`fx_rate_e8` integer,
	`fx_pending` integer DEFAULT false NOT NULL,
	`occurred_on` text NOT NULL,
	`note` text,
	`receipt_id` text,
	`recurring_rule_id` text,
	`bill_id` text,
	`client_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `transactions_client_idx` ON `transactions` (`user_id`,`client_id`);--> statement-breakpoint
CREATE INDEX `transactions_ledger_idx` ON `transactions` (`user_id`,`occurred_on`,`id`);--> statement-breakpoint
CREATE INDEX `transactions_account_idx` ON `transactions` (`user_id`,`account_id`);--> statement-breakpoint
CREATE INDEX `transactions_category_idx` ON `transactions` (`user_id`,`category_id`);--> statement-breakpoint
CREATE INDEX `transactions_pending_idx` ON `transactions` (`user_id`,`fx_pending`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`display_name` text NOT NULL,
	`role` text NOT NULL,
	`base_currency` text DEFAULT 'INR' NOT NULL,
	`password_hash` text,
	`status` text DEFAULT 'active' NOT NULL,
	`must_change_password` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_idx` ON `users` (`username`);