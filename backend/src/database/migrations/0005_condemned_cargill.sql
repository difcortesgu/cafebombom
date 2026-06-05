CREATE TABLE `backup_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`destination_path` text,
	`schedule_enabled` integer DEFAULT false NOT NULL,
	`frequency` text DEFAULT 'daily' NOT NULL,
	`retention` integer DEFAULT 7 NOT NULL,
	`last_backup_at` text,
	`last_backup_status` text,
	`updated_at` integer DEFAULT (cast(strftime('%s', 'now') as int)) NOT NULL
);
