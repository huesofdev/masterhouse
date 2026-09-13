CREATE TABLE `supplier_branch_balances` (
	`id` binary(16) NOT NULL,
	`supplier_id` binary(16) NOT NULL,
	`branch_id` binary(16) NOT NULL,
	`opening_balance` decimal(14,2) NOT NULL DEFAULT '0.00',
	`balance_due` decimal(14,2) NOT NULL DEFAULT '0.00',
	`total_paid` decimal(14,2) NOT NULL DEFAULT '0.00',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `supplier_branch_balances_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `supplier_ledger` (
	`id` binary(16) NOT NULL,
	`supplier_id` binary(16) NOT NULL,
	`branch_id` binary(16) NOT NULL,
	`transaction_type` enum('OPENING_BALANCE','INTAKE_BILL','PAYMENT','ADJUSTMENT') NOT NULL,
	`reference_id` binary(16),
	`amount` decimal(14,2) NOT NULL,
	`balance_after` decimal(14,2) NOT NULL,
	`notes` text,
	`created_by` binary(16) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `supplier_ledger_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stock_transfer_items` (
	`id` binary(16) NOT NULL,
	`transfer_id` binary(16) NOT NULL,
	`product_id` binary(16) NOT NULL,
	`quantity` int NOT NULL,
	CONSTRAINT `stock_transfer_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stock_transfer_serials` (
	`id` binary(16) NOT NULL,
	`transfer_item_id` binary(16) NOT NULL,
	`serial_id` binary(16) NOT NULL,
	CONSTRAINT `stock_transfer_serials_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stock_transfers` (
	`id` binary(16) NOT NULL,
	`reference_number` varchar(50) NOT NULL,
	`source_warehouse_id` binary(16) NOT NULL,
	`destination_warehouse_id` binary(16) NOT NULL,
	`transferred_at` timestamp NOT NULL DEFAULT (now()),
	`transferred_by` binary(16) NOT NULL,
	`notes` text,
	CONSTRAINT `stock_transfers_id` PRIMARY KEY(`id`),
	CONSTRAINT `stock_transfers_reference_number_unique` UNIQUE(`reference_number`)
);
--> statement-breakpoint
CREATE TABLE `quotation_items` (
	`id` binary(16) NOT NULL,
	`quotation_id` binary(16) NOT NULL,
	`product_id` binary(16) NOT NULL,
	`quantity` int NOT NULL,
	`unit_price` decimal(12,2) NOT NULL,
	`discount_amount` decimal(12,2) NOT NULL DEFAULT '0',
	`discount_type` varchar(20),
	`line_total` decimal(14,2) NOT NULL,
	CONSTRAINT `quotation_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quotations` (
	`id` binary(16) NOT NULL,
	`reference_number` varchar(50),
	`branch_id` binary(16) NOT NULL,
	`customer_id` binary(16),
	`created_by` binary(16) NOT NULL,
	`subtotal` decimal(14,2) NOT NULL,
	`manual_discount` decimal(14,2) NOT NULL DEFAULT '0.00',
	`tax_amount` decimal(14,2) NOT NULL DEFAULT '0.00',
	`tax_details` text,
	`total` decimal(14,2) NOT NULL,
	`status` enum('DRAFT','ACCEPTED','EXPIRED','CONVERTED') NOT NULL DEFAULT 'DRAFT',
	`valid_until` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `quotations_id` PRIMARY KEY(`id`),
	CONSTRAINT `quotations_reference_number_unique` UNIQUE(`reference_number`)
);
--> statement-breakpoint
CREATE TABLE `collection_attempts` (
	`id` binary(16) NOT NULL,
	`trip_id` binary(16) NOT NULL,
	`contract_id` binary(16) NOT NULL,
	`customer_id` binary(16) NOT NULL,
	`status` enum('COLLECTED','MISSED','CUSTOMER_UNAVAILABLE','PROMISE_TO_PAY') NOT NULL,
	`remarks` varchar(255),
	`gps_lat` decimal(10,7),
	`gps_lng` decimal(10,7),
	`attempted_by` binary(16) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `collection_attempts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `fixed_asset_categories` (
	`id` binary(16) NOT NULL,
	`name` varchar(100) NOT NULL,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `fixed_asset_categories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `fixed_assets` (
	`id` binary(16) NOT NULL,
	`asset_code` varchar(50) NOT NULL,
	`name` varchar(255) NOT NULL,
	`category_id` binary(16) NOT NULL,
	`branch_id` binary(16) NOT NULL,
	`warehouse_id` binary(16),
	`assigned_to` binary(16),
	`status` enum('ACTIVE','IN_REPAIR','DISPOSED','LOST') NOT NULL DEFAULT 'ACTIVE',
	`purchase_date` date,
	`purchase_price` decimal(14,2),
	`supplier` varchar(255),
	`warranty_expiry` date,
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `fixed_assets_id` PRIMARY KEY(`id`),
	CONSTRAINT `fixed_assets_asset_code_unique` UNIQUE(`asset_code`)
);
--> statement-breakpoint
CREATE TABLE `pre_order_items` (
	`id` binary(16) NOT NULL,
	`pre_order_id` binary(16) NOT NULL,
	`product_id` binary(16) NOT NULL,
	`quantity` int NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pre_order_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pre_orders` (
	`id` binary(16) NOT NULL,
	`branch_id` binary(16) NOT NULL,
	`route_id` binary(16) NOT NULL,
	`customer_id` binary(16) NOT NULL,
	`status` enum('PENDING','FULFILLED','CANCELLED') NOT NULL DEFAULT 'PENDING',
	`advance_payment` varchar(20) NOT NULL DEFAULT '0.00',
	`payment_method` enum('CASH','CARD','BANK_TRANSFER'),
	`sale_type_preference` enum('DIRECT','INSTALLMENT'),
	`receipt_number` varchar(255),
	`fulfilled_sale_id` binary(16),
	`remarks` varchar(500),
	`created_by` binary(16) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pre_orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `taxes` (
	`id` binary(16) NOT NULL,
	`name` varchar(100) NOT NULL,
	`rate` decimal(5,2) NOT NULL,
	`type` enum('EXCLUSIVE','INCLUSIVE') NOT NULL DEFAULT 'EXCLUSIVE',
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `taxes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `document_sequences` (
	`branch_id` binary(16) NOT NULL,
	`document_type` varchar(50) NOT NULL,
	`prefix_format` varchar(100) NOT NULL,
	`sequence_length` int NOT NULL DEFAULT 4,
	`current_sequence` int NOT NULL DEFAULT 0,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `document_sequences_branch_id_document_type_pk` PRIMARY KEY(`branch_id`,`document_type`)
);
--> statement-breakpoint
CREATE TABLE `expense_categories` (
	`id` binary(16) NOT NULL,
	`name` varchar(100) NOT NULL,
	`type` varchar(50) NOT NULL DEFAULT 'OPERATIONAL',
	`is_active` boolean NOT NULL DEFAULT true,
	CONSTRAINT `expense_categories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `expenses` (
	`id` binary(16) NOT NULL,
	`branch_id` binary(16) NOT NULL,
	`category_id` binary(16) NOT NULL,
	`user_id` binary(16) NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`expense_date` timestamp NOT NULL,
	`description` text,
	`receipt_url` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `expenses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `sale_items` ADD `discount_amount` decimal(12,2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `sale_items` ADD `discount_type` varchar(20);--> statement-breakpoint
ALTER TABLE `sales` ADD `reference_number` varchar(50);--> statement-breakpoint
ALTER TABLE `sales` ADD `pre_order_id` binary(16);--> statement-breakpoint
ALTER TABLE `sales` ADD `tax_amount` decimal(14,2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE `sales` ADD `tax_details` text;--> statement-breakpoint
ALTER TABLE `collection_receipts` ADD `gps_lat` decimal(10,7);--> statement-breakpoint
ALTER TABLE `collection_receipts` ADD `gps_lng` decimal(10,7);--> statement-breakpoint
ALTER TABLE `sales` ADD CONSTRAINT `sales_reference_number_unique` UNIQUE(`reference_number`);--> statement-breakpoint
ALTER TABLE `fixed_assets` ADD CONSTRAINT `fixed_assets_category_id_fixed_asset_categories_id_fk` FOREIGN KEY (`category_id`) REFERENCES `fixed_asset_categories`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `fixed_assets` ADD CONSTRAINT `fixed_assets_branch_id_branches_id_fk` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `fixed_assets` ADD CONSTRAINT `fixed_assets_warehouse_id_warehouses_id_fk` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `fixed_assets` ADD CONSTRAINT `fixed_assets_assigned_to_users_id_fk` FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_branch_id_branches_id_fk` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_category_id_expense_categories_id_fk` FOREIGN KEY (`category_id`) REFERENCES `expense_categories`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;