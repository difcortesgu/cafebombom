ALTER TABLE `discounts` ADD `days_of_week` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `discounts` ADD `days_of_month` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `discounts` ADD `hour_start` integer;--> statement-breakpoint
ALTER TABLE `discounts` ADD `hour_end` integer;