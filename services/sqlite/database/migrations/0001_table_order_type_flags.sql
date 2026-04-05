ALTER TABLE `restaurant_tables` ADD `is_to_go` integer DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE `restaurant_tables` ADD `is_delivery` integer DEFAULT false NOT NULL;
--> statement-breakpoint
UPDATE `restaurant_tables`
SET `is_to_go` = 1
WHERE lower(replace(replace(replace(`name`, ' ', ''), '-', ''), '_', '')) LIKE '%togo%'
   OR lower(replace(replace(replace(`name`, ' ', ''), '-', ''), '_', '')) LIKE '%parallevar%'
   OR lower(replace(replace(replace(`name`, ' ', ''), '-', ''), '_', '')) LIKE '%takeout%'
   OR lower(replace(replace(replace(`name`, ' ', ''), '-', ''), '_', '')) LIKE '%takeaway%';
--> statement-breakpoint
UPDATE `restaurant_tables`
SET `is_delivery` = 1
WHERE lower(replace(replace(replace(`name`, ' ', ''), '-', ''), '_', '')) LIKE '%delivery%'
   OR lower(replace(replace(replace(`name`, ' ', ''), '-', ''), '_', '')) LIKE '%domicilio%';
