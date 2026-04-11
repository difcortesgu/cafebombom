CREATE TABLE `receipt_preferences` (
	`id` text PRIMARY KEY NOT NULL,
	`business_name` text DEFAULT 'CafeBomBom' NOT NULL,
	`business_address` text DEFAULT '' NOT NULL,
	`business_phone` text DEFAULT '' NOT NULL,
	`business_logo_uri` text,
	`footer_message` text DEFAULT 'Gracias por tu compra' NOT NULL,
	`paper_width` integer DEFAULT 80 NOT NULL,
	`tax_rate` real DEFAULT 0.08 NOT NULL,
	`updated_at` integer DEFAULT (cast(strftime('%s', 'now') as int)) NOT NULL
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_sales` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer DEFAULT (cast(strftime('%s', 'now') as int)) NOT NULL,
	`staff_id` text NOT NULL,
	`table_id` text NOT NULL,
	`payment_method` text,
	`subtotal` real DEFAULT 0 NOT NULL,
	`item_discount_total` real DEFAULT 0 NOT NULL,
	`order_discount_name` text,
	`order_discount_type` text,
	`order_discount_value` real,
	`order_discount_amount` real DEFAULT 0 NOT NULL,
	`discount_note` text,
	`discount_applied_by` text,
	`total` real NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`ready_at` integer,
	`paid_at` integer,
	`cancelled_at` integer,
	`synced_at` integer,
	FOREIGN KEY (`staff_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`table_id`) REFERENCES `restaurant_tables`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`discount_applied_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_sales`("id", "created_at", "staff_id", "table_id", "payment_method", "subtotal", "item_discount_total", "order_discount_name", "order_discount_type", "order_discount_value", "order_discount_amount", "discount_note", "discount_applied_by", "total", "status", "ready_at", "paid_at", "cancelled_at", "synced_at") SELECT "id", "created_at", "staff_id", "table_id", "payment_method", "subtotal", "item_discount_total", "order_discount_name", "order_discount_type", "order_discount_value", "order_discount_amount", "discount_note", "discount_applied_by", "total", "status", "ready_at", "paid_at", "cancelled_at", "synced_at" FROM `sales`;--> statement-breakpoint
DROP TABLE `sales`;--> statement-breakpoint
ALTER TABLE `__new_sales` RENAME TO `sales`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `idx_sales_created_at` ON `sales` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_sales_table_id` ON `sales` (`table_id`);--> statement-breakpoint
CREATE INDEX `idx_sales_status` ON `sales` (`status`);--> statement-breakpoint
ALTER TABLE `products` ADD `image_uri` text;