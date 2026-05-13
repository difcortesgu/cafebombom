ALTER TABLE `receipt_preferences` ADD `business_nit` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `categories` DROP COLUMN `synced_at`;--> statement-breakpoint
ALTER TABLE `discounts` DROP COLUMN `synced_at`;--> statement-breakpoint
ALTER TABLE `employees` DROP COLUMN `synced_at`;--> statement-breakpoint
ALTER TABLE `expenses` DROP COLUMN `synced_at`;--> statement-breakpoint
ALTER TABLE `ingredients` DROP COLUMN `synced_at`;--> statement-breakpoint
ALTER TABLE `payroll_entries` DROP COLUMN `synced_at`;--> statement-breakpoint
ALTER TABLE `product_ingredients` DROP COLUMN `synced_at`;--> statement-breakpoint
ALTER TABLE `products` DROP COLUMN `synced_at`;--> statement-breakpoint
ALTER TABLE `restaurant_tables` DROP COLUMN `synced_at`;--> statement-breakpoint
ALTER TABLE `restock_logs` DROP COLUMN `synced_at`;--> statement-breakpoint
ALTER TABLE `sale_payments` DROP COLUMN `synced_at`;--> statement-breakpoint
ALTER TABLE `sales` DROP COLUMN `synced_at`;--> statement-breakpoint
ALTER TABLE `suppliers` DROP COLUMN `synced_at`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `synced_at`;