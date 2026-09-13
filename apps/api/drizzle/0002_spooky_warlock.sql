ALTER TABLE `sales` ADD `offline_receipt_number` varchar(50);--> statement-breakpoint
ALTER TABLE `collection_receipts` ADD `offline_receipt_number` varchar(50);--> statement-breakpoint
ALTER TABLE `pre_order_items` ADD `discount_input` varchar(50);--> statement-breakpoint
ALTER TABLE `pre_orders` ADD `reference_number` varchar(50);--> statement-breakpoint
ALTER TABLE `pre_orders` ADD `offline_receipt_number` varchar(50);--> statement-breakpoint
ALTER TABLE `pre_orders` ADD `trip_id` binary(16);--> statement-breakpoint
ALTER TABLE `pre_orders` ADD CONSTRAINT `pre_orders_reference_number_unique` UNIQUE(`reference_number`);