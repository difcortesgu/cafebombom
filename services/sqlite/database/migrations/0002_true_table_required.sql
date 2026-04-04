INSERT INTO `restaurant_tables` (`id`, `name`, `created_at`, `updated_at`)
SELECT lower(hex(randomblob(16))), 'Table 1', cast(strftime('%s', 'now') as int), cast(strftime('%s', 'now') as int)
WHERE NOT EXISTS (SELECT 1 FROM `restaurant_tables`);
--> statement-breakpoint
UPDATE `sales`
SET `table_id` = (SELECT `id` FROM `restaurant_tables` ORDER BY `created_at`, `id` LIMIT 1)
WHERE `table_id` IS NULL;
--> statement-breakpoint
PRAGMA foreign_keys=OFF;
--> statement-breakpoint
CREATE TABLE `__new_sales` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer DEFAULT (cast(strftime('%s', 'now') as int)) NOT NULL,
	`staff_id` text NOT NULL,
	`table_id` text NOT NULL,
	`total` real NOT NULL,
	`synced_at` integer,
	FOREIGN KEY (`staff_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`table_id`) REFERENCES `restaurant_tables`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_sales` (`id`, `created_at`, `staff_id`, `table_id`, `total`, `synced_at`)
SELECT `id`, `created_at`, `staff_id`, `table_id`, `total`, `synced_at`
FROM `sales`;
--> statement-breakpoint
DROP TABLE `sales`;
--> statement-breakpoint
ALTER TABLE `__new_sales` RENAME TO `sales`;
--> statement-breakpoint
CREATE INDEX `idx_sales_created_at` ON `sales` (`created_at`);
--> statement-breakpoint
CREATE INDEX `idx_sales_table_id` ON `sales` (`table_id`);
--> statement-breakpoint
PRAGMA foreign_keys=ON;
