CREATE TABLE `product_types` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`vat_class_id` text NOT NULL,
	`fields` text NOT NULL,
	`built_in` integer DEFAULT false NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL
);--> statement-breakpoint
ALTER TABLE `categories` ADD `product_type` text;--> statement-breakpoint
ALTER TABLE `categories` ADD `hidden` integer DEFAULT false NOT NULL;
