CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` integer DEFAULT (cast(strftime('%s', 'now') as int)) NOT NULL,
	`updated_at` integer DEFAULT (cast(strftime('%s', 'now') as int)) NOT NULL,
	`synced_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_name_unique` ON `categories` (`name`);--> statement-breakpoint
CREATE TABLE `employees` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`salary_type` text NOT NULL,
	`rate` real NOT NULL,
	`synced_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `employees_name_unique` ON `employees` (`name`);--> statement-breakpoint
CREATE TABLE `expenses` (
	`id` text PRIMARY KEY NOT NULL,
	`date` integer NOT NULL,
	`category` text NOT NULL,
	`amount` real NOT NULL,
	`description` text,
	`supplier_id` text,
	`synced_at` integer,
	FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_expenses_date` ON `expenses` (`date`);--> statement-breakpoint
CREATE TABLE `ingredient_compositions` (
	`id` text PRIMARY KEY NOT NULL,
	`parent_ingredient_id` text NOT NULL,
	`child_ingredient_id` text NOT NULL,
	`quantity_needed` real NOT NULL,
	`created_at` integer DEFAULT (cast(strftime('%s', 'now') as int)) NOT NULL,
	`updated_at` integer DEFAULT (cast(strftime('%s', 'now') as int)) NOT NULL,
	`synced_at` integer,
	FOREIGN KEY (`parent_ingredient_id`) REFERENCES `ingredients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`child_ingredient_id`) REFERENCES `ingredients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ingredient_compositions_unique` ON `ingredient_compositions` (`parent_ingredient_id`,`child_ingredient_id`);--> statement-breakpoint
CREATE INDEX `idx_ingredient_compositions_parent` ON `ingredient_compositions` (`parent_ingredient_id`);--> statement-breakpoint
CREATE TABLE `ingredients` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`unit` text NOT NULL,
	`quantity` real DEFAULT 0 NOT NULL,
	`low_stock_threshold` real DEFAULT 10 NOT NULL,
	`supplier_id` text,
	`created_at` integer DEFAULT (cast(strftime('%s', 'now') as int)) NOT NULL,
	`updated_at` integer DEFAULT (cast(strftime('%s', 'now') as int)) NOT NULL,
	`synced_at` integer,
	FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ingredients_name_unique` ON `ingredients` (`name`);--> statement-breakpoint
CREATE INDEX `idx_ingredients_low_stock` ON `ingredients` (`quantity`,`low_stock_threshold`);--> statement-breakpoint
CREATE TABLE `payroll_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`employee_id` text NOT NULL,
	`period_start` integer NOT NULL,
	`period_end` integer NOT NULL,
	`amount` real NOT NULL,
	`synced_at` integer,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `product_ingredients` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`ingredient_id` text NOT NULL,
	`quantity_used` real NOT NULL,
	`created_at` integer DEFAULT (cast(strftime('%s', 'now') as int)) NOT NULL,
	`updated_at` integer DEFAULT (cast(strftime('%s', 'now') as int)) NOT NULL,
	`synced_at` integer,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`ingredient_id`) REFERENCES `ingredients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `product_ingredients_unique` ON `product_ingredients` (`product_id`,`ingredient_id`);--> statement-breakpoint
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`category_id` text,
	`price` real NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (cast(strftime('%s', 'now') as int)) NOT NULL,
	`updated_at` integer DEFAULT (cast(strftime('%s', 'now') as int)) NOT NULL,
	`synced_at` integer,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `products_name_unique` ON `products` (`name`);--> statement-breakpoint
CREATE TABLE `restock_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`ingredient_id` text NOT NULL,
	`quantity_added` real NOT NULL,
	`cost` real NOT NULL,
	`supplier_id` text,
	`date` integer NOT NULL,
	`synced_at` integer,
	FOREIGN KEY (`ingredient_id`) REFERENCES `ingredients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `sale_items` (
	`id` text PRIMARY KEY NOT NULL,
	`sale_id` text NOT NULL,
	`product_id` text NOT NULL,
	`quantity` integer NOT NULL,
	`unit_price` real NOT NULL,
	FOREIGN KEY (`sale_id`) REFERENCES `sales`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `sales` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer DEFAULT (cast(strftime('%s', 'now') as int)) NOT NULL,
	`staff_id` text NOT NULL,
	`total` real NOT NULL,
	`synced_at` integer,
	FOREIGN KEY (`staff_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_sales_created_at` ON `sales` (`created_at`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`logged_in_at` integer DEFAULT (cast(strftime('%s', 'now') as int)) NOT NULL,
	`logged_out_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `suppliers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`phone` text,
	`notes` text,
	`created_at` integer DEFAULT (cast(strftime('%s', 'now') as int)) NOT NULL,
	`updated_at` integer DEFAULT (cast(strftime('%s', 'now') as int)) NOT NULL,
	`synced_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `suppliers_name_unique` ON `suppliers` (`name`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`pin_hash` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (cast(strftime('%s', 'now') as int)) NOT NULL,
	`updated_at` integer DEFAULT (cast(strftime('%s', 'now') as int)) NOT NULL,
	`synced_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_name_unique` ON `users` (`name`);