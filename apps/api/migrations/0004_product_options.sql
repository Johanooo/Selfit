ALTER TABLE `product_families` ADD `option_names` text;--> statement-breakpoint
ALTER TABLE `product_families` ADD `updated_at` text;--> statement-breakpoint
ALTER TABLE `variants` ADD `options` text;--> statement-breakpoint
ALTER TABLE `variants` ADD `sort_order` integer DEFAULT 0 NOT NULL;