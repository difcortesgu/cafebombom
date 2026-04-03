CREATE TABLE `ingredient_compositions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`parent_ingredient_id` integer NOT NULL,
	`child_ingredient_id` integer NOT NULL,
	`quantity_needed` real NOT NULL,
	`created_at` integer DEFAULT (cast(strftime('%s', 'now') as int)) NOT NULL,
	`updated_at` integer DEFAULT (cast(strftime('%s', 'now') as int)) NOT NULL,
	`synced_at` integer,
	FOREIGN KEY (`parent_ingredient_id`) REFERENCES `ingredients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`child_ingredient_id`) REFERENCES `ingredients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ingredient_compositions_unique` ON `ingredient_compositions` (`parent_ingredient_id`,`child_ingredient_id`);--> statement-breakpoint
CREATE INDEX `idx_ingredient_compositions_parent` ON `ingredient_compositions` (`parent_ingredient_id`);