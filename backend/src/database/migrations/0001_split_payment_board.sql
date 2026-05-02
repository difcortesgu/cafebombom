ALTER TABLE `sale_items` ADD `quantity_paid` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
CREATE TABLE `sale_payments` (
	`id` text PRIMARY KEY NOT NULL,
	`sale_id` text NOT NULL,
	`payment_method` text NOT NULL,
	`subtotal` real DEFAULT 0 NOT NULL,
	`item_discount_total` real DEFAULT 0 NOT NULL,
	`global_discount_amount` real DEFAULT 0 NOT NULL,
	`surcharge_amount` real DEFAULT 0 NOT NULL,
	`total` real DEFAULT 0 NOT NULL,
	`paid_at` integer DEFAULT (cast(strftime('%s', 'now') as int)) NOT NULL,
	`created_by` text,
	`synced_at` integer,
	FOREIGN KEY (`sale_id`) REFERENCES `sales`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_sale_payments_sale_id` ON `sale_payments` (`sale_id`);
--> statement-breakpoint
CREATE INDEX `idx_sale_payments_paid_at` ON `sale_payments` (`paid_at`);
--> statement-breakpoint
CREATE TABLE `sale_payment_items` (
	`id` text PRIMARY KEY NOT NULL,
	`payment_id` text NOT NULL,
	`sale_item_id` text NOT NULL,
	`quantity_paid` integer NOT NULL,
	`unit_price_snapshot` real NOT NULL,
	`line_subtotal_snapshot` real NOT NULL,
	`discount_amount_snapshot` real DEFAULT 0 NOT NULL,
	`line_total_snapshot` real NOT NULL,
	FOREIGN KEY (`payment_id`) REFERENCES `sale_payments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`sale_item_id`) REFERENCES `sale_items`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_sale_payment_items_payment_id` ON `sale_payment_items` (`payment_id`);
--> statement-breakpoint
CREATE INDEX `idx_sale_payment_items_sale_item_id` ON `sale_payment_items` (`sale_item_id`);
