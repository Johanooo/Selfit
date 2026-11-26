CREATE TABLE `discounts` (
	`id` text PRIMARY KEY NOT NULL,
	`method` text NOT NULL,
	`code` text,
	`title` text NOT NULL,
	`kind` text NOT NULL,
	`value_type` text DEFAULT 'percent' NOT NULL,
	`value` integer DEFAULT 0 NOT NULL,
	`applies_to` text NOT NULL,
	`eligibility` text NOT NULL,
	`min_type` text DEFAULT 'none' NOT NULL,
	`min_value` integer DEFAULT 0 NOT NULL,
	`usage_limit` integer,
	`once_per_customer` integer DEFAULT false NOT NULL,
	`starts_at` text NOT NULL,
	`ends_at` text,
	`enabled` integer DEFAULT true NOT NULL,
	`updated_at` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `discounts_code_unique` ON `discounts` (`code`);
