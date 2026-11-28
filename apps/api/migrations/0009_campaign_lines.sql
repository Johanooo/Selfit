-- Kampanjer får flera rader. Befintliga kampanjer blir en rad var.
CREATE TABLE `campaigns_new` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`intro` text DEFAULT '' NOT NULL,
	`lines` text NOT NULL,
	`starts_on` text NOT NULL,
	`ends_on` text,
	`enabled` integer DEFAULT true NOT NULL,
	`banner` text NOT NULL,
	`updated_at` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
INSERT INTO `campaigns_new` (`id`, `slug`, `title`, `intro`, `lines`, `starts_on`, `ends_on`, `enabled`, `banner`, `updated_at`, `created_at`)
SELECT `id`, `slug`, `title`, `intro`,
	json_array(json_object('id', 'r1', 'valueType', `value_type`, 'value', `value`, 'appliesTo', json(`applies_to`))),
	`starts_on`, `ends_on`, `enabled`, `banner`, `updated_at`, `created_at`
FROM `campaigns`;
--> statement-breakpoint
DROP TABLE `campaigns`;
--> statement-breakpoint
ALTER TABLE `campaigns_new` RENAME TO `campaigns`;
--> statement-breakpoint
CREATE UNIQUE INDEX `campaigns_slug_unique` ON `campaigns` (`slug`);
