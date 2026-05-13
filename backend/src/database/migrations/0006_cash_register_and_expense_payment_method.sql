ALTER TABLE `expenses` ADD COLUMN `payment_method` text NOT NULL DEFAULT 'cash';
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `cash_register_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`opening_amount` real NOT NULL,
	`closing_amount` real,
	`opening_notes` text,
	`closing_notes` text,
	`opened_at` integer NOT NULL,
	`closed_at` integer,
	`opened_by` text NOT NULL REFERENCES `users`(`id`),
	`closed_by` text REFERENCES `users`(`id`)
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS `idx_cash_register_opened_at` ON `cash_register_sessions` (`opened_at`);
