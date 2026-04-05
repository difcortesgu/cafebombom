CREATE TABLE `app_settings` (
  `key` text PRIMARY KEY NOT NULL,
  `value` text NOT NULL,
  `updated_at` integer DEFAULT (cast(strftime('%s', 'now') as int)) NOT NULL
);
--> statement-breakpoint
INSERT OR IGNORE INTO `app_settings` (`key`, `value`) VALUES ('to_go_surcharge', '0');
--> statement-breakpoint
INSERT OR IGNORE INTO `app_settings` (`key`, `value`) VALUES ('delivery_surcharge', '0');
