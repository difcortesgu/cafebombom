CREATE TABLE `receipt_preferences` (
	`id` text PRIMARY KEY NOT NULL,
	`business_name` text DEFAULT 'CafeBomBom' NOT NULL,
	`business_address` text DEFAULT '' NOT NULL,
	`business_phone` text DEFAULT '' NOT NULL,
	`business_logo_uri` text,
	`footer_message` text DEFAULT 'Gracias por tu compra' NOT NULL,
	`paper_width` integer DEFAULT 80 NOT NULL,
	`tax_rate` real DEFAULT 0.08 NOT NULL,
	`updated_at` integer DEFAULT (cast(strftime('%s', 'now') as int)) NOT NULL
);