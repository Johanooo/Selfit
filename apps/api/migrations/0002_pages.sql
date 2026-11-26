CREATE TABLE `pages` (
	`slug` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`summary` text NOT NULL,
	`sections` text NOT NULL,
	`faq` text,
	`updated_at` text NOT NULL
);
