CREATE TABLE `surcharges` (
  `name` text PRIMARY KEY NOT NULL,
  `value` real DEFAULT 0 NOT NULL,
  `updated_at` integer DEFAULT (cast(strftime('%s', 'now') as int)) NOT NULL
);
--> statement-breakpoint
INSERT OR IGNORE INTO `surcharges` (`name`, `value`)
VALUES ('to-go', COALESCE((SELECT CAST(`value` AS real) FROM `app_settings` WHERE `key` = 'to_go_surcharge' LIMIT 1), 0));
--> statement-breakpoint
INSERT OR IGNORE INTO `surcharges` (`name`, `value`)
VALUES ('delivery', COALESCE((SELECT CAST(`value` AS real) FROM `app_settings` WHERE `key` = 'delivery_surcharge' LIMIT 1), 0));
