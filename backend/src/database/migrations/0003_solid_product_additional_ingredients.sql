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
CREATE UNIQUE INDEX `product_additional_ingredients_unique` ON `product_additional_ingredients` (`product_id`,`ingredient_id`);
--> statement-breakpoint
ALTER TABLE `sale_items` ADD `selected_additional_ingredients` text DEFAULT '[]' NOT NULL;
