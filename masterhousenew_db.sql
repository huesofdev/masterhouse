-- MySQL dump 10.13  Distrib 8.0.44, for Win64 (x86_64)
--
-- Host: localhost    Database: masterhousenew1
-- ------------------------------------------------------
-- Server version	8.0.44

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `branch_phones`
--

DROP TABLE IF EXISTS `branch_phones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `branch_phones` (
  `id` binary(16) NOT NULL,
  `branch_id` binary(16) NOT NULL,
  `phone_number` varchar(15) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_branch_phone` (`branch_id`,`phone_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `branch_phones`
--

LOCK TABLES `branch_phones` WRITE;
/*!40000 ALTER TABLE `branch_phones` DISABLE KEYS */;
/*!40000 ALTER TABLE `branch_phones` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `branches`
--

DROP TABLE IF EXISTS `branches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `branches` (
  `id` binary(16) NOT NULL,
  `name` varchar(255) NOT NULL,
  `address` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `branches`
--

LOCK TABLES `branches` WRITE;
/*!40000 ALTER TABLE `branches` DISABLE KEYS */;
INSERT INTO `branches` VALUES (_binary 'û\”=ÑàuKπSZÆN;\Ô¢','HQ (Admin Only)','123 Admin Lane',1);
/*!40000 ALTER TABLE `branches` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `categories`
--

DROP TABLE IF EXISTS `categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `categories` (
  `id` binary(16) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categories`
--

LOCK TABLES `categories` WRITE;
/*!40000 ALTER TABLE `categories` DISABLE KEYS */;
/*!40000 ALTER TABLE `categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `collection_attempts`
--

DROP TABLE IF EXISTS `collection_attempts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `collection_attempts` (
  `id` binary(16) NOT NULL,
  `trip_id` binary(16) NOT NULL,
  `contract_id` binary(16) NOT NULL,
  `customer_id` binary(16) NOT NULL,
  `status` enum('COLLECTED','MISSED','CUSTOMER_UNAVAILABLE','PROMISE_TO_PAY') NOT NULL,
  `remarks` varchar(255) DEFAULT NULL,
  `gps_lat` decimal(10,7) DEFAULT NULL,
  `gps_lng` decimal(10,7) DEFAULT NULL,
  `attempted_by` binary(16) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `collection_attempts`
--

LOCK TABLES `collection_attempts` WRITE;
/*!40000 ALTER TABLE `collection_attempts` DISABLE KEYS */;
/*!40000 ALTER TABLE `collection_attempts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `collection_receipts`
--

DROP TABLE IF EXISTS `collection_receipts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `collection_receipts` (
  `id` binary(16) NOT NULL,
  `receipt_no` varchar(100) NOT NULL,
  `offline_receipt_number` varchar(50) DEFAULT NULL,
  `contract_id` binary(16) NOT NULL,
  `customer_id` binary(16) NOT NULL,
  `trip_id` binary(16) DEFAULT NULL,
  `collected_by` binary(16) NOT NULL,
  `amount` decimal(14,2) NOT NULL,
  `payment_mode` enum('CASH','CARD','TRANSFER') NOT NULL DEFAULT 'CASH',
  `sms_status` enum('PENDING','SENT','FAILED','SKIPPED') NOT NULL DEFAULT 'PENDING',
  `idempotency_key` varchar(255) DEFAULT NULL,
  `gps_lat` decimal(10,7) DEFAULT NULL,
  `gps_lng` decimal(10,7) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`),
  UNIQUE KEY `collection_receipts_receipt_no_unique` (`receipt_no`),
  UNIQUE KEY `collection_receipts_idempotency_key_unique` (`idempotency_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `collection_receipts`
--

LOCK TABLES `collection_receipts` WRITE;
/*!40000 ALTER TABLE `collection_receipts` DISABLE KEYS */;
/*!40000 ALTER TABLE `collection_receipts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `contract_adjustments`
--

DROP TABLE IF EXISTS `contract_adjustments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `contract_adjustments` (
  `id` binary(16) NOT NULL,
  `contract_id` binary(16) NOT NULL,
  `type` enum('DISCOUNT','WRITE_OFF','PENALTY','REBATE') NOT NULL,
  `amount` decimal(14,2) NOT NULL,
  `reason` varchar(255) NOT NULL,
  `created_by` binary(16) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `contract_adjustments`
--

LOCK TABLES `contract_adjustments` WRITE;
/*!40000 ALTER TABLE `contract_adjustments` DISABLE KEYS */;
/*!40000 ALTER TABLE `contract_adjustments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customers`
--

DROP TABLE IF EXISTS `customers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customers` (
  `id` binary(16) NOT NULL,
  `branch_id` binary(16) NOT NULL,
  `route_id` binary(16) DEFAULT NULL,
  `full_name` varchar(255) NOT NULL,
  `nic` varchar(50) DEFAULT NULL,
  `mobile` varchar(50) NOT NULL,
  `address` varchar(255) NOT NULL,
  `gps_lat` decimal(10,7) DEFAULT NULL,
  `gps_lng` decimal(10,7) DEFAULT NULL,
  `nic_front_url` varchar(500) DEFAULT NULL,
  `nic_back_url` varchar(500) DEFAULT NULL,
  `is_walk_in` tinyint(1) NOT NULL DEFAULT '0',
  `wallet_balance` decimal(12,2) NOT NULL DEFAULT '0.00',
  `created_at` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customers`
--

LOCK TABLES `customers` WRITE;
/*!40000 ALTER TABLE `customers` DISABLE KEYS */;
/*!40000 ALTER TABLE `customers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `discrepancy_logs`
--

DROP TABLE IF EXISTS `discrepancy_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `discrepancy_logs` (
  `id` binary(16) NOT NULL,
  `trip_id` binary(16) NOT NULL,
  `type` enum('CASH_SHORTAGE','CASH_EXCESS','STOCK_MISSING','STOCK_EXCESS','OTHER') NOT NULL,
  `description` text NOT NULL,
  `expected_value` varchar(100) DEFAULT NULL,
  `actual_value` varchar(100) DEFAULT NULL,
  `status` enum('OPEN','RESOLVED','WAIVED','CHARGED_TO_WALLET') NOT NULL DEFAULT 'OPEN',
  `snapshot_data` json DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `discrepancy_logs`
--

LOCK TABLES `discrepancy_logs` WRITE;
/*!40000 ALTER TABLE `discrepancy_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `discrepancy_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `document_sequences`
--

DROP TABLE IF EXISTS `document_sequences`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `document_sequences` (
  `branch_id` binary(16) NOT NULL,
  `document_type` varchar(50) NOT NULL,
  `prefix_format` varchar(100) NOT NULL,
  `sequence_length` int NOT NULL DEFAULT '4',
  `current_sequence` int NOT NULL DEFAULT '0',
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`branch_id`,`document_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `document_sequences`
--

LOCK TABLES `document_sequences` WRITE;
/*!40000 ALTER TABLE `document_sequences` DISABLE KEYS */;
/*!40000 ALTER TABLE `document_sequences` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `expense_categories`
--

DROP TABLE IF EXISTS `expense_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `expense_categories` (
  `id` binary(16) NOT NULL,
  `name` varchar(100) NOT NULL,
  `type` varchar(50) NOT NULL DEFAULT 'OPERATIONAL',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `expense_categories`
--

LOCK TABLES `expense_categories` WRITE;
/*!40000 ALTER TABLE `expense_categories` DISABLE KEYS */;
/*!40000 ALTER TABLE `expense_categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `expenses`
--

DROP TABLE IF EXISTS `expenses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
  PRIMARY KEY (`id`),
  KEY `expenses_branch_id_branches_id_fk` (`branch_id`),
  KEY `expenses_category_id_expense_categories_id_fk` (`category_id`),
  KEY `expenses_user_id_users_id_fk` (`user_id`),
  CONSTRAINT `expenses_branch_id_branches_id_fk` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  CONSTRAINT `expenses_category_id_expense_categories_id_fk` FOREIGN KEY (`category_id`) REFERENCES `expense_categories` (`id`),
  CONSTRAINT `expenses_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `expenses`
--

LOCK TABLES `expenses` WRITE;
/*!40000 ALTER TABLE `expenses` DISABLE KEYS */;
/*!40000 ALTER TABLE `expenses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `fixed_asset_categories`
--

DROP TABLE IF EXISTS `fixed_asset_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fixed_asset_categories` (
  `id` binary(16) NOT NULL,
  `name` varchar(100) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `fixed_asset_categories`
--

LOCK TABLES `fixed_asset_categories` WRITE;
/*!40000 ALTER TABLE `fixed_asset_categories` DISABLE KEYS */;
/*!40000 ALTER TABLE `fixed_asset_categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `fixed_assets`
--

DROP TABLE IF EXISTS `fixed_assets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fixed_assets` (
  `id` binary(16) NOT NULL,
  `asset_code` varchar(50) NOT NULL,
  `name` varchar(255) NOT NULL,
  `category_id` binary(16) NOT NULL,
  `branch_id` binary(16) NOT NULL,
  `warehouse_id` binary(16) DEFAULT NULL,
  `assigned_to` binary(16) DEFAULT NULL,
  `status` enum('ACTIVE','IN_REPAIR','DISPOSED','LOST') NOT NULL DEFAULT 'ACTIVE',
  `purchase_date` date DEFAULT NULL,
  `purchase_price` decimal(14,2) DEFAULT NULL,
  `supplier` varchar(255) DEFAULT NULL,
  `warranty_expiry` date DEFAULT NULL,
  `notes` text,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `fixed_assets_asset_code_unique` (`asset_code`),
  KEY `fixed_assets_category_id_fixed_asset_categories_id_fk` (`category_id`),
  KEY `fixed_assets_branch_id_branches_id_fk` (`branch_id`),
  KEY `fixed_assets_warehouse_id_warehouses_id_fk` (`warehouse_id`),
  KEY `fixed_assets_assigned_to_users_id_fk` (`assigned_to`),
  CONSTRAINT `fixed_assets_assigned_to_users_id_fk` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`),
  CONSTRAINT `fixed_assets_branch_id_branches_id_fk` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  CONSTRAINT `fixed_assets_category_id_fixed_asset_categories_id_fk` FOREIGN KEY (`category_id`) REFERENCES `fixed_asset_categories` (`id`),
  CONSTRAINT `fixed_assets_warehouse_id_warehouses_id_fk` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `fixed_assets`
--

LOCK TABLES `fixed_assets` WRITE;
/*!40000 ALTER TABLE `fixed_assets` DISABLE KEYS */;
/*!40000 ALTER TABLE `fixed_assets` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `fleet_vehicles`
--

DROP TABLE IF EXISTS `fleet_vehicles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fleet_vehicles` (
  `id` binary(16) NOT NULL,
  `branch_id` binary(16) NOT NULL,
  `type` enum('LORRY','VAN','CAR','TUK_TUK','BIKE','OTHER') NOT NULL DEFAULT 'LORRY',
  `license_plate` varchar(50) NOT NULL,
  `model` varchar(100) NOT NULL,
  `status` enum('ACTIVE','IN_SERVICE','RETIRED') NOT NULL DEFAULT 'ACTIVE',
  `created_at` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`),
  UNIQUE KEY `fleet_vehicles_license_plate_unique` (`license_plate`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `fleet_vehicles`
--

LOCK TABLES `fleet_vehicles` WRITE;
/*!40000 ALTER TABLE `fleet_vehicles` DISABLE KEYS */;
/*!40000 ALTER TABLE `fleet_vehicles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `guarantors`
--

DROP TABLE IF EXISTS `guarantors`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `guarantors` (
  `id` binary(16) NOT NULL,
  `full_name` varchar(255) NOT NULL,
  `nic` varchar(50) NOT NULL,
  `mobile` varchar(50) NOT NULL,
  `address` varchar(255) NOT NULL,
  `nic_front_url` varchar(500) DEFAULT NULL,
  `nic_back_url` varchar(500) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `guarantors`
--

LOCK TABLES `guarantors` WRITE;
/*!40000 ALTER TABLE `guarantors` DISABLE KEYS */;
/*!40000 ALTER TABLE `guarantors` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `installment_contracts`
--

DROP TABLE IF EXISTS `installment_contracts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
  `signature_image_url` varchar(500) DEFAULT NULL,
  `guarantor_signature_image_url` varchar(500) DEFAULT NULL,
  `suspended_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `installment_contracts`
--

LOCK TABLES `installment_contracts` WRITE;
/*!40000 ALTER TABLE `installment_contracts` DISABLE KEYS */;
/*!40000 ALTER TABLE `installment_contracts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `installment_schedules`
--

DROP TABLE IF EXISTS `installment_schedules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `installment_schedules` (
  `id` binary(16) NOT NULL,
  `contract_id` binary(16) NOT NULL,
  `installment_number` int NOT NULL,
  `due_date` date NOT NULL,
  `amount_due` decimal(12,2) NOT NULL,
  `amount_paid` decimal(12,2) NOT NULL DEFAULT '0.00',
  `late_fee` decimal(12,2) NOT NULL DEFAULT '0.00',
  `status` enum('PENDING','PARTIALLY_PAID','PAID','OVERDUE','WAIVED') NOT NULL DEFAULT 'PENDING',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `installment_schedules`
--

LOCK TABLES `installment_schedules` WRITE;
/*!40000 ALTER TABLE `installment_schedules` DISABLE KEYS */;
/*!40000 ALTER TABLE `installment_schedules` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `installment_schemes`
--

DROP TABLE IF EXISTS `installment_schemes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `installment_schemes` (
  `id` binary(16) NOT NULL,
  `branch_id` binary(16) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `terms` int NOT NULL,
  `frequency` enum('DAILY','WEEKLY','MONTHLY') NOT NULL,
  `interest_rate` decimal(5,2) NOT NULL,
  `min_downpayment_percent` decimal(5,2) NOT NULL,
  `late_fee_percentage` decimal(5,2) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `installment_schemes`
--

LOCK TABLES `installment_schemes` WRITE;
/*!40000 ALTER TABLE `installment_schemes` DISABLE KEYS */;
/*!40000 ALTER TABLE `installment_schemes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `intake_items`
--

DROP TABLE IF EXISTS `intake_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `intake_items` (
  `id` binary(16) NOT NULL,
  `intake_order_id` binary(16) NOT NULL,
  `warehouse_id` binary(16) NOT NULL,
  `product_id` binary(16) NOT NULL,
  `quantity` int NOT NULL,
  `unit_cost` decimal(12,2) NOT NULL,
  `total_cost` decimal(14,2) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `intake_items`
--

LOCK TABLES `intake_items` WRITE;
/*!40000 ALTER TABLE `intake_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `intake_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `intake_orders`
--

DROP TABLE IF EXISTS `intake_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `intake_orders` (
  `id` binary(16) NOT NULL,
  `branch_id` binary(16) NOT NULL,
  `warehouse_id` binary(16) NOT NULL,
  `supplier_id` binary(16) DEFAULT NULL,
  `supplier_name` varchar(255) NOT NULL,
  `invoice_number` varchar(100) DEFAULT NULL,
  `status` enum('RECEIVED','VOID') NOT NULL DEFAULT 'RECEIVED',
  `received_at` datetime NOT NULL,
  `created_by` binary(16) NOT NULL,
  `total_cost` decimal(14,2) NOT NULL DEFAULT '0.00',
  `created_at` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `intake_orders`
--

LOCK TABLES `intake_orders` WRITE;
/*!40000 ALTER TABLE `intake_orders` DISABLE KEYS */;
/*!40000 ALTER TABLE `intake_orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `inventory_balances`
--

DROP TABLE IF EXISTS `inventory_balances`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inventory_balances` (
  `warehouse_id` binary(16) NOT NULL,
  `product_id` binary(16) NOT NULL,
  `quantity` int NOT NULL DEFAULT '0',
  `avg_cost` decimal(12,2) NOT NULL DEFAULT '0.00',
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`warehouse_id`,`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inventory_balances`
--

LOCK TABLES `inventory_balances` WRITE;
/*!40000 ALTER TABLE `inventory_balances` DISABLE KEYS */;
/*!40000 ALTER TABLE `inventory_balances` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `permissions`
--

DROP TABLE IF EXISTS `permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `permissions` (
  `id` binary(16) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `permissions_name_unique` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `permissions`
--

LOCK TABLES `permissions` WRITE;
/*!40000 ALTER TABLE `permissions` DISABLE KEYS */;
INSERT INTO `permissions` VALUES (_binary 'û\”=Äq–¨\”8É¥>\'','users:read','Allows read operations on users'),(_binary 'û\”=Äµqÿπ\‚¢Ñ\Ô?2','users:create','Allows create operations on users'),(_binary 'û\”=Ä∫wz°\·ˇ≤\€6V','users:update','Allows update operations on users'),(_binary 'û\”=Äøs∂ô=1\‚É\ŸA','users:delete','Allows delete operations on users'),(_binary 'û\”=Ä\ƒsôΩ\ÚÉ\‚\ı\◊Ww','roles:read','Allows read operations on roles'),(_binary 'û\”=Ä\ vΩ`\—c±Yîù','roles:create','Allows create operations on roles'),(_binary 'û\”=Ä\Œw\Ôî\ÒKà\Ôâ','roles:update','Allows update operations on roles'),(_binary 'û\”=Ä\“v+õMh\ÂW•','roles:delete','Allows delete operations on roles'),(_binary 'û\”=Ä\◊r´ñ≤òò::±\0','branches:read','Allows read operations on branches'),(_binary 'û\”=Ä\‹swíMQÆ)\Ê\Ô™','branches:create','Allows create operations on branches'),(_binary 'û\”=Ä\·wOøT\”!\ﬂ\“','branches:update','Allows update operations on branches'),(_binary 'û\”=Ä\Âtç∂\”\–z\„¨.','branches:delete','Allows delete operations on branches'),(_binary 'û\”=Ä\Èv_±ªSk\Ú?Øu','customers:read','Allows read operations on customers'),(_binary 'û\”=Ä\ÌrKä¯@Wπ\»','customers:create','Allows create operations on customers'),(_binary 'û\”=Ä\ÒsíòQê4\“bØe','customers:update','Allows update operations on customers'),(_binary 'û\”=Ä\ıpÑ€Ø\Z¯ƒ¥\◊','customers:delete','Allows delete operations on customers'),(_binary 'û\”=Ä˙u~Ñ¢âA\'`\‡É','catalog:read','Allows read operations on catalog'),(_binary 'û\”=Äˇs¸µ\ﬁU≤g1&','catalog:create','Allows create operations on catalog'),(_binary 'û\”=ÅpKí_M£__b%','catalog:update','Allows update operations on catalog'),(_binary 'û\”=Åv\nìˇ}zë','catalog:delete','Allows delete operations on catalog'),(_binary 'û\”=Å\nqxÖ§u\÷}#\‚\Ÿ','inventory:read','Allows read operations on inventory'),(_binary 'û\”=Årﬁè\Ûg˛∞&∂µ','inventory:adjust','Allows adjust operations on inventory'),(_binary 'û\”=Åwàè\ÿ\ÛêE','inventory:transfer','Allows transfer operations on inventory'),(_binary 'û\”=Åp5ÖGø*>ûb','inventory:delete','Allows delete operations on inventory'),(_binary 'û\”=ÅvŒâïn\r\¬\Ÿ\◊','warehouses:read','Allows read operations on warehouses'),(_binary 'û\”=Å rg¶û∫d©\≈(','warehouses:create','Allows create operations on warehouses'),(_binary 'û\”=Å#rß®49û\À$','warehouses:update','Allows update operations on warehouses'),(_binary 'û\”=Å\'sÿºÖC\ÈCü\r','suppliers:read','Allows read operations on suppliers'),(_binary 'û\”=Å+s\Zã\ﬂKaïæ','suppliers:create','Allows create operations on suppliers'),(_binary 'û\”=Å/r6ª˛¥ø[\ƒ\€\À','suppliers:update','Allows update operations on suppliers'),(_binary 'û\”=Å3q˚íé Yù:','trips:read','Allows read operations on trips'),(_binary 'û\”=Å7v\Í†¿&`º_ƒà','trips:create','Allows create operations on trips'),(_binary 'û\”=Å:v{è\Í±¡\˜B_\√','trips:update','Allows update operations on trips'),(_binary 'û\”=Å>w9±¢*rç\”)','trips:delete','Allows delete operations on trips'),(_binary 'û\”=ÅBt)´©Äõ\—\Û\ÙF','trips:reconcile','Allows reconcile operations on trips'),(_binary 'û\”=ÅFsº\ﬁ@*s}>Å','trips:force_end','Allows force_end operations on trips'),(_binary 'û\”=ÅJu∏ºÆﬁ°?S','logistics:read','Allows read operations on logistics'),(_binary 'û\”=ÅNt>±\∆0óy\0°','logistics:create','Allows create operations on logistics'),(_binary 'û\”=ÅWu_ù£\—˝n±','logistics:update','Allows update operations on logistics'),(_binary 'û\”=Å[qøíD$\‘7','sales:read','Allows read operations on sales'),(_binary 'û\”=Å_q\Èç“≤˚°:*','sales:create','Allows create operations on sales'),(_binary 'û\”=ÅerŸ¨Æ˙\ÁËáñ9','sales:update','Allows update operations on sales'),(_binary 'û\”=Åku~¥º∑(\Ûli}','collections:read','Allows read operations on collections'),(_binary 'û\”=Åsu*£¸@´Ö¯','collections:create','Allows create operations on collections'),(_binary 'û\”=Åyvd≥’ìxC∂¶\Ã','collections:update','Allows update operations on collections'),(_binary 'û\”=ÅÄrä≤ú˙#t¡','collections:adjust','Allows adjust operations on collections'),(_binary 'û\”=ÅÜuY¨ª`\Ê\⁄\ÌE','promotions:read','Allows read operations on promotions'),(_binary 'û\”=ÅäpÔ£¢ßWh:a','promotions:create','Allows create operations on promotions'),(_binary 'û\”=Åétì≠\Ë\·Wù\—r','promotions:update','Allows update operations on promotions'),(_binary 'û\”=Åíu\Áå>\ﬁu\Ÿû','promotions:delete','Allows delete operations on promotions'),(_binary 'û\”=ÅñvôªXˇ\“aÑT','service:read','Allows read operations on service'),(_binary 'û\”=Åöu[úõ∆ô#}u','service:process','Allows process operations on service'),(_binary 'û\”=Åûv-ùÆ\‡∞Wâ¯','reports:view','Allows view operations on reports'),(_binary 'û\”=Å£rŸ¨I\˜=hçm ','reports:export','Allows export operations on reports'),(_binary 'û\”=Åßp*éE4F!ç','settings:read','Allows read operations on settings'),(_binary 'û\”=Å™sàó~Ü_\"','settings:update','Allows update operations on settings'),(_binary 'û\”=ÅØwÃ∑#yr˛C˙','sync:manage','Allows manage operations on sync'),(_binary 'û\”=Å≤po¢Æ\Á%C\◊\‚¢','orders:read','Allows read operations on orders'),(_binary 'û\”=Å∑péágÆ\Àv?U(','orders:create','Allows create operations on orders'),(_binary 'û\”=ÅªrÕò#qÖã\‰}','orders:delete','Allows delete operations on orders'),(_binary 'û\”=Åøt›¥¯gåîàsé','assets:read','Allows read operations on assets'),(_binary 'û\”=Å\√qKß6∞zl¢Ω','assets:create','Allows create operations on assets'),(_binary 'û\”=Å\«v®Õò\Û\Û\k\\','assets:update','Allows update operations on assets'),(_binary 'û\”=Å\Àqﬂ†7pÉD\ÿV','assets:delete','Allows delete operations on assets'),(_binary 'û\”=Å\œs™ß\“’ñú´9','expenses:read','Allows read operations on expenses'),(_binary 'û\”=Å\”pÀï\Û;\ÛIH¡\ÿ','expenses:create','Allows create operations on expenses'),(_binary 'û\”=Å\÷vÿ´\Ÿˇâq V','expenses:update','Allows update operations on expenses'),(_binary 'û\”=Å\⁄vØ\ÿ\«=ª\Â≥','wallets:read','Allows read operations on wallets'),(_binary 'û\”=Å\ﬁt*¨¥í[?8\Ùl','wallets:update','Allows update operations on wallets');
/*!40000 ALTER TABLE `permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pre_order_items`
--

DROP TABLE IF EXISTS `pre_order_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pre_order_items` (
  `id` binary(16) NOT NULL,
  `pre_order_id` binary(16) NOT NULL,
  `product_id` binary(16) NOT NULL,
  `quantity` int NOT NULL DEFAULT '1',
  `discount_input` varchar(50) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pre_order_items`
--

LOCK TABLES `pre_order_items` WRITE;
/*!40000 ALTER TABLE `pre_order_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `pre_order_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pre_orders`
--

DROP TABLE IF EXISTS `pre_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pre_orders` (
  `id` binary(16) NOT NULL,
  `reference_number` varchar(50) DEFAULT NULL,
  `offline_receipt_number` varchar(50) DEFAULT NULL,
  `branch_id` binary(16) NOT NULL,
  `route_id` binary(16) NOT NULL,
  `trip_id` binary(16) DEFAULT NULL,
  `customer_id` binary(16) NOT NULL,
  `status` enum('PENDING','FULFILLED','CANCELLED') NOT NULL DEFAULT 'PENDING',
  `advance_payment` varchar(20) NOT NULL DEFAULT '0.00',
  `payment_method` enum('CASH','CARD','BANK_TRANSFER') DEFAULT NULL,
  `sale_type_preference` enum('DIRECT','INSTALLMENT') DEFAULT NULL,
  `receipt_number` varchar(255) DEFAULT NULL,
  `fulfilled_sale_id` binary(16) DEFAULT NULL,
  `remarks` varchar(500) DEFAULT NULL,
  `created_by` binary(16) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`),
  UNIQUE KEY `pre_orders_reference_number_unique` (`reference_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pre_orders`
--

LOCK TABLES `pre_orders` WRITE;
/*!40000 ALTER TABLE `pre_orders` DISABLE KEYS */;
/*!40000 ALTER TABLE `pre_orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `products`
--

DROP TABLE IF EXISTS `products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `products` (
  `id` binary(16) NOT NULL,
  `category_id` binary(16) NOT NULL,
  `name` varchar(255) NOT NULL,
  `sku` varchar(100) NOT NULL,
  `description` text,
  `image_url` varchar(1000) DEFAULT NULL,
  `base_price` decimal(12,2) NOT NULL DEFAULT '0.00',
  `uom` enum('pieces','kg','g','l','ml','box','pack') NOT NULL DEFAULT 'pieces',
  `is_serialized` tinyint(1) NOT NULL DEFAULT '0',
  `min_downpayment_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `warranty_months` int NOT NULL DEFAULT '12',
  `avg_cost` decimal(12,2) NOT NULL DEFAULT '0.00',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `products_sku_unique` (`sku`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `products`
--

LOCK TABLES `products` WRITE;
/*!40000 ALTER TABLE `products` DISABLE KEYS */;
/*!40000 ALTER TABLE `products` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `promotions`
--

DROP TABLE IF EXISTS `promotions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `promotions` (
  `id` binary(16) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `start_date` timestamp NOT NULL,
  `end_date` timestamp NOT NULL,
  `discount_type` enum('PERCENTAGE','FIXED') NOT NULL,
  `discount_value` decimal(14,2) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_by` binary(16) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `promotions`
--

LOCK TABLES `promotions` WRITE;
/*!40000 ALTER TABLE `promotions` DISABLE KEYS */;
/*!40000 ALTER TABLE `promotions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `quotation_items`
--

DROP TABLE IF EXISTS `quotation_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `quotation_items` (
  `id` binary(16) NOT NULL,
  `quotation_id` binary(16) NOT NULL,
  `product_id` binary(16) NOT NULL,
  `quantity` int NOT NULL,
  `unit_price` decimal(12,2) NOT NULL,
  `discount_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `discount_type` varchar(20) DEFAULT NULL,
  `line_total` decimal(14,2) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `quotation_items`
--

LOCK TABLES `quotation_items` WRITE;
/*!40000 ALTER TABLE `quotation_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `quotation_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `quotations`
--

DROP TABLE IF EXISTS `quotations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `quotations` (
  `id` binary(16) NOT NULL,
  `reference_number` varchar(50) DEFAULT NULL,
  `branch_id` binary(16) NOT NULL,
  `customer_id` binary(16) DEFAULT NULL,
  `created_by` binary(16) NOT NULL,
  `subtotal` decimal(14,2) NOT NULL,
  `manual_discount` decimal(14,2) NOT NULL DEFAULT '0.00',
  `tax_amount` decimal(14,2) NOT NULL DEFAULT '0.00',
  `tax_details` text,
  `total` decimal(14,2) NOT NULL,
  `status` enum('DRAFT','ACCEPTED','EXPIRED','CONVERTED') NOT NULL DEFAULT 'DRAFT',
  `valid_until` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`),
  UNIQUE KEY `quotations_reference_number_unique` (`reference_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `quotations`
--

LOCK TABLES `quotations` WRITE;
/*!40000 ALTER TABLE `quotations` DISABLE KEYS */;
/*!40000 ALTER TABLE `quotations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `refunds`
--

DROP TABLE IF EXISTS `refunds`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `refunds` (
  `id` binary(16) NOT NULL,
  `contract_id` binary(16) NOT NULL,
  `customer_id` binary(16) NOT NULL,
  `amount` decimal(14,2) NOT NULL,
  `reason` varchar(255) NOT NULL,
  `approved_by` binary(16) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `refunds`
--

LOCK TABLES `refunds` WRITE;
/*!40000 ALTER TABLE `refunds` DISABLE KEYS */;
/*!40000 ALTER TABLE `refunds` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `returns`
--

DROP TABLE IF EXISTS `returns`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `returns` (
  `id` binary(16) NOT NULL,
  `sale_id` binary(16) NOT NULL,
  `sale_item_id` binary(16) NOT NULL,
  `serial_item_id` binary(16) DEFAULT NULL,
  `type` enum('CUSTOMER_RETURN','DEFECTIVE','WARRANTY') NOT NULL,
  `disposition` enum('RESTOCKED','DEFECTIVE_DEPOT','SUPPLIER_RETURNED','WRITTEN_OFF') NOT NULL,
  `reason` text NOT NULL,
  `refund_amount` varchar(20) NOT NULL DEFAULT '0.00',
  `refund_mode` enum('CASH','STORE_CREDIT','NONE') NOT NULL DEFAULT 'NONE',
  `processed_by` binary(16) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `returns`
--

LOCK TABLES `returns` WRITE;
/*!40000 ALTER TABLE `returns` DISABLE KEYS */;
/*!40000 ALTER TABLE `returns` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `role_permissions`
--

DROP TABLE IF EXISTS `role_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `role_permissions` (
  `role_id` binary(16) NOT NULL,
  `permission_id` binary(16) NOT NULL,
  PRIMARY KEY (`role_id`,`permission_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `role_permissions`
--

LOCK TABLES `role_permissions` WRITE;
/*!40000 ALTER TABLE `role_permissions` DISABLE KEYS */;
INSERT INTO `role_permissions` VALUES (_binary 'û\”=Å\„sÉπ2©L+h\·e',_binary 'û\”=Äq–¨\”8É¥>\''),(_binary 'û\”=Å\„sÉπ2©L+h\·e',_binary 'û\”=Äµqÿπ\‚¢Ñ\Ô?2'),(_binary 'û\”=Å\„sÉπ2©L+h\·e',_binary 'û\”=Ä∫wz°\·ˇ≤\€6V'),(_binary 'û\”=Å\„sÉπ2©L+h\·e',_binary 'û\”=Äøs∂ô=1\‚É\ŸA'),(_binary 'û\”=Å\„sÉπ2©L+h\·e',_binary 'û\”=Ä\ƒsôΩ\ÚÉ\‚\ı\◊Ww'),(_binary 'û\”=Å\„sÉπ2©L+h\·e',_binary 'û\”=Ä\ vΩ`\—c±Yîù'),(_binary 'û\”=Å\„sÉπ2©L+h\·e',_binary 'û\”=Ä\Œw\Ôî\ÒKà\Ôâ'),(_binary 'û\”=Å\„sÉπ2©L+h\·e',_binary 'û\”=Ä\“v+õMh\ÂW•'),(_binary 'û\”=Å\„sÉπ2©L+h\·e',_binary 'û\”=Ä\◊r´ñ≤òò::±\0'),(_binary 'û\”=Å\„sÉπ2©L+h\·e',_binary 'û\”=Ä\‹swíMQÆ)\Ê\Ô™'),(_binary 'û\”=Å\„sÉπ2©L+h\·e',_binary 'û\”=Ä\·wOøT\”!\ﬂ\“'),(_binary 'û\”=Å\„sÉπ2©L+h\·e',_binary 'û\”=Ä\Âtç∂\”\–z\„¨.'),(_binary 'û\”=Å\„sÉπ2©L+h\·e',_binary 'û\”=Ä\Èv_±ªSk\Ú?Øu'),(_binary 'û\”=Å\„sÉπ2©L+h\·e',_binary 'û\”=Ä\ÌrKä¯@Wπ\»'),(_binary 'û\”=Å\„sÉπ2©L+h\·e',_binary 'û\”=Ä\ÒsíòQê4\“bØe'),(_binary 'û\”=Å\„sÉπ2©L+h\·e',_binary 'û\”=Ä\ıpÑ€Ø\Z¯ƒ¥\◊'),(_binary 'û\”=Å\„sÉπ2©L+h\·e',_binary 'û\”=Ä˙u~Ñ¢âA\'`\‡É'),(_binary 'û\”=Å\„sÉπ2©L+h\·e',_binary 'û\”=Äˇs¸µ\ﬁU≤g1&'),(_binary 'û\”=Å\„sÉπ2©L+h\·e',_binary 'û\”=ÅpKí_M£__b%'),(_binary 'û\”=Å\„sÉπ2©L+h\·e',_binary 'û\”=Åv\nìˇ}zë'),(_binary 'û\”=Å\„sÉπ2©L+h\·e',_binary 'û\”=Å\nqxÖ§u\÷}#\‚\Ÿ'),(_binary 'û\”=Å\„sÉπ2©L+h\·e',_binary 'û\”=Årﬁè\Ûg˛∞&∂µ'),(_binary 'û\”=Å\„sÉπ2©L+h\·e',_binary 'û\”=Åwàè\ÿ\ÛêE'),(_binary 'û\”=Å\„sÉπ2©L+h\·e',_binary 'û\”=Åp5ÖGø*>ûb'),(_binary 'û\”=Å\„sÉπ2©L+h\·e',_binary 'û\”=ÅvŒâïn\r\¬\Ÿ\◊'),(_binary 'û\”=Å\„sÉπ2©L+h\·e',_binary 'û\”=Å rg¶û∫d©\≈('),(_binary 'û\”=Å\„sÉπ2©L+h\·e',_binary 'û\”=Å#rß®49û\À$'),(_binary 'û\”=Å\„sÉπ2©L+h\·e',_binary 'û\”=Å\'sÿºÖC\ÈCü\r'),(_binary 'û\”=Å\„sÉπ2©L+h\·e',_binary 'û\”=Å+s\Zã\ﬂKaïæ'),(_binary 'û\”=Å\„sÉπ2©L+h\·e',_binary 'û\”=Å/r6ª˛¥ø[\ƒ\€\À'),(_binary 'û\”=Å\„sÉπ2©L+h\·e',_binary 'û\”=Å3q˚íé Yù:'),(_binary 'û\”=Å\„sÉπ2©L+h\·e',_binary 'û\”=Å7v\Í†¿&`º_ƒà'),(_binary 'û\”=Å\„sÉπ2©L+h\·e',_binary 'û\”=Å:v{è\Í±¡\˜B_\√'),(_binary 'û\”=Å\„sÉπ2©L+h\·e',_binary 'û\”=Å>w9±¢*rç\”)'),(_binary 'û\”=Å\„sÉπ2©L+h\·e',_binary 'û\”=ÅBt)´©Äõ\—\Û\ÙF'),(_binary 'û\”=Å\„sÉπ2©L+h\·e',_binary 'û\”=ÅFsº\ﬁ@*s}>Å'),(_binary 'û\”=Å\„sÉπ2©L+h\·e',_binary 'û\”=ÅJu∏ºÆﬁ°?S'),(_binary 'û\”=Å\„sÉπ2©L+h\·e',_binary 'û\”=ÅNt>±\∆0óy\0°'),(_binary 'û\”=Å\„sÉπ2©L+h\·e',_binary 'û\”=ÅWu_ù£\—˝n±'),(_binary 'û\”=Å\„sÉπ2©L+h\·e',_binary 'û\”=Å[qøíD$\‘7'),(_binary 'û\”=Å\„sÉπ2©L+h\·e',_binary 'û\”=Å_q\Èç“≤˚°:*'),(_binary 'û\”=Å\„sÉπ2©L+h\·e',_binary 'û\”=ÅerŸ¨Æ˙\ÁËáñ9'),(_binary 'û\”=Å\„sÉπ2©L+h\·e',_binary 'û\”=Åku~¥º∑(\Ûli}'),(_binary 'û\”=Å\„sÉπ2©L+h\·e',_binary 'û\”=Åsu*£¸@´Ö¯'),(_binary 'û\”=Å\„sÉπ2©L+h\·e',_binary 'û\”=Åyvd≥’ìxC∂¶\Ã'),(_binary 'û\”=Å\„sÉπ2©L+h\·e',_binary 'û\”=ÅÄrä≤ú˙#t¡'),(_binary 'û\”=Å\„sÉπ2©L+h\·e',_binary 'û\”=ÅÜuY¨ª`\Ê\⁄\ÌE'),(_binary 'û\”=Å\„sÉπ2©L+h\·e',_binary 'û\”=ÅäpÔ£¢ßWh:a'),(_binary 'û\”=Å\„sÉπ2©L+h\·e',_binary 'û\”=Åétì≠\Ë\·Wù\—r'),(_binary 'û\”=Å\„sÉπ2©L+h\·e',_binary 'û\”=Åíu\Áå>\ﬁu\Ÿû'),(_binary 'û\”=Å\„sÉπ2©L+h\·e',_binary 'û\”=ÅñvôªXˇ\“aÑT'),(_binary 'û\”=Å\„sÉπ2©L+h\·e',_binary 'û\”=Åöu[úõ∆ô#}u'),(_binary 'û\”=Å\„sÉπ2©L+h\·e',_binary 'û\”=Åûv-ùÆ\‡∞Wâ¯'),(_binary 'û\”=Å\„sÉπ2©L+h\·e',_binary 'û\”=Å£rŸ¨I\˜=hçm '),(_binary 'û\”=Å\„sÉπ2©L+h\·e',_binary 'û\”=Åßp*éE4F!ç'),(_binary 'û\”=Å\„sÉπ2©L+h\·e',_binary 'û\”=Å™sàó~Ü_\"'),(_binary 'û\”=Å\„sÉπ2©L+h\·e',_binary 'û\”=ÅØwÃ∑#yr˛C˙'),(_binary 'û\”=Å\„sÉπ2©L+h\·e',_binary 'û\”=Å≤po¢Æ\Á%C\◊\‚¢'),(_binary 'û\”=Å\„sÉπ2©L+h\·e',_binary 'û\”=Å∑péágÆ\Àv?U('),(_binary 'û\”=Å\„sÉπ2©L+h\·e',_binary 'û\”=ÅªrÕò#qÖã\‰}'),(_binary 'û\”=Å\„sÉπ2©L+h\·e',_binary 'û\”=Åøt›¥¯gåîàsé'),(_binary 'û\”=Å\„sÉπ2©L+h\·e',_binary 'û\”=Å\√qKß6∞zl¢Ω'),(_binary 'û\”=Å\„sÉπ2©L+h\·e',_binary 'û\”=Å\«v®Õò\Û\Û\k\\'),(_binary 'û\”=Å\„sÉπ2©L+h\·e',_binary 'û\”=Å\Àqﬂ†7pÉD\ÿV'),(_binary 'û\”=Å\„sÉπ2©L+h\·e',_binary 'û\”=Å\œs™ß\“’ñú´9'),(_binary 'û\”=Å\„sÉπ2©L+h\·e',_binary 'û\”=Å\”pÀï\Û;\ÛIH¡\ÿ'),(_binary 'û\”=Å\„sÉπ2©L+h\·e',_binary 'û\”=Å\÷vÿ´\Ÿˇâq V'),(_binary 'û\”=Å\„sÉπ2©L+h\·e',_binary 'û\”=Å\⁄vØ\ÿ\«=ª\Â≥'),(_binary 'û\”=Å\„sÉπ2©L+h\·e',_binary 'û\”=Å\ﬁt*¨¥í[?8\Ùl'),(_binary 'û\”=Çˇvüµ˛\Ò@KK∏}',_binary 'û\”=Äq–¨\”8É¥>\''),(_binary 'û\”=Çˇvüµ˛\Ò@KK∏}',_binary 'û\”=Äµqÿπ\‚¢Ñ\Ô?2'),(_binary 'û\”=Çˇvüµ˛\Ò@KK∏}',_binary 'û\”=Ä∫wz°\·ˇ≤\€6V'),(_binary 'û\”=Çˇvüµ˛\Ò@KK∏}',_binary 'û\”=Äøs∂ô=1\‚É\ŸA'),(_binary 'û\”=Çˇvüµ˛\Ò@KK∏}',_binary 'û\”=Ä\ƒsôΩ\ÚÉ\‚\ı\◊Ww'),(_binary 'û\”=Çˇvüµ˛\Ò@KK∏}',_binary 'û\”=Ä\ vΩ`\—c±Yîù'),(_binary 'û\”=Çˇvüµ˛\Ò@KK∏}',_binary 'û\”=Ä\Œw\Ôî\ÒKà\Ôâ'),(_binary 'û\”=Çˇvüµ˛\Ò@KK∏}',_binary 'û\”=Ä\“v+õMh\ÂW•'),(_binary 'û\”=Çˇvüµ˛\Ò@KK∏}',_binary 'û\”=Ä\◊r´ñ≤òò::±\0'),(_binary 'û\”=Çˇvüµ˛\Ò@KK∏}',_binary 'û\”=Ä\‹swíMQÆ)\Ê\Ô™'),(_binary 'û\”=Çˇvüµ˛\Ò@KK∏}',_binary 'û\”=Ä\·wOøT\”!\ﬂ\“'),(_binary 'û\”=Çˇvüµ˛\Ò@KK∏}',_binary 'û\”=Ä\Âtç∂\”\–z\„¨.'),(_binary 'û\”=Çˇvüµ˛\Ò@KK∏}',_binary 'û\”=Ä\Èv_±ªSk\Ú?Øu'),(_binary 'û\”=Çˇvüµ˛\Ò@KK∏}',_binary 'û\”=Ä\ÌrKä¯@Wπ\»'),(_binary 'û\”=Çˇvüµ˛\Ò@KK∏}',_binary 'û\”=Ä\ÒsíòQê4\“bØe'),(_binary 'û\”=Çˇvüµ˛\Ò@KK∏}',_binary 'û\”=Ä\ıpÑ€Ø\Z¯ƒ¥\◊'),(_binary 'û\”=Çˇvüµ˛\Ò@KK∏}',_binary 'û\”=Ä˙u~Ñ¢âA\'`\‡É'),(_binary 'û\”=Çˇvüµ˛\Ò@KK∏}',_binary 'û\”=Äˇs¸µ\ﬁU≤g1&'),(_binary 'û\”=Çˇvüµ˛\Ò@KK∏}',_binary 'û\”=ÅpKí_M£__b%'),(_binary 'û\”=Çˇvüµ˛\Ò@KK∏}',_binary 'û\”=Åv\nìˇ}zë'),(_binary 'û\”=Çˇvüµ˛\Ò@KK∏}',_binary 'û\”=Å\nqxÖ§u\÷}#\‚\Ÿ'),(_binary 'û\”=Çˇvüµ˛\Ò@KK∏}',_binary 'û\”=Årﬁè\Ûg˛∞&∂µ'),(_binary 'û\”=Çˇvüµ˛\Ò@KK∏}',_binary 'û\”=Åwàè\ÿ\ÛêE'),(_binary 'û\”=Çˇvüµ˛\Ò@KK∏}',_binary 'û\”=Åp5ÖGø*>ûb'),(_binary 'û\”=Çˇvüµ˛\Ò@KK∏}',_binary 'û\”=ÅvŒâïn\r\¬\Ÿ\◊'),(_binary 'û\”=Çˇvüµ˛\Ò@KK∏}',_binary 'û\”=Å rg¶û∫d©\≈('),(_binary 'û\”=Çˇvüµ˛\Ò@KK∏}',_binary 'û\”=Å#rß®49û\À$'),(_binary 'û\”=Çˇvüµ˛\Ò@KK∏}',_binary 'û\”=Å\'sÿºÖC\ÈCü\r'),(_binary 'û\”=Çˇvüµ˛\Ò@KK∏}',_binary 'û\”=Å+s\Zã\ﬂKaïæ'),(_binary 'û\”=Çˇvüµ˛\Ò@KK∏}',_binary 'û\”=Å/r6ª˛¥ø[\ƒ\€\À'),(_binary 'û\”=Çˇvüµ˛\Ò@KK∏}',_binary 'û\”=Å3q˚íé Yù:'),(_binary 'û\”=Çˇvüµ˛\Ò@KK∏}',_binary 'û\”=Å7v\Í†¿&`º_ƒà'),(_binary 'û\”=Çˇvüµ˛\Ò@KK∏}',_binary 'û\”=Å:v{è\Í±¡\˜B_\√'),(_binary 'û\”=Çˇvüµ˛\Ò@KK∏}',_binary 'û\”=Å>w9±¢*rç\”)'),(_binary 'û\”=Çˇvüµ˛\Ò@KK∏}',_binary 'û\”=ÅBt)´©Äõ\—\Û\ÙF'),(_binary 'û\”=Çˇvüµ˛\Ò@KK∏}',_binary 'û\”=ÅFsº\ﬁ@*s}>Å'),(_binary 'û\”=Çˇvüµ˛\Ò@KK∏}',_binary 'û\”=ÅJu∏ºÆﬁ°?S'),(_binary 'û\”=Çˇvüµ˛\Ò@KK∏}',_binary 'û\”=ÅNt>±\∆0óy\0°'),(_binary 'û\”=Çˇvüµ˛\Ò@KK∏}',_binary 'û\”=ÅWu_ù£\—˝n±'),(_binary 'û\”=Çˇvüµ˛\Ò@KK∏}',_binary 'û\”=Å[qøíD$\‘7'),(_binary 'û\”=Çˇvüµ˛\Ò@KK∏}',_binary 'û\”=Å_q\Èç“≤˚°:*'),(_binary 'û\”=Çˇvüµ˛\Ò@KK∏}',_binary 'û\”=ÅerŸ¨Æ˙\ÁËáñ9'),(_binary 'û\”=Çˇvüµ˛\Ò@KK∏}',_binary 'û\”=Åku~¥º∑(\Ûli}'),(_binary 'û\”=Çˇvüµ˛\Ò@KK∏}',_binary 'û\”=Åsu*£¸@´Ö¯'),(_binary 'û\”=Çˇvüµ˛\Ò@KK∏}',_binary 'û\”=Åyvd≥’ìxC∂¶\Ã'),(_binary 'û\”=Çˇvüµ˛\Ò@KK∏}',_binary 'û\”=ÅÄrä≤ú˙#t¡'),(_binary 'û\”=Çˇvüµ˛\Ò@KK∏}',_binary 'û\”=ÅÜuY¨ª`\Ê\⁄\ÌE'),(_binary 'û\”=Çˇvüµ˛\Ò@KK∏}',_binary 'û\”=ÅäpÔ£¢ßWh:a'),(_binary 'û\”=Çˇvüµ˛\Ò@KK∏}',_binary 'û\”=Åétì≠\Ë\·Wù\—r'),(_binary 'û\”=Çˇvüµ˛\Ò@KK∏}',_binary 'û\”=Åíu\Áå>\ﬁu\Ÿû'),(_binary 'û\”=Çˇvüµ˛\Ò@KK∏}',_binary 'û\”=ÅñvôªXˇ\“aÑT'),(_binary 'û\”=Çˇvüµ˛\Ò@KK∏}',_binary 'û\”=Åöu[úõ∆ô#}u'),(_binary 'û\”=Çˇvüµ˛\Ò@KK∏}',_binary 'û\”=Åûv-ùÆ\‡∞Wâ¯'),(_binary 'û\”=Çˇvüµ˛\Ò@KK∏}',_binary 'û\”=Å£rŸ¨I\˜=hçm '),(_binary 'û\”=Çˇvüµ˛\Ò@KK∏}',_binary 'û\”=Åßp*éE4F!ç'),(_binary 'û\”=Çˇvüµ˛\Ò@KK∏}',_binary 'û\”=Å™sàó~Ü_\"'),(_binary 'û\”=Çˇvüµ˛\Ò@KK∏}',_binary 'û\”=ÅØwÃ∑#yr˛C˙'),(_binary 'û\”=Çˇvüµ˛\Ò@KK∏}',_binary 'û\”=Å≤po¢Æ\Á%C\◊\‚¢'),(_binary 'û\”=Çˇvüµ˛\Ò@KK∏}',_binary 'û\”=Å∑péágÆ\Àv?U('),(_binary 'û\”=Çˇvüµ˛\Ò@KK∏}',_binary 'û\”=ÅªrÕò#qÖã\‰}'),(_binary 'û\”=Çˇvüµ˛\Ò@KK∏}',_binary 'û\”=Åøt›¥¯gåîàsé'),(_binary 'û\”=Çˇvüµ˛\Ò@KK∏}',_binary 'û\”=Å\√qKß6∞zl¢Ω'),(_binary 'û\”=Çˇvüµ˛\Ò@KK∏}',_binary 'û\”=Å\«v®Õò\Û\Û\k\\'),(_binary 'û\”=Çˇvüµ˛\Ò@KK∏}',_binary 'û\”=Å\Àqﬂ†7pÉD\ÿV'),(_binary 'û\”=Çˇvüµ˛\Ò@KK∏}',_binary 'û\”=Å\œs™ß\“’ñú´9'),(_binary 'û\”=Çˇvüµ˛\Ò@KK∏}',_binary 'û\”=Å\”pÀï\Û;\ÛIH¡\ÿ'),(_binary 'û\”=Çˇvüµ˛\Ò@KK∏}',_binary 'û\”=Å\÷vÿ´\Ÿˇâq V'),(_binary 'û\”=Çˇvüµ˛\Ò@KK∏}',_binary 'û\”=Å\⁄vØ\ÿ\«=ª\Â≥'),(_binary 'û\”=Çˇvüµ˛\Ò@KK∏}',_binary 'û\”=Å\ﬁt*¨¥í[?8\Ùl'),(_binary 'û\”=Ñs€ò\Ò˚)=@Ç',_binary 'û\”=Ä\Èv_±ªSk\Ú?Øu'),(_binary 'û\”=Ñs€ò\Ò˚)=@Ç',_binary 'û\”=Ä\ÌrKä¯@Wπ\»'),(_binary 'û\”=Ñs€ò\Ò˚)=@Ç',_binary 'û\”=Ä\ÒsíòQê4\“bØe'),(_binary 'û\”=Ñs€ò\Ò˚)=@Ç',_binary 'û\”=Ä˙u~Ñ¢âA\'`\‡É'),(_binary 'û\”=Ñs€ò\Ò˚)=@Ç',_binary 'û\”=Å\nqxÖ§u\÷}#\‚\Ÿ'),(_binary 'û\”=Ñs€ò\Ò˚)=@Ç',_binary 'û\”=Å[qøíD$\‘7'),(_binary 'û\”=Ñs€ò\Ò˚)=@Ç',_binary 'û\”=Å_q\Èç“≤˚°:*'),(_binary 'û\”=Ñs€ò\Ò˚)=@Ç',_binary 'û\”=ÅerŸ¨Æ˙\ÁËáñ9'),(_binary 'û\”=Ñs€ò\Ò˚)=@Ç',_binary 'û\”=Åku~¥º∑(\Ûli}'),(_binary 'û\”=Ñs€ò\Ò˚)=@Ç',_binary 'û\”=Å≤po¢Æ\Á%C\◊\‚¢'),(_binary 'û\”=Ñs€ò\Ò˚)=@Ç',_binary 'û\”=Å∑péágÆ\Àv?U('),(_binary 'û\”=ÑOuìëÍåÅ=~Ω7',_binary 'û\”=Ä\Èv_±ªSk\Ú?Øu'),(_binary 'û\”=ÑOuìëÍåÅ=~Ω7',_binary 'û\”=Ä\ÌrKä¯@Wπ\»'),(_binary 'û\”=ÑOuìëÍåÅ=~Ω7',_binary 'û\”=Ä˙u~Ñ¢âA\'`\‡É'),(_binary 'û\”=ÑOuìëÍåÅ=~Ω7',_binary 'û\”=Å[qøíD$\‘7'),(_binary 'û\”=ÑOuìëÍåÅ=~Ω7',_binary 'û\”=Åku~¥º∑(\Ûli}'),(_binary 'û\”=ÑOuìëÍåÅ=~Ω7',_binary 'û\”=Åsu*£¸@´Ö¯'),(_binary 'û\”=ÑOuìëÍåÅ=~Ω7',_binary 'û\”=Åyvd≥’ìxC∂¶\Ã'),(_binary 'û\”=ÑOuìëÍåÅ=~Ω7',_binary 'û\”=ÅñvôªXˇ\“aÑT'),(_binary 'û\”=ÑOuìëÍåÅ=~Ω7',_binary 'û\”=Åöu[úõ∆ô#}u'),(_binary 'û\”=ÑOuìëÍåÅ=~Ω7',_binary 'û\”=Å≤po¢Æ\Á%C\◊\‚¢'),(_binary 'û\”=ÑOuìëÍåÅ=~Ω7',_binary 'û\”=Å∑péágÆ\Àv?U('),(_binary 'û\”=ÑOuìëÍåÅ=~Ω7',_binary 'û\”=Å\œs™ß\“’ñú´9'),(_binary 'û\”=ÑOuìëÍåÅ=~Ω7',_binary 'û\”=Å\”pÀï\Û;\ÛIH¡\ÿ');
/*!40000 ALTER TABLE `role_permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `id` binary(16) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `level` int NOT NULL DEFAULT '10',
  PRIMARY KEY (`id`),
  UNIQUE KEY `roles_name_unique` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roles`
--

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
INSERT INTO `roles` VALUES (_binary 'û\”=Å\„sÉπ2©L+h\·e','Super Admin','Full system access including destructive actions.',100),(_binary 'û\”=Çˇvüµ˛\Ò@KK∏}','Owner','Business owner with full access to reporting and operations.',90),(_binary 'û\”=Ñs€ò\Ò˚)=@Ç','Sales Rep','Handles customer acquisition and sales creation.',50),(_binary 'û\”=ÑOuìëÍåÅ=~Ω7','Front Desk','Handles walk-ins, payments, and basic service operations.',30);
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `routes`
--

DROP TABLE IF EXISTS `routes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `routes` (
  `id` binary(16) NOT NULL,
  `branch_id` binary(16) NOT NULL,
  `code` varchar(50) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `routes`
--

LOCK TABLES `routes` WRITE;
/*!40000 ALTER TABLE `routes` DISABLE KEYS */;
/*!40000 ALTER TABLE `routes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sale_items`
--

DROP TABLE IF EXISTS `sale_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sale_items` (
  `id` binary(16) NOT NULL,
  `sale_id` binary(16) NOT NULL,
  `product_id` binary(16) NOT NULL,
  `serial_item_id` binary(16) DEFAULT NULL,
  `quantity` int NOT NULL,
  `unit_cost` decimal(12,2) NOT NULL DEFAULT '0.00',
  `unit_price` decimal(12,2) NOT NULL,
  `discount_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `discount_type` varchar(20) DEFAULT NULL,
  `line_total` decimal(14,2) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sale_items`
--

LOCK TABLES `sale_items` WRITE;
/*!40000 ALTER TABLE `sale_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `sale_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sales`
--

DROP TABLE IF EXISTS `sales`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sales` (
  `id` binary(16) NOT NULL,
  `reference_number` varchar(50) DEFAULT NULL,
  `offline_receipt_number` varchar(50) DEFAULT NULL,
  `branch_id` binary(16) NOT NULL,
  `customer_id` binary(16) DEFAULT NULL,
  `trip_id` binary(16) DEFAULT NULL,
  `pre_order_id` binary(16) DEFAULT NULL,
  `created_by` binary(16) NOT NULL,
  `sale_type` enum('DIRECT','INSTALLMENT') NOT NULL,
  `payment_mode` enum('CASH','CARD','TRANSFER') NOT NULL DEFAULT 'CASH',
  `subtotal` decimal(14,2) NOT NULL,
  `promotion_id` binary(16) DEFAULT NULL,
  `promotion_discount` decimal(14,2) NOT NULL DEFAULT '0.00',
  `manual_discount` decimal(14,2) NOT NULL DEFAULT '0.00',
  `downpayment` decimal(14,2) NOT NULL DEFAULT '0.00',
  `tax_amount` decimal(14,2) NOT NULL DEFAULT '0.00',
  `tax_details` text,
  `total` decimal(14,2) NOT NULL,
  `gps_lat` decimal(10,8) DEFAULT NULL,
  `gps_lng` decimal(11,8) DEFAULT NULL,
  `status` enum('PENDING','COMPLETED','CANCELLED','RETURNED') NOT NULL DEFAULT 'COMPLETED',
  `idempotency_key` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`),
  UNIQUE KEY `sales_reference_number_unique` (`reference_number`),
  UNIQUE KEY `sales_idempotency_key_unique` (`idempotency_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sales`
--

LOCK TABLES `sales` WRITE;
/*!40000 ALTER TABLE `sales` DISABLE KEYS */;
/*!40000 ALTER TABLE `sales` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `serial_items`
--

DROP TABLE IF EXISTS `serial_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `serial_items` (
  `id` binary(16) NOT NULL,
  `product_id` binary(16) NOT NULL,
  `intake_item_id` binary(16) DEFAULT NULL,
  `warehouse_id` binary(16) DEFAULT NULL,
  `serial_number` varchar(150) NOT NULL,
  `status` enum('IN_STOCK','ON_TRIP','SOLD','RETURNED','LOST','DEFECTIVE','UNDER_WARRANTY') NOT NULL DEFAULT 'IN_STOCK',
  `created_at` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `serial_items`
--

LOCK TABLES `serial_items` WRITE;
/*!40000 ALTER TABLE `serial_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `serial_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sms_logs`
--

DROP TABLE IF EXISTS `sms_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sms_logs` (
  `id` binary(16) NOT NULL,
  `customer_id` binary(16) NOT NULL,
  `trigger_event` enum('SALE_CREATED','COLLECTION_RECEIPT','PAYMENT_OVERDUE','CUSTOM','DIRECT_SALE_CREATED') NOT NULL,
  `reference_id` binary(16) DEFAULT NULL,
  `phone_number` varchar(50) NOT NULL,
  `message_body` text NOT NULL,
  `status` enum('PENDING','SENT','FAILED') NOT NULL DEFAULT 'PENDING',
  `provider_response` text,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `sent_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sms_logs`
--

LOCK TABLES `sms_logs` WRITE;
/*!40000 ALTER TABLE `sms_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `sms_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sms_templates`
--

DROP TABLE IF EXISTS `sms_templates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sms_templates` (
  `id` binary(16) NOT NULL,
  `trigger_event` enum('SALE_CREATED','COLLECTION_RECEIPT','PAYMENT_OVERDUE','DIRECT_SALE_CREATED') NOT NULL,
  `body_template` text NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sms_templates_trigger_event_unique` (`trigger_event`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sms_templates`
--

LOCK TABLES `sms_templates` WRITE;
/*!40000 ALTER TABLE `sms_templates` DISABLE KEYS */;
INSERT INTO `sms_templates` VALUES (_binary 'û\”=Ñ\Ïv¸πÖr£Cÿ∏','SALE_CREATED','Dear {{name}}, thank you for purchasing {{product_name}}! We\'ve received your downpayment of Rs.{{downpayment}}. {{upcoming_dues_message}} Thank you for choosing {{company_name}}!',1,'2026-06-17 01:41:24','2026-06-17 01:41:24'),(_binary 'û\”=Ñ\r\ÂÜ\‡|\„O \Ó\0','COLLECTION_RECEIPT','Dear {{name}}, we have received your payment of Rs.{{paid_amount}}. Your remaining balance is Rs.{{balance}}. - {{company_name}} ({{branch_phone}})',1,'2026-06-17 01:41:24','2026-06-17 01:41:24'),(_binary 'û\”=Ñ\ıv˘≥w˛\Œ#C\˜\◊','PAYMENT_OVERDUE','Dear {{name}}, your payment of Rs.{{missed_amount}} due on {{due_date}} is overdue. A penalty of Rs.{{penalty_added}} has been added. Pending total: Rs.{{total_pending}}. Call {{branch_phone}}. - {{company_name}}',1,'2026-06-17 01:41:24','2026-06-17 01:41:24'),(_binary 'û\”=Ñ˘wˇÜµCä*Yì','DIRECT_SALE_CREATED','Dear {{name}}, thank you for your direct purchase of {{product_name}}. We have received your payment of Rs.{{paid_amount}}. Thank you for choosing {{company_name}}!',1,'2026-06-17 01:41:24','2026-06-17 01:41:24');
/*!40000 ALTER TABLE `sms_templates` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `staff_wallet_transactions`
--

DROP TABLE IF EXISTS `staff_wallet_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `staff_wallet_transactions` (
  `id` binary(16) NOT NULL,
  `wallet_id` binary(16) NOT NULL,
  `trip_id` binary(16) DEFAULT NULL,
  `discrepancy_id` binary(16) DEFAULT NULL,
  `type` enum('CASH_SHORTAGE','STOCK_SHORTAGE','REPAYMENT','SALARY_DEDUCTION','OTHER') NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `description` text NOT NULL,
  `snapshot_data` json DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `staff_wallet_transactions`
--

LOCK TABLES `staff_wallet_transactions` WRITE;
/*!40000 ALTER TABLE `staff_wallet_transactions` DISABLE KEYS */;
/*!40000 ALTER TABLE `staff_wallet_transactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `staff_wallets`
--

DROP TABLE IF EXISTS `staff_wallets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `staff_wallets` (
  `id` binary(16) NOT NULL,
  `user_id` binary(16) NOT NULL,
  `branch_id` binary(16) NOT NULL,
  `balance` decimal(12,2) NOT NULL DEFAULT '0.00',
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `staff_wallets`
--

LOCK TABLES `staff_wallets` WRITE;
/*!40000 ALTER TABLE `staff_wallets` DISABLE KEYS */;
/*!40000 ALTER TABLE `staff_wallets` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `stock_transfer_items`
--

DROP TABLE IF EXISTS `stock_transfer_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `stock_transfer_items` (
  `id` binary(16) NOT NULL,
  `transfer_id` binary(16) NOT NULL,
  `product_id` binary(16) NOT NULL,
  `quantity` int NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stock_transfer_items`
--

LOCK TABLES `stock_transfer_items` WRITE;
/*!40000 ALTER TABLE `stock_transfer_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `stock_transfer_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `stock_transfer_serials`
--

DROP TABLE IF EXISTS `stock_transfer_serials`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `stock_transfer_serials` (
  `id` binary(16) NOT NULL,
  `transfer_item_id` binary(16) NOT NULL,
  `serial_id` binary(16) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stock_transfer_serials`
--

LOCK TABLES `stock_transfer_serials` WRITE;
/*!40000 ALTER TABLE `stock_transfer_serials` DISABLE KEYS */;
/*!40000 ALTER TABLE `stock_transfer_serials` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `stock_transfers`
--

DROP TABLE IF EXISTS `stock_transfers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `stock_transfers` (
  `id` binary(16) NOT NULL,
  `reference_number` varchar(50) NOT NULL,
  `source_warehouse_id` binary(16) NOT NULL,
  `destination_warehouse_id` binary(16) NOT NULL,
  `transferred_at` timestamp NOT NULL DEFAULT (now()),
  `transferred_by` binary(16) NOT NULL,
  `notes` text,
  PRIMARY KEY (`id`),
  UNIQUE KEY `stock_transfers_reference_number_unique` (`reference_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stock_transfers`
--

LOCK TABLES `stock_transfers` WRITE;
/*!40000 ALTER TABLE `stock_transfers` DISABLE KEYS */;
/*!40000 ALTER TABLE `stock_transfers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `supplier_branch_balances`
--

DROP TABLE IF EXISTS `supplier_branch_balances`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `supplier_branch_balances` (
  `id` binary(16) NOT NULL,
  `supplier_id` binary(16) NOT NULL,
  `branch_id` binary(16) NOT NULL,
  `opening_balance` decimal(14,2) NOT NULL DEFAULT '0.00',
  `balance_due` decimal(14,2) NOT NULL DEFAULT '0.00',
  `total_paid` decimal(14,2) NOT NULL DEFAULT '0.00',
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `supplier_branch_balances`
--

LOCK TABLES `supplier_branch_balances` WRITE;
/*!40000 ALTER TABLE `supplier_branch_balances` DISABLE KEYS */;
/*!40000 ALTER TABLE `supplier_branch_balances` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `supplier_ledger`
--

DROP TABLE IF EXISTS `supplier_ledger`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `supplier_ledger` (
  `id` binary(16) NOT NULL,
  `supplier_id` binary(16) NOT NULL,
  `branch_id` binary(16) NOT NULL,
  `transaction_type` enum('OPENING_BALANCE','INTAKE_BILL','PAYMENT','ADJUSTMENT') NOT NULL,
  `reference_id` binary(16) DEFAULT NULL,
  `amount` decimal(14,2) NOT NULL,
  `balance_after` decimal(14,2) NOT NULL,
  `notes` text,
  `created_by` binary(16) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `supplier_ledger`
--

LOCK TABLES `supplier_ledger` WRITE;
/*!40000 ALTER TABLE `supplier_ledger` DISABLE KEYS */;
/*!40000 ALTER TABLE `supplier_ledger` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `suppliers`
--

DROP TABLE IF EXISTS `suppliers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `suppliers` (
  `id` binary(16) NOT NULL,
  `name` varchar(255) NOT NULL,
  `contact_person` varchar(255) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `address` text,
  `notes` text,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `suppliers`
--

LOCK TABLES `suppliers` WRITE;
/*!40000 ALTER TABLE `suppliers` DISABLE KEYS */;
/*!40000 ALTER TABLE `suppliers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sync_conflicts`
--

DROP TABLE IF EXISTS `sync_conflicts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sync_conflicts` (
  `id` binary(16) NOT NULL,
  `branch_id` binary(16) NOT NULL,
  `user_id` binary(16) NOT NULL,
  `error_type` enum('DOUBLE_SALE','PHANTOM_STOCK','OVER_COLLECTION','OTHER') NOT NULL,
  `error_message` text NOT NULL,
  `raw_payload` json NOT NULL,
  `status` enum('PENDING','RESOLVED','DISCARDED') NOT NULL DEFAULT 'PENDING',
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `resolved_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sync_conflicts`
--

LOCK TABLES `sync_conflicts` WRITE;
/*!40000 ALTER TABLE `sync_conflicts` DISABLE KEYS */;
/*!40000 ALTER TABLE `sync_conflicts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `system_settings`
--

DROP TABLE IF EXISTS `system_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `system_settings` (
  `setting_key` varchar(100) NOT NULL,
  `setting_value` text,
  `updated_by` binary(16) DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `system_settings`
--

LOCK TABLES `system_settings` WRITE;
/*!40000 ALTER TABLE `system_settings` DISABLE KEYS */;
INSERT INTO `system_settings` VALUES ('company_name','Master House',_binary 'û\”=Ñèq‹∂\‚\€E(b\ÈJ','2026-06-17 01:41:24'),('enable_overdue_penalties','true',_binary 'û\”=Ñèq‹∂\‚\€E(b\ÈJ','2026-06-17 01:41:24');
/*!40000 ALTER TABLE `system_settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `taxes`
--

DROP TABLE IF EXISTS `taxes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `taxes` (
  `id` binary(16) NOT NULL,
  `name` varchar(100) NOT NULL,
  `rate` decimal(5,2) NOT NULL,
  `type` enum('EXCLUSIVE','INCLUSIVE') NOT NULL DEFAULT 'EXCLUSIVE',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `taxes`
--

LOCK TABLES `taxes` WRITE;
/*!40000 ALTER TABLE `taxes` DISABLE KEYS */;
/*!40000 ALTER TABLE `taxes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `trip_routes`
--

DROP TABLE IF EXISTS `trip_routes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `trip_routes` (
  `id` varchar(36) NOT NULL,
  `trip_id` varchar(36) NOT NULL,
  `gps_lat` decimal(10,8) NOT NULL,
  `gps_lng` decimal(11,8) NOT NULL,
  `timestamp` timestamp NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `trip_routes`
--

LOCK TABLES `trip_routes` WRITE;
/*!40000 ALTER TABLE `trip_routes` DISABLE KEYS */;
/*!40000 ALTER TABLE `trip_routes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `trip_staff`
--

DROP TABLE IF EXISTS `trip_staff`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `trip_staff` (
  `trip_id` binary(16) NOT NULL,
  `user_id` binary(16) NOT NULL,
  `duty` varchar(100) NOT NULL,
  PRIMARY KEY (`trip_id`,`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `trip_staff`
--

LOCK TABLES `trip_staff` WRITE;
/*!40000 ALTER TABLE `trip_staff` DISABLE KEYS */;
/*!40000 ALTER TABLE `trip_staff` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `trip_stock`
--

DROP TABLE IF EXISTS `trip_stock`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `trip_stock` (
  `id` binary(16) NOT NULL,
  `trip_id` binary(16) NOT NULL,
  `product_id` binary(16) NOT NULL,
  `serial_item_id` binary(16) DEFAULT NULL,
  `loaded_qty` int NOT NULL,
  `returned_qty` int NOT NULL DEFAULT '0',
  `sold_qty` int NOT NULL DEFAULT '0',
  `status` enum('LOADED','CONFIRMED','RETURNED','DISCREPANCY') NOT NULL DEFAULT 'LOADED',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `trip_stock`
--

LOCK TABLES `trip_stock` WRITE;
/*!40000 ALTER TABLE `trip_stock` DISABLE KEYS */;
/*!40000 ALTER TABLE `trip_stock` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `trips`
--

DROP TABLE IF EXISTS `trips`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `trips` (
  `id` binary(16) NOT NULL,
  `branch_id` binary(16) NOT NULL,
  `route_id` binary(16) NOT NULL,
  `vehicle_id` binary(16) NOT NULL,
  `status` enum('PLANNED','LOADING','DEPARTED','IN_PROGRESS','RECONCILING','CLOSED','CLOSED_WITH_DISCREPANCIES','CANCELLED') NOT NULL DEFAULT 'PLANNED',
  `type` enum('SALE','COLLECTION','BOTH') NOT NULL DEFAULT 'BOTH',
  `planned_date` date NOT NULL,
  `departed_at` datetime DEFAULT NULL,
  `closed_at` datetime DEFAULT NULL,
  `expected_cash` decimal(14,2) NOT NULL DEFAULT '0.00',
  `actual_cash` decimal(14,2) NOT NULL DEFAULT '0.00',
  `created_by` binary(16) NOT NULL,
  `incharge_id` binary(16) NOT NULL,
  `start_km` int DEFAULT NULL,
  `end_km` int DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `trips`
--

LOCK TABLES `trips` WRITE;
/*!40000 ALTER TABLE `trips` DISABLE KEYS */;
/*!40000 ALTER TABLE `trips` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_branches`
--

DROP TABLE IF EXISTS `user_branches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_branches` (
  `user_id` binary(16) NOT NULL,
  `branch_id` binary(16) NOT NULL,
  PRIMARY KEY (`user_id`,`branch_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_branches`
--

LOCK TABLES `user_branches` WRITE;
/*!40000 ALTER TABLE `user_branches` DISABLE KEYS */;
INSERT INTO `user_branches` VALUES (_binary 'û\”=Ñèq‹∂\‚\€E(b\ÈJ',_binary 'û\”=ÑàuKπSZÆN;\Ô¢');
/*!40000 ALTER TABLE `user_branches` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` binary(16) NOT NULL,
  `email` varchar(255) NOT NULL,
  `name` varchar(255) DEFAULT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role_id` binary(16) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `max_discount_percentage` decimal(5,2) NOT NULL DEFAULT '0.00',
  `created_at` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_unique` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (_binary 'û\”=Ñèq‹∂\‚\€E(b\ÈJ','admin@masterhouse.lk','System Admin','3a324a27ea31475cf1f482d30181ca22:d09d248ed719f724b8e69da11078cd6a70fab33a6f8199f8fb9c0e4ccd815866382921ecb598743a02315bc6dfaf0c25b01fe3fed45a333b030f0fd09cce853d',_binary 'û\”=Å\„sÉπ2©L+h\·e',1,0.00,'2026-06-17 01:41:24');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `warehouses`
--

DROP TABLE IF EXISTS `warehouses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `warehouses` (
  `id` binary(16) NOT NULL,
  `branch_id` binary(16) NOT NULL,
  `name` varchar(255) NOT NULL,
  `address` varchar(255) NOT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `is_default` tinyint(1) NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `warehouses`
--

LOCK TABLES `warehouses` WRITE;
/*!40000 ALTER TABLE `warehouses` DISABLE KEYS */;
/*!40000 ALTER TABLE `warehouses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `warranty_claims`
--

DROP TABLE IF EXISTS `warranty_claims`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `warranty_claims` (
  `id` binary(16) NOT NULL,
  `sale_item_id` binary(16) NOT NULL,
  `customer_id` binary(16) NOT NULL,
  `serial_item_id` binary(16) DEFAULT NULL,
  `issue_description` text NOT NULL,
  `status` enum('OPEN','ITEM_COLLECTED','SENT_TO_SUPPLIER','IN_REPAIR','REPAIRED','REPLACED','REJECTED','CLOSED') NOT NULL DEFAULT 'OPEN',
  `resolution` enum('REPAIRED','REPLACED','REJECTED') DEFAULT NULL,
  `replacement_serial_id` binary(16) DEFAULT NULL,
  `processed_by` binary(16) NOT NULL,
  `collected_at` datetime DEFAULT NULL,
  `sent_to_supplier_at` datetime DEFAULT NULL,
  `received_from_supplier_at` datetime DEFAULT NULL,
  `resolved_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `warranty_claims`
--

LOCK TABLES `warranty_claims` WRITE;
/*!40000 ALTER TABLE `warranty_claims` DISABLE KEYS */;
/*!40000 ALTER TABLE `warranty_claims` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-06-17  7:20:27
