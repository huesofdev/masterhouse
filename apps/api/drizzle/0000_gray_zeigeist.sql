CREATE TABLE `user_branches` (
	`user_id` binary(16) NOT NULL,
	`branch_id` binary(16) NOT NULL,
	CONSTRAINT `user_branches_user_id_branch_id_pk` PRIMARY KEY(`user_id`,`branch_id`)
);

CREATE TABLE `users` (
	`id` binary(16) NOT NULL,
	`email` varchar(255) NOT NULL,
	`name` varchar(255),
	`password_hash` varchar(255) NOT NULL,
	`role_id` binary(16),
	`is_active` boolean NOT NULL DEFAULT true,
	`max_discount_percentage` decimal(5,2) NOT NULL DEFAULT '0.00',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);

CREATE TABLE `permissions` (
	`id` binary(16) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` varchar(255),
	CONSTRAINT `permissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `permissions_name_unique` UNIQUE(`name`)
);

CREATE TABLE `role_permissions` (
	`role_id` binary(16) NOT NULL,
	`permission_id` binary(16) NOT NULL,
	CONSTRAINT `role_permissions_role_id_permission_id_pk` PRIMARY KEY(`role_id`,`permission_id`)
);

CREATE TABLE `roles` (
	`id` binary(16) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` varchar(255),
	`level` int NOT NULL DEFAULT 10,
	CONSTRAINT `roles_id` PRIMARY KEY(`id`),
	CONSTRAINT `roles_name_unique` UNIQUE(`name`)
);

CREATE TABLE `branch_phones` (
	`id` binary(16) NOT NULL,
	`branch_id` binary(16) NOT NULL,
	`phone_number` varchar(15) NOT NULL,
	CONSTRAINT `branch_phones_id` PRIMARY KEY(`id`),
	CONSTRAINT `unique_branch_phone` UNIQUE(`branch_id`,`phone_number`)
);

CREATE TABLE `branches` (
	`id` binary(16) NOT NULL,
	`name` varchar(255) NOT NULL,
	`address` varchar(255),
	`is_active` boolean NOT NULL DEFAULT true,
	CONSTRAINT `branches_id` PRIMARY KEY(`id`)
);

CREATE TABLE `warehouses` (
	`id` binary(16) NOT NULL,
	`branch_id` binary(16) NOT NULL,
	`name` varchar(255) NOT NULL,
	`address` varchar(255) NOT NULL,
	`is_default` boolean NOT NULL DEFAULT false,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `warehouses_id` PRIMARY KEY(`id`)
);

CREATE TABLE `categories` (
	`id` binary(16) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `categories_id` PRIMARY KEY(`id`)
);

CREATE TABLE `fleet_vehicles` (
	`id` binary(16) NOT NULL,
	`branch_id` binary(16) NOT NULL,
	`type` enum('LORRY','VAN','CAR','TUK_TUK','BIKE','OTHER') NOT NULL DEFAULT 'LORRY',
	`license_plate` varchar(50) NOT NULL,
	`model` varchar(100) NOT NULL,
	`status` enum('ACTIVE','IN_SERVICE','RETIRED') NOT NULL DEFAULT 'ACTIVE',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `fleet_vehicles_id` PRIMARY KEY(`id`),
	CONSTRAINT `fleet_vehicles_license_plate_unique` UNIQUE(`license_plate`)
);

CREATE TABLE `routes` (
	`id` binary(16) NOT NULL,
	`branch_id` binary(16) NOT NULL,
	`code` varchar(50) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` varchar(255),
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `routes_id` PRIMARY KEY(`id`)
);

CREATE TABLE `products` (
	`id` binary(16) NOT NULL,
	`category_id` binary(16) NOT NULL,
	`name` varchar(255) NOT NULL,
	`sku` varchar(100) NOT NULL,
	`description` text,
	`image_url` varchar(1000),
	`base_price` decimal(12,2) NOT NULL DEFAULT '0.00',
	`uom` enum('pieces','kg','g','l','ml','box','pack') NOT NULL DEFAULT 'pieces',
	`is_serialized` boolean NOT NULL DEFAULT false,
	`min_downpayment_rate` decimal(5,2) NOT NULL DEFAULT '0.00',
	`warranty_months` int NOT NULL DEFAULT 12,
	`avg_cost` decimal(12,2) NOT NULL DEFAULT '0.00',
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `products_id` PRIMARY KEY(`id`),
	CONSTRAINT `products_sku_unique` UNIQUE(`sku`)
);

CREATE TABLE `suppliers` (
	`id` binary(16) NOT NULL,
	`name` varchar(255) NOT NULL,
	`contact_person` varchar(255),
	`phone` varchar(20),
	`email` varchar(255),
	`address` text,
	`notes` text,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `suppliers_id` PRIMARY KEY(`id`)
);

CREATE TABLE `intake_items` (
	`id` binary(16) NOT NULL,
	`intake_order_id` binary(16) NOT NULL,
	`warehouse_id` binary(16) NOT NULL,
	`product_id` binary(16) NOT NULL,
	`quantity` int NOT NULL,
	`unit_cost` decimal(12,2) NOT NULL,
	`total_cost` decimal(14,2) NOT NULL,
	CONSTRAINT `intake_items_id` PRIMARY KEY(`id`)
);

CREATE TABLE `intake_orders` (
	`id` binary(16) NOT NULL,
	`branch_id` binary(16) NOT NULL,
	`warehouse_id` binary(16) NOT NULL,
	`supplier_id` binary(16),
	`supplier_name` varchar(255) NOT NULL,
	`invoice_number` varchar(100),
	`status` enum('RECEIVED','VOID') NOT NULL DEFAULT 'RECEIVED',
	`received_at` datetime NOT NULL,
	`created_by` binary(16) NOT NULL,
	`total_cost` decimal(14,2) NOT NULL DEFAULT '0.00',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `intake_orders_id` PRIMARY KEY(`id`)
);

CREATE TABLE `inventory_balances` (
	`warehouse_id` binary(16) NOT NULL,
	`product_id` binary(16) NOT NULL,
	`quantity` int NOT NULL DEFAULT 0,
	`avg_cost` decimal(12,2) NOT NULL DEFAULT '0.00',
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `inventory_balances_warehouse_id_product_id_pk` PRIMARY KEY(`warehouse_id`,`product_id`)
);

CREATE TABLE `serial_items` (
	`id` binary(16) NOT NULL,
	`product_id` binary(16) NOT NULL,
	`intake_item_id` binary(16),
	`warehouse_id` binary(16),
	`serial_number` varchar(150) NOT NULL,
	`status` enum('IN_STOCK','ON_TRIP','SOLD','RETURNED','LOST','DEFECTIVE','UNDER_WARRANTY') NOT NULL DEFAULT 'IN_STOCK',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `serial_items_id` PRIMARY KEY(`id`)
);

CREATE TABLE `discrepancy_logs` (
	`id` binary(16) NOT NULL,
	`trip_id` binary(16) NOT NULL,
	`type` enum('CASH_SHORTAGE','CASH_EXCESS','STOCK_MISSING','STOCK_EXCESS','OTHER') NOT NULL,
	`description` text NOT NULL,
	`expected_value` varchar(100),
	`actual_value` varchar(100),
	`status` enum('OPEN','RESOLVED','WAIVED') NOT NULL DEFAULT 'OPEN',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `discrepancy_logs_id` PRIMARY KEY(`id`)
);

CREATE TABLE `trip_staff` (
	`trip_id` binary(16) NOT NULL,
	`user_id` binary(16) NOT NULL,
	`duty` varchar(100) NOT NULL,
	CONSTRAINT `trip_staff_trip_id_user_id_pk` PRIMARY KEY(`trip_id`,`user_id`)
);

CREATE TABLE `trip_stock` (
	`id` binary(16) NOT NULL,
	`trip_id` binary(16) NOT NULL,
	`product_id` binary(16) NOT NULL,
	`serial_item_id` binary(16),
	`loaded_qty` int NOT NULL,
	`returned_qty` int NOT NULL DEFAULT 0,
	`sold_qty` int NOT NULL DEFAULT 0,
	`status` enum('LOADED','CONFIRMED','RETURNED','DISCREPANCY') NOT NULL DEFAULT 'LOADED',
	CONSTRAINT `trip_stock_id` PRIMARY KEY(`id`)
);

CREATE TABLE `trips` (
	`id` binary(16) NOT NULL,
	`branch_id` binary(16) NOT NULL,
	`route_id` binary(16) NOT NULL,
	`vehicle_id` binary(16) NOT NULL,
	`status` enum('PLANNED','LOADING','DEPARTED','IN_PROGRESS','RECONCILING','CLOSED','CLOSED_WITH_DISCREPANCIES','CANCELLED') NOT NULL DEFAULT 'PLANNED',
	`type` enum('SALE','COLLECTION','BOTH') NOT NULL DEFAULT 'BOTH',
	`planned_date` date NOT NULL,
	`departed_at` datetime,
	`closed_at` datetime,
	`expected_cash` decimal(14,2) NOT NULL DEFAULT '0.00',
	`actual_cash` decimal(14,2) NOT NULL DEFAULT '0.00',
	`created_by` binary(16) NOT NULL,
	`incharge_id` binary(16) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `trips_id` PRIMARY KEY(`id`)
);

CREATE TABLE `customers` (
	`id` binary(16) NOT NULL,
	`branch_id` binary(16) NOT NULL,
	`route_id` binary(16),
	`full_name` varchar(255) NOT NULL,
	`nic` varchar(50),
	`mobile` varchar(50) NOT NULL,
	`address` varchar(255) NOT NULL,
	`gps_lat` decimal(10,7),
	`gps_lng` decimal(10,7),
	`nic_front_url` varchar(500),
	`nic_back_url` varchar(500),
	`is_walk_in` boolean NOT NULL DEFAULT false,
	`wallet_balance` decimal(12,2) NOT NULL DEFAULT '0.00',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `customers_id` PRIMARY KEY(`id`)
);

CREATE TABLE `guarantors` (
	`id` binary(16) NOT NULL,
	`full_name` varchar(255) NOT NULL,
	`nic` varchar(50) NOT NULL,
	`mobile` varchar(50) NOT NULL,
	`address` varchar(255) NOT NULL,
	`nic_front_url` varchar(500),
	`nic_back_url` varchar(500),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `guarantors_id` PRIMARY KEY(`id`)
);

CREATE TABLE `sale_items` (
	`id` binary(16) NOT NULL,
	`sale_id` binary(16) NOT NULL,
	`product_id` binary(16) NOT NULL,
	`serial_item_id` binary(16),
	`quantity` int NOT NULL,
	`unit_price` decimal(12,2) NOT NULL,
	`line_total` decimal(14,2) NOT NULL,
	CONSTRAINT `sale_items_id` PRIMARY KEY(`id`)
);

CREATE TABLE `sales` (
	`id` binary(16) NOT NULL,
	`branch_id` binary(16) NOT NULL,
	`customer_id` binary(16),
	`trip_id` binary(16),
	`created_by` binary(16) NOT NULL,
	`sale_type` enum('DIRECT','INSTALLMENT') NOT NULL,
	`payment_mode` enum('CASH','CARD','TRANSFER') NOT NULL DEFAULT 'CASH',
	`subtotal` decimal(14,2) NOT NULL,
	`promotion_id` binary(16),
	`promotion_discount` decimal(14,2) NOT NULL DEFAULT '0.00',
	`manual_discount` decimal(14,2) NOT NULL DEFAULT '0.00',
	`downpayment` decimal(14,2) NOT NULL DEFAULT '0.00',
	`total` decimal(14,2) NOT NULL,
	`status` enum('COMPLETED','CANCELLED','RETURNED') NOT NULL DEFAULT 'COMPLETED',
	`idempotency_key` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sales_id` PRIMARY KEY(`id`),
	CONSTRAINT `sales_idempotency_key_unique` UNIQUE(`idempotency_key`)
);

CREATE TABLE `collection_receipts` (
	`id` binary(16) NOT NULL,
	`receipt_no` varchar(100) NOT NULL,
	`contract_id` binary(16) NOT NULL,
	`customer_id` binary(16) NOT NULL,
	`trip_id` binary(16),
	`collected_by` binary(16) NOT NULL,
	`amount` decimal(14,2) NOT NULL,
	`payment_mode` enum('CASH','CARD','TRANSFER') NOT NULL DEFAULT 'CASH',
	`sms_status` enum('PENDING','SENT','FAILED','SKIPPED') NOT NULL DEFAULT 'PENDING',
	`idempotency_key` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `collection_receipts_id` PRIMARY KEY(`id`),
	CONSTRAINT `collection_receipts_receipt_no_unique` UNIQUE(`receipt_no`),
	CONSTRAINT `collection_receipts_idempotency_key_unique` UNIQUE(`idempotency_key`)
);

CREATE TABLE `contract_adjustments` (
	`id` binary(16) NOT NULL,
	`contract_id` binary(16) NOT NULL,
	`type` enum('DISCOUNT','WRITE_OFF','PENALTY','REBATE') NOT NULL,
	`amount` decimal(14,2) NOT NULL,
	`reason` varchar(255) NOT NULL,
	`created_by` binary(16) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `contract_adjustments_id` PRIMARY KEY(`id`)
);

CREATE TABLE `installment_contracts` (
	`id` binary(16) NOT NULL,
	`sale_id` binary(16) NOT NULL,
	`customer_id` binary(16) NOT NULL,
	`scheme_id` binary(16) NOT NULL,
	`guarantor_id` binary(16) NOT NULL,
	`principal` decimal(14,2) NOT NULL,
	`interest_rate` decimal(5,2) NOT NULL,
	`interest_amount` decimal(14,2) NOT NULL,
	`total_payable` decimal(14,2) NOT NULL,
	`downpayment` decimal(14,2) NOT NULL,
	`balance` decimal(14,2) NOT NULL,
	`schedule_frequency` enum('WEEKLY','MONTHLY') NOT NULL,
	`status` enum('ACTIVE','PAID_OFF','DEFAULTED','CANCELLED','SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
	`signature_image_url` varchar(500),
	`guarantor_signature_image_url` varchar(500),
	`suspended_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `installment_contracts_id` PRIMARY KEY(`id`)
);

CREATE TABLE `installment_schedules` (
	`id` binary(16) NOT NULL,
	`contract_id` binary(16) NOT NULL,
	`installment_number` int NOT NULL,
	`due_date` date NOT NULL,
	`amount_due` decimal(12,2) NOT NULL,
	`amount_paid` decimal(12,2) NOT NULL DEFAULT '0.00',
	`late_fee` decimal(12,2) NOT NULL DEFAULT '0.00',
	`status` enum('PENDING','PARTIALLY_PAID','PAID','OVERDUE','WAIVED') NOT NULL DEFAULT 'PENDING',
	CONSTRAINT `installment_schedules_id` PRIMARY KEY(`id`)
);

CREATE TABLE `installment_schemes` (
	`id` binary(16) NOT NULL,
	`branch_id` binary(16),
	`name` varchar(255) NOT NULL,
	`terms` int NOT NULL,
	`frequency` enum('DAILY','WEEKLY','MONTHLY') NOT NULL,
	`interest_rate` decimal(5,2) NOT NULL,
	`min_downpayment_percent` decimal(5,2) NOT NULL,
	`late_fee_percentage` decimal(5,2) NOT NULL,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `installment_schemes_id` PRIMARY KEY(`id`)
);

CREATE TABLE `refunds` (
	`id` binary(16) NOT NULL,
	`contract_id` binary(16) NOT NULL,
	`customer_id` binary(16) NOT NULL,
	`amount` decimal(14,2) NOT NULL,
	`reason` varchar(255) NOT NULL,
	`approved_by` binary(16) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `refunds_id` PRIMARY KEY(`id`)
);

CREATE TABLE `returns` (
	`id` binary(16) NOT NULL,
	`sale_id` binary(16) NOT NULL,
	`sale_item_id` binary(16) NOT NULL,
	`serial_item_id` binary(16),
	`type` enum('CUSTOMER_RETURN','DEFECTIVE','WARRANTY') NOT NULL,
	`disposition` enum('RESTOCKED','DEFECTIVE_DEPOT','SUPPLIER_RETURNED','WRITTEN_OFF') NOT NULL,
	`reason` text NOT NULL,
	`refund_amount` varchar(20) NOT NULL DEFAULT '0.00',
	`refund_mode` enum('CASH','STORE_CREDIT','NONE') NOT NULL DEFAULT 'NONE',
	`processed_by` binary(16) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `returns_id` PRIMARY KEY(`id`)
);

CREATE TABLE `warranty_claims` (
	`id` binary(16) NOT NULL,
	`sale_item_id` binary(16) NOT NULL,
	`customer_id` binary(16) NOT NULL,
	`serial_item_id` binary(16),
	`issue_description` text NOT NULL,
	`status` enum('OPEN','ITEM_COLLECTED','SENT_TO_SUPPLIER','IN_REPAIR','REPAIRED','REPLACED','REJECTED','CLOSED') NOT NULL DEFAULT 'OPEN',
	`resolution` enum('REPAIRED','REPLACED','REJECTED'),
	`replacement_serial_id` binary(16),
	`processed_by` binary(16) NOT NULL,
	`collected_at` datetime,
	`sent_to_supplier_at` datetime,
	`received_from_supplier_at` datetime,
	`resolved_at` datetime,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `warranty_claims_id` PRIMARY KEY(`id`)
);

CREATE TABLE `sync_conflicts` (
	`id` binary(16) NOT NULL,
	`branch_id` binary(16) NOT NULL,
	`user_id` binary(16) NOT NULL,
	`error_type` enum('DOUBLE_SALE','PHANTOM_STOCK','OVER_COLLECTION','OTHER') NOT NULL,
	`error_message` text NOT NULL,
	`raw_payload` json NOT NULL,
	`status` enum('PENDING','RESOLVED','DISCARDED') NOT NULL DEFAULT 'PENDING',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`resolved_at` timestamp,
	CONSTRAINT `sync_conflicts_id` PRIMARY KEY(`id`)
);

CREATE TABLE `system_settings` (
	`setting_key` varchar(100) NOT NULL,
	`setting_value` text,
	`updated_by` binary(16),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `system_settings_setting_key` PRIMARY KEY(`setting_key`)
);

CREATE TABLE `sms_logs` (
	`id` binary(16) NOT NULL,
	`customer_id` binary(16) NOT NULL,
	`trigger_event` enum('SALE_CREATED','COLLECTION_RECEIPT','PAYMENT_OVERDUE','CUSTOM') NOT NULL,
	`reference_id` binary(16),
	`phone_number` varchar(50) NOT NULL,
	`message_body` text NOT NULL,
	`status` enum('PENDING','SENT','FAILED') NOT NULL DEFAULT 'PENDING',
	`provider_response` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`sent_at` timestamp,
	CONSTRAINT `sms_logs_id` PRIMARY KEY(`id`)
);

CREATE TABLE `sms_templates` (
	`id` binary(16) NOT NULL,
	`trigger_event` enum('SALE_CREATED','COLLECTION_RECEIPT','PAYMENT_OVERDUE') NOT NULL,
	`body_template` text NOT NULL,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sms_templates_id` PRIMARY KEY(`id`),
	CONSTRAINT `sms_templates_trigger_event_unique` UNIQUE(`trigger_event`)
);

CREATE TABLE `promotions` (
	`id` binary(16) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` varchar(255),
	`start_date` timestamp NOT NULL,
	`end_date` timestamp NOT NULL,
	`discount_type` enum('PERCENTAGE','FIXED') NOT NULL,
	`discount_value` decimal(14,2) NOT NULL,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_by` binary(16) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `promotions_id` PRIMARY KEY(`id`)
);
