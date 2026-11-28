CREATE TABLE `trash` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`object_id` text NOT NULL,
	`label` text NOT NULL,
	`detail` text DEFAULT '' NOT NULL,
	`payload` text NOT NULL,
	`deleted_at` text NOT NULL,
	`deleted_by` text DEFAULT 'Admin' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `trash_deleted_idx` ON `trash` (`deleted_at`);
