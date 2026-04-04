CREATE TABLE `restaurant_tables` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` integer DEFAULT (cast(strftime('%s', 'now') as int)) NOT NULL,
	`updated_at` integer DEFAULT (cast(strftime('%s', 'now') as int)) NOT NULL,
	`synced_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `restaurant_tables_name_unique` ON `restaurant_tables` (`name`);--> statement-breakpoint
CREATE INDEX `idx_restaurant_tables_name` ON `restaurant_tables` (`name`);--> statement-breakpoint
ALTER TABLE `sales` ADD `table_id` text REFERENCES restaurant_tables(id);--> statement-breakpoint
CREATE INDEX `idx_sales_table_id` ON `sales` (`table_id`);