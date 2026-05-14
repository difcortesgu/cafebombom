CREATE TABLE `cash_register_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`opening_amount` real NOT NULL,
	`closing_amount` real,
	`opening_notes` text,
	`closing_notes` text,
	`opened_at` integer NOT NULL,
	`closed_at` integer,
	`opened_by` text NOT NULL,
	`closed_by` text,
	FOREIGN KEY (`opened_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`closed_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_cash_register_opened_at` ON `cash_register_sessions` (`opened_at`);--> statement-breakpoint
CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` integer DEFAULT (cast(strftime('%s', 'now') as int)) NOT NULL,
	`updated_at` integer DEFAULT (cast(strftime('%s', 'now') as int)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_name_unique` ON `categories` (`name`);--> statement-breakpoint
CREATE TABLE `discounts` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`scope` text DEFAULT 'product' NOT NULL,
	`product_id` text,
	`type` text NOT NULL,
	`value` real NOT NULL,
	`starts_at` integer NOT NULL,
	`ends_at` integer,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (cast(strftime('%s', 'now') as int)) NOT NULL,
	`updated_at` integer DEFAULT (cast(strftime('%s', 'now') as int)) NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `discounts_name_unique` ON `discounts` (`name`);--> statement-breakpoint
CREATE INDEX `idx_discounts_scope` ON `discounts` (`scope`);--> statement-breakpoint
CREATE INDEX `idx_discounts_active` ON `discounts` (`is_active`);--> statement-breakpoint
CREATE TABLE `employees` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`salary_type` text NOT NULL,
	`rate` real NOT NULL
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
	`payment_method_id` text NOT NULL,
	FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`payment_method_id`) REFERENCES `payment_methods`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_expenses_date` ON `expenses` (`date`);--> statement-breakpoint
CREATE TABLE `ingredient_units` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` integer DEFAULT (cast(strftime('%s', 'now') as int)) NOT NULL,
	`updated_at` integer DEFAULT (cast(strftime('%s', 'now') as int)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ingredient_units_name_unique` ON `ingredient_units` (`name`);--> statement-breakpoint
CREATE INDEX `idx_ingredient_units_name` ON `ingredient_units` (`name`);--> statement-breakpoint
CREATE TABLE `ingredients` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`unit` text NOT NULL,
	`quantity` real DEFAULT 0 NOT NULL,
	`low_stock_threshold` real DEFAULT 10 NOT NULL,
	`supplier_id` text,
	`created_at` integer DEFAULT (cast(strftime('%s', 'now') as int)) NOT NULL,
	`updated_at` integer DEFAULT (cast(strftime('%s', 'now') as int)) NOT NULL,
	FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ingredients_name_unique` ON `ingredients` (`name`);--> statement-breakpoint
CREATE INDEX `idx_ingredients_low_stock` ON `ingredients` (`quantity`,`low_stock_threshold`);--> statement-breakpoint
CREATE TABLE `payment_methods` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (cast(strftime('%s', 'now') as int)) NOT NULL,
	`updated_at` integer DEFAULT (cast(strftime('%s', 'now') as int)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payment_methods_name_unique` ON `payment_methods` (`name`);--> statement-breakpoint
CREATE TABLE `payroll_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`employee_id` text NOT NULL,
	`period_start` integer NOT NULL,
	`period_end` integer NOT NULL,
	`amount` real NOT NULL,
	`payment_method_id` text NOT NULL,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`payment_method_id`) REFERENCES `payment_methods`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `product_additional_ingredients` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`ingredient_id` text NOT NULL,
	`quantity_used` real NOT NULL,
	`additional_price` real DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (cast(strftime('%s', 'now') as int)) NOT NULL,
	`updated_at` integer DEFAULT (cast(strftime('%s', 'now') as int)) NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`ingredient_id`) REFERENCES `ingredients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `product_additional_ingredients_unique` ON `product_additional_ingredients` (`product_id`,`ingredient_id`);--> statement-breakpoint
CREATE TABLE `product_ingredients` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`ingredient_id` text NOT NULL,
	`quantity_used` real NOT NULL,
	`created_at` integer DEFAULT (cast(strftime('%s', 'now') as int)) NOT NULL,
	`updated_at` integer DEFAULT (cast(strftime('%s', 'now') as int)) NOT NULL,
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
	`image_uri` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (cast(strftime('%s', 'now') as int)) NOT NULL,
	`updated_at` integer DEFAULT (cast(strftime('%s', 'now') as int)) NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `products_name_unique` ON `products` (`name`);--> statement-breakpoint
CREATE TABLE `receipt_preferences` (
	`id` text PRIMARY KEY NOT NULL,
	`business_name` text DEFAULT 'CafeBomBom' NOT NULL,
	`business_address` text DEFAULT '' NOT NULL,
	`business_phone` text DEFAULT '' NOT NULL,
	`business_nit` text DEFAULT '' NOT NULL,
	`business_logo_uri` text,
	`footer_message` text DEFAULT 'Gracias por tu compra' NOT NULL,
	`paper_width` integer DEFAULT 80 NOT NULL,
	`tax_rate` real DEFAULT 0.08 NOT NULL,
	`updated_at` integer DEFAULT (cast(strftime('%s', 'now') as int)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `restaurant_tables` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`table_type` text DEFAULT 'dine-in' NOT NULL,
	`created_at` integer DEFAULT (cast(strftime('%s', 'now') as int)) NOT NULL,
	`updated_at` integer DEFAULT (cast(strftime('%s', 'now') as int)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `restaurant_tables_name_unique` ON `restaurant_tables` (`name`);--> statement-breakpoint
CREATE INDEX `idx_restaurant_tables_name` ON `restaurant_tables` (`name`);--> statement-breakpoint
CREATE TABLE `restock_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`ingredient_id` text NOT NULL,
	`quantity_added` real NOT NULL,
	`cost` real NOT NULL,
	`supplier_id` text,
	`payment_method_id` text,
	`date` integer NOT NULL,
	FOREIGN KEY (`ingredient_id`) REFERENCES `ingredients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`payment_method_id`) REFERENCES `payment_methods`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `sale_items` (
	`id` text PRIMARY KEY NOT NULL,
	`sale_id` text NOT NULL,
	`product_id` text NOT NULL,
	`quantity` integer NOT NULL,
	`quantity_paid` integer DEFAULT 0 NOT NULL,
	`observation` text,
	`removed_ingredient_ids` text DEFAULT '[]' NOT NULL,
	`selected_additional_ingredients` text DEFAULT '[]' NOT NULL,
	`unit_price` real NOT NULL,
	`line_subtotal` real DEFAULT 0 NOT NULL,
	`discount_name` text,
	`discount_type` text,
	`discount_value` real,
	`discount_amount` real DEFAULT 0 NOT NULL,
	FOREIGN KEY (`sale_id`) REFERENCES `sales`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
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
CREATE INDEX `idx_sale_payment_items_payment_id` ON `sale_payment_items` (`payment_id`);--> statement-breakpoint
CREATE INDEX `idx_sale_payment_items_sale_item_id` ON `sale_payment_items` (`sale_item_id`);--> statement-breakpoint
CREATE TABLE `sale_payments` (
	`id` text PRIMARY KEY NOT NULL,
	`sale_id` text NOT NULL,
	`payment_method_id` text NOT NULL,
	`subtotal` real DEFAULT 0 NOT NULL,
	`item_discount_total` real DEFAULT 0 NOT NULL,
	`global_discount_amount` real DEFAULT 0 NOT NULL,
	`surcharge_amount` real DEFAULT 0 NOT NULL,
	`total` real DEFAULT 0 NOT NULL,
	`paid_at` integer DEFAULT (cast(strftime('%s', 'now') as int)) NOT NULL,
	`created_by` text,
	FOREIGN KEY (`sale_id`) REFERENCES `sales`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`payment_method_id`) REFERENCES `payment_methods`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_sale_payments_sale_id` ON `sale_payments` (`sale_id`);--> statement-breakpoint
CREATE INDEX `idx_sale_payments_paid_at` ON `sale_payments` (`paid_at`);--> statement-breakpoint
CREATE TABLE `sales` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer DEFAULT (cast(strftime('%s', 'now') as int)) NOT NULL,
	`staff_id` text NOT NULL,
	`table_id` text NOT NULL,
	`payment_method_id` text,
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
	FOREIGN KEY (`staff_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`table_id`) REFERENCES `restaurant_tables`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`payment_method_id`) REFERENCES `payment_methods`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`discount_applied_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_sales_created_at` ON `sales` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_sales_table_id` ON `sales` (`table_id`);--> statement-breakpoint
CREATE INDEX `idx_sales_status` ON `sales` (`status`);--> statement-breakpoint
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
	`updated_at` integer DEFAULT (cast(strftime('%s', 'now') as int)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `suppliers_name_unique` ON `suppliers` (`name`);--> statement-breakpoint
CREATE TABLE `surcharges` (
	`name` text PRIMARY KEY NOT NULL,
	`value` real DEFAULT 0 NOT NULL,
	`updated_at` integer DEFAULT (cast(strftime('%s', 'now') as int)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`pin_hash` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (cast(strftime('%s', 'now') as int)) NOT NULL,
	`updated_at` integer DEFAULT (cast(strftime('%s', 'now') as int)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_name_unique` ON `users` (`name`);