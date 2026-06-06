ALTER TABLE `discounts` ADD `deleted_at` integer;--> statement-breakpoint
ALTER TABLE `employees` ADD `is_active` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `employees` ADD `deleted_at` integer;--> statement-breakpoint
ALTER TABLE `ingredients` ADD `is_active` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `ingredients` ADD `deleted_at` integer;--> statement-breakpoint
ALTER TABLE `payment_methods` ADD `deleted_at` integer;--> statement-breakpoint
ALTER TABLE `products` ADD `deleted_at` integer;--> statement-breakpoint
ALTER TABLE `restaurant_tables` ADD `is_active` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `restaurant_tables` ADD `deleted_at` integer;--> statement-breakpoint
ALTER TABLE `suppliers` ADD `is_active` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `suppliers` ADD `deleted_at` integer;