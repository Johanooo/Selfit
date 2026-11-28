CREATE TABLE `campaigns` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`intro` text DEFAULT '' NOT NULL,
	`value_type` text DEFAULT 'percent' NOT NULL,
	`value` integer DEFAULT 0 NOT NULL,
	`applies_to` text NOT NULL,
	`starts_on` text NOT NULL,
	`ends_on` text,
	`enabled` integer DEFAULT true NOT NULL,
	`banner` text NOT NULL,
	`updated_at` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `campaigns_slug_unique` ON `campaigns` (`slug`);
--> statement-breakpoint
ALTER TABLE `discounts` ADD `combine_with_campaigns` integer DEFAULT false NOT NULL;
