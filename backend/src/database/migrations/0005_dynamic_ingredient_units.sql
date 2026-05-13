CREATE TABLE IF NOT EXISTS `ingredient_units` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL DEFAULT (cast(strftime('%s', 'now') as int)),
	`updated_at` integer NOT NULL DEFAULT (cast(strftime('%s', 'now') as int))
);
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS `ingredient_units_name_unique` ON `ingredient_units` (`name`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_ingredient_units_name` ON `ingredient_units` (`name`);
--> statement-breakpoint

INSERT OR IGNORE INTO `ingredient_units` (`id`, `name`, `created_at`, `updated_at`)
SELECT
	lower(hex(randomblob(16))),
	lower(trim(`unit`)),
	cast(strftime('%s', 'now') as int),
	cast(strftime('%s', 'now') as int)
FROM `ingredients`
WHERE trim(coalesce(`unit`, '')) <> ''
GROUP BY lower(trim(`unit`));