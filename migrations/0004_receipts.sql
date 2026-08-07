CREATE TABLE `receipts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`transaction_id` text,
	`object_key` text NOT NULL,
	`content_type` text NOT NULL,
	`byte_size` integer NOT NULL,
	`read_amount_text` text,
	`read_name` text,
	`read_on` text,
	`read_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `receipts_owner_idx` ON `receipts` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `receipts_transaction_idx` ON `receipts` (`transaction_id`);