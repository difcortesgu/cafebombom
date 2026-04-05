ALTER TABLE `restaurant_tables` ADD `table_type` text DEFAULT 'dine-in' NOT NULL;
--> statement-breakpoint
UPDATE `restaurant_tables`
SET `table_type` = 'delivery'
WHERE `is_delivery` = 1;
--> statement-breakpoint
UPDATE `restaurant_tables`
SET `table_type` = 'to-go'
WHERE `is_to_go` = 1 AND `is_delivery` = 0;