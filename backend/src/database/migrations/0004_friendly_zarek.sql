CREATE TABLE `combo_group_options` (
	`id` text PRIMARY KEY NOT NULL,
	`group_id` text NOT NULL,
	`product_id` text NOT NULL,
	`additional_price` real DEFAULT 0 NOT NULL,
	`is_default` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`group_id`) REFERENCES `combo_groups`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_combo_group_options_group_id` ON `combo_group_options` (`group_id`);--> statement-breakpoint
CREATE TABLE `combo_groups` (
	`id` text PRIMARY KEY NOT NULL,
	`combo_product_id` text NOT NULL,
	`name` text NOT NULL,
	`min_quantity` integer DEFAULT 1 NOT NULL,
	`max_quantity` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`combo_product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_combo_groups_combo_product_id` ON `combo_groups` (`combo_product_id`);--> statement-breakpoint
ALTER TABLE `products` ADD `is_combo` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `sale_items` ADD `parent_sale_item_id` text REFERENCES sale_items(id);