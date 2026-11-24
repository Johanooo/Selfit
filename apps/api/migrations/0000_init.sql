CREATE TABLE `batches` (
	`id` text PRIMARY KEY NOT NULL,
	`variant_id` text NOT NULL,
	`warehouse_id` text NOT NULL,
	`code` text NOT NULL,
	`best_before` text,
	`quantity` integer NOT NULL,
	`status` text DEFAULT 'sellable' NOT NULL,
	`warehouse_ref` text,
	FOREIGN KEY (`variant_id`) REFERENCES `variants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `brands` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`intro` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `brands_slug_unique` ON `brands` (`slug`);--> statement-breakpoint
CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`parent_id` text,
	`short` text,
	`intro` text,
	`tone` text,
	`image` text,
	`image_alt` text,
	`sort_order` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_slug_unique` ON `categories` (`slug`);--> statement-breakpoint
CREATE TABLE `collections` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`intro` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `collections_slug_unique` ON `collections` (`slug`);--> statement-breakpoint
CREATE TABLE `customers` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text,
	`phone` text,
	`newsletter_consent_at` text,
	`notes` text,
	`tags` text,
	`anonymized_at` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `customers_email_unique` ON `customers` (`email`);--> statement-breakpoint
CREATE TABLE `deposit_classes` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`vat_class_id` text NOT NULL,
	FOREIGN KEY (`vat_class_id`) REFERENCES `vat_classes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `deposit_rates` (
	`id` text PRIMARY KEY NOT NULL,
	`deposit_class_id` text NOT NULL,
	`amount_ore` integer NOT NULL,
	`valid_from` text NOT NULL,
	`valid_to` text,
	FOREIGN KEY (`deposit_class_id`) REFERENCES `deposit_classes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `flavours` (
	`slug` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`note` text
);
--> statement-breakpoint
CREATE TABLE `order_events` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`type` text NOT NULL,
	`data` text,
	`actor` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `order_lines` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`variant_id` text NOT NULL,
	`sku` text NOT NULL,
	`name` text NOT NULL,
	`quantity` integer NOT NULL,
	`unit_price_ore` integer NOT NULL,
	`discount_ore` integer DEFAULT 0 NOT NULL,
	`deposit_ore` integer DEFAULT 0 NOT NULL,
	`vat_rate_bp` integer NOT NULL,
	`vat_ore` integer NOT NULL,
	`line_total_ore` integer NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`variant_id`) REFERENCES `variants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`number` text NOT NULL,
	`customer_id` text,
	`email` text NOT NULL,
	`phone` text,
	`shipping_address` text,
	`source` text DEFAULT 'web' NOT NULL,
	`payment_status` text DEFAULT 'pending' NOT NULL,
	`fulfillment_status` text DEFAULT 'unfulfilled' NOT NULL,
	`hold_reason` text,
	`shipping_method_id` text,
	`warehouse_id` text,
	`warehouse_order_ref` text,
	`payment_provider_ref` text,
	`discount_code` text,
	`subtotal_ore` integer NOT NULL,
	`discount_ore` integer DEFAULT 0 NOT NULL,
	`deposit_ore` integer DEFAULT 0 NOT NULL,
	`shipping_ore` integer DEFAULT 0 NOT NULL,
	`vat_ore` integer NOT NULL,
	`total_ore` integer NOT NULL,
	`original_order_id` text,
	`manual_reason` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`shipping_method_id`) REFERENCES `shipping_methods`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `orders_number_unique` ON `orders` (`number`);--> statement-breakpoint
CREATE TABLE `prices` (
	`id` text PRIMARY KEY NOT NULL,
	`variant_id` text NOT NULL,
	`amount_ore` integer NOT NULL,
	`currency` text DEFAULT 'SEK' NOT NULL,
	`valid_from` text NOT NULL,
	`valid_to` text,
	`created_by` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`variant_id`) REFERENCES `variants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `prices_variant_idx` ON `prices` (`variant_id`,`valid_from`);--> statement-breakpoint
CREATE TABLE `product_categories` (
	`family_id` text NOT NULL,
	`category_id` text NOT NULL,
	`is_primary` integer DEFAULT false NOT NULL,
	PRIMARY KEY(`family_id`, `category_id`),
	FOREIGN KEY (`family_id`) REFERENCES `product_families`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `product_collections` (
	`family_id` text NOT NULL,
	`collection_id` text NOT NULL,
	PRIMARY KEY(`family_id`, `collection_id`),
	FOREIGN KEY (`family_id`) REFERENCES `product_families`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`collection_id`) REFERENCES `collections`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `product_families` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`brand_id` text NOT NULL,
	`product_type` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`tagline` text,
	`description` text,
	`usage` text,
	`ingredients` text,
	`allergens` text,
	`nutrition` text,
	`facts` text,
	`display` text,
	`seo_title` text,
	`seo_description` text,
	`popularity` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`brand_id`) REFERENCES `brands`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `product_families_slug_unique` ON `product_families` (`slug`);--> statement-breakpoint
CREATE TABLE `product_relations` (
	`family_id` text NOT NULL,
	`related_family_id` text NOT NULL,
	`kind` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`family_id`, `related_family_id`, `kind`),
	FOREIGN KEY (`family_id`) REFERENCES `product_families`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`related_family_id`) REFERENCES `product_families`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `purchase_costs` (
	`id` text PRIMARY KEY NOT NULL,
	`variant_id` text NOT NULL,
	`amount_ore` integer NOT NULL,
	`valid_from` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`variant_id`) REFERENCES `variants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `shipping_methods` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`carrier` text,
	`price_ore` integer NOT NULL,
	`price_over_threshold_ore` integer DEFAULT 0 NOT NULL,
	`free_threshold_ore` integer,
	`vat_class_id` text NOT NULL,
	`country` text DEFAULT 'SE' NOT NULL,
	`estimated_days` text,
	`active` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`vat_class_id`) REFERENCES `vat_classes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `stock_ledger` (
	`id` text PRIMARY KEY NOT NULL,
	`variant_id` text NOT NULL,
	`warehouse_id` text NOT NULL,
	`event_type` text NOT NULL,
	`change` integer NOT NULL,
	`balance_after` integer NOT NULL,
	`reason` text,
	`reference_type` text,
	`reference_id` text,
	`actor` text NOT NULL,
	`comment` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`variant_id`) REFERENCES `variants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `stock_ledger_variant_idx` ON `stock_ledger` (`variant_id`,`warehouse_id`);--> statement-breakpoint
CREATE TABLE `stock_levels` (
	`variant_id` text NOT NULL,
	`warehouse_id` text NOT NULL,
	`on_hand` integer DEFAULT 0 NOT NULL,
	`reserved` integer DEFAULT 0 NOT NULL,
	`blocked` integer DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`variant_id`, `warehouse_id`),
	FOREIGN KEY (`variant_id`) REFERENCES `variants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `variants` (
	`id` text PRIMARY KEY NOT NULL,
	`family_id` text NOT NULL,
	`sku` text NOT NULL,
	`gtin` text,
	`flavour_slug` text,
	`pack_size` integer,
	`size_label` text,
	`image` text,
	`net_amount_milli` integer,
	`net_unit` text,
	`gross_weight_g` integer,
	`length_mm` integer,
	`width_mm` integer,
	`height_mm` integer,
	`status` text DEFAULT 'active' NOT NULL,
	`vat_class_id` text NOT NULL,
	`deposit_class_id` text,
	`deposit_units` integer DEFAULT 0 NOT NULL,
	`track_batches` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`family_id`) REFERENCES `product_families`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`flavour_slug`) REFERENCES `flavours`(`slug`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`vat_class_id`) REFERENCES `vat_classes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`deposit_class_id`) REFERENCES `deposit_classes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `variants_sku_unique` ON `variants` (`sku`);--> statement-breakpoint
CREATE INDEX `variants_family_idx` ON `variants` (`family_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `variants_gtin_idx` ON `variants` (`gtin`);--> statement-breakpoint
CREATE TABLE `vat_classes` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `vat_rates` (
	`id` text PRIMARY KEY NOT NULL,
	`vat_class_id` text NOT NULL,
	`rate_bp` integer NOT NULL,
	`valid_from` text NOT NULL,
	`valid_to` text,
	FOREIGN KEY (`vat_class_id`) REFERENCES `vat_classes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `warehouse_item_refs` (
	`warehouse_id` text NOT NULL,
	`variant_id` text NOT NULL,
	`external_ref` text NOT NULL,
	PRIMARY KEY(`warehouse_id`, `variant_id`),
	FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`variant_id`) REFERENCES `variants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `warehouses` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`kind` text NOT NULL,
	`adapter` text NOT NULL,
	`address` text,
	`status` text DEFAULT 'active' NOT NULL,
	`is_default` integer DEFAULT false NOT NULL,
	`settings` text
);
