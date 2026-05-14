CREATE TABLE `cash_register_adjustments` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`amount` real NOT NULL,
	`reason` text NOT NULL,
	`adjusted_by` text NOT NULL,
	`created_at` integer DEFAULT (cast(strftime('%s', 'now') as int)) NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `cash_register_sessions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`adjusted_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_cash_register_adjustments_session_id` ON `cash_register_adjustments` (`session_id`);