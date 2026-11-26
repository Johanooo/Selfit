CREATE TABLE `media` (
	`id` text PRIMARY KEY NOT NULL,
	`src` text NOT NULL,
	`name` text NOT NULL,
	`alt` text DEFAULT '' NOT NULL,
	`width` integer,
	`height` integer,
	`bytes` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `media_src_unique` ON `media` (`src`);