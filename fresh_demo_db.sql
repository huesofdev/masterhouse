-- MySQL dump 10.13  Distrib 8.0.44, for Win64 (x86_64)
--
-- Host: localhost    Database: masterhouse_fresh_demo
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
INSERT INTO `branches` VALUES (_binary '†#\Û^ötYì˘q√°õP','HQ (Admin Only)','123 Admin Lane',1);
/*!40000 ALTER TABLE `branches` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `brands`
--

DROP TABLE IF EXISTS `brands`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `brands` (
  `id` binary(16) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `brands`
--

LOCK TABLES `brands` WRITE;
/*!40000 ALTER TABLE `brands` DISABLE KEYS */;
/*!40000 ALTER TABLE `brands` ENABLE KEYS */;
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
INSERT INTO `categories` VALUES (_binary '†#\Ûo\⁄v\rã‘õcZg\˜\ﬁ','Electronics',NULL,1,'2026-08-21 10:52:31'),(_binary '†#\Ûo\‰r≥πﬂÄ]\·\‘l¿','Appliances',NULL,1,'2026-08-21 10:52:31'),(_binary '†#\Ûpq|ñáu :[\Ô','Furniture',NULL,1,'2026-08-21 10:52:31'),(_binary '†#\ÛpröîR\Î˘º∫B\≈','Small Appliances',NULL,1,'2026-08-21 10:52:31'),(_binary '†#\Ûpp|¢Ç¢H“≥ù','Electricals',NULL,1,'2026-08-21 10:52:31');
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
  `balance_after_receipt` decimal(14,2) DEFAULT NULL,
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
INSERT INTO `collection_receipts` VALUES (_binary '†#\Ûs\'u…º≈ñ¡>∑4D','REC-2026-08-0001',NULL,_binary '†#\Ûr\—ti¶k\„\Â	LL',_binary '†#\ÛrÑv\Ó∏\‘¯>àëäª',NULL,_binary '†#\Û^£t\Ïì;∆ænY\Ê',11000.00,121000.00,'CASH','PENDING',NULL,NULL,NULL,'2026-08-21 10:52:32');
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
  `area_id` binary(16) DEFAULT NULL,
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
  `rating` decimal(2,1) DEFAULT NULL,
  `rating_calculated_at` timestamp NULL DEFAULT NULL,
  `rating_override` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customers`
--

LOCK TABLES `customers` WRITE;
/*!40000 ALTER TABLE `customers` DISABLE KEYS */;
INSERT INTO `customers` VALUES (_binary '†#\ÛrÑv\Ó∏\‘¯>àëäª',_binary '†#\Û^ötYì˘q√°õP',_binary '†#\Ûo¡t^≠ü¨\…e\"≥D',NULL,'Demo Customer One','801234567V','0771111111','111 First Demo St',NULL,NULL,NULL,NULL,0,0.00,NULL,NULL,0,'2026-08-21 10:52:32');
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
INSERT INTO `document_sequences` VALUES (_binary '†#\Û^ötYì˘q√°õP','INVOICE','INV-{YYYY}-{MM}-',4,1,'2026-08-21 10:52:32'),(_binary '†#\Û^ötYì˘q√°õP','RECEIPT','REC-{YYYY}-{MM}-',4,1,'2026-08-21 10:52:32');
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
INSERT INTO `guarantors` VALUES (_binary '†#\Ûråqû°Ø\‚D\’','Demo Guarantor One','809876543V','0772222222','222 Second Demo St',NULL,NULL,'2026-08-21 10:52:32');
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
INSERT INTO `installment_contracts` VALUES (_binary '†#\Ûr\—ti¶k\„\Â	LL',_binary '†#\ÛròuÉã\"å•L\Íz',_binary '†#\ÛrÑv\Ó∏\‘¯>àëäª',_binary '†#\Ûo\–wùª°rﬁûú\Ÿe',_binary '†#\Ûråqû°Ø\‚D\’',120000.00,10.00,12000.00,132000.00,30000.00,121000.00,'MONTHLY','ACTIVE',NULL,NULL,NULL,'2026-08-21 10:52:32');
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
INSERT INTO `installment_schedules` VALUES (_binary '†#\Ûr\’sã’êªô∑RÜ',_binary '†#\Ûr\—ti¶k\„\Â	LL',1,'2026-09-21',11000.00,11000.00,0.00,'PAID'),(_binary '†#\Ûr\ÿw\\à™ª¸\ÿ\ﬂ€†',_binary '†#\Ûr\—ti¶k\„\Â	LL',2,'2026-08-19',11000.00,0.00,0.00,'PENDING'),(_binary '†#\Ûr\Ÿw\\°\∆cò∂\Ù^',_binary '†#\Ûr\—ti¶k\„\Â	LL',3,'2026-11-21',11000.00,0.00,0.00,'PENDING'),(_binary '†#\Ûr\⁄t∞¥\Â$.brv',_binary '†#\Ûr\—ti¶k\„\Â	LL',4,'2026-12-21',11000.00,0.00,0.00,'PENDING'),(_binary '†#\Ûr\€t¨ÖÇµ.™m∫',_binary '†#\Ûr\—ti¶k\„\Â	LL',5,'2027-01-21',11000.00,0.00,0.00,'PENDING'),(_binary '†#\Ûr\‹rÑÅÿò±\€$\Ë<',_binary '†#\Ûr\—ti¶k\„\Â	LL',6,'2027-02-21',11000.00,0.00,0.00,'PENDING'),(_binary '†#\Ûr\›vmØ\ˆÓµù\ﬂ\Ã',_binary '†#\Ûr\—ti¶k\„\Â	LL',7,'2027-03-21',11000.00,0.00,0.00,'PENDING'),(_binary '†#\Ûr\ﬂq:≥˛ë!˚$\Â\Â',_binary '†#\Ûr\—ti¶k\„\Â	LL',8,'2027-04-21',11000.00,0.00,0.00,'PENDING'),(_binary '†#\Ûr\‡vŒí∂\’\ı,\"',_binary '†#\Ûr\—ti¶k\„\Â	LL',9,'2027-05-21',11000.00,0.00,0.00,'PENDING'),(_binary '†#\Ûr\·rπ±ƒÇ=\Ûí',_binary '†#\Ûr\—ti¶k\„\Â	LL',10,'2027-06-21',11000.00,0.00,0.00,'PENDING'),(_binary '†#\Ûr\‚uIù∂8X\»i',_binary '†#\Ûr\—ti¶k\„\Â	LL',11,'2027-07-21',11000.00,0.00,0.00,'PENDING'),(_binary '†#\Ûr\„væ©G\”/îp\‹',_binary '†#\Ûr\—ti¶k\„\Â	LL',12,'2027-08-21',11000.00,0.00,0.00,'PENDING');
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
  `grace_period_days` int NOT NULL DEFAULT '5',
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
INSERT INTO `installment_schemes` VALUES (_binary '†#\Ûo\–wùª°rﬁûú\Ÿe',_binary '†#\Û^ötYì˘q√°õP','Demo 12-Month Plan',12,'MONTHLY',10.00,20.00,5.00,5,1,'2026-08-21 10:52:31');
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
INSERT INTO `inventory_balances` VALUES (_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ',_binary '†#\Ûp$wóõ˙Fòh\ƒ\€',4,105000.00,'2026-08-21 10:52:32'),(_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ',_binary '†#\ÛpNt9ã\"˚ú',5,84000.00,'2026-08-21 10:52:31'),(_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ',_binary '†#\Ûplpä°+\Ï\€\⁄9',5,66500.00,'2026-08-21 10:52:31'),(_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ',_binary '†#\Ûpâs!ë∞°±\◊|',5,52500.00,'2026-08-21 10:52:31'),(_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ',_binary '†#\Ûp©q˝ΩßU\ÚYWD',5,31500.00,'2026-08-21 10:52:31'),(_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ',_binary '†#\Ûp\«sVü‰ãül\›\Ûâ',5,77000.00,'2026-08-21 10:52:31'),(_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ',_binary '†#\Ûp\ÂtH¢A∫ÄTÑ\”V',5,94500.00,'2026-08-21 10:52:31'),(_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ',_binary '†#\Ûqsrïx-å\Ú0',5,175000.00,'2026-08-21 10:52:31'),(_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ',_binary '†#\Ûqp«∞\Ï\Ù8\⁄\—\Ë\—',5,45500.00,'2026-08-21 10:52:31'),(_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ',_binary '†#\Ûq;sèµ≥0q}\¬˛∫',5,24500.00,'2026-08-21 10:52:31'),(_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ',_binary '†#\ÛqUqå¶H∫àpsq',5,59500.00,'2026-08-21 10:52:31'),(_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ',_binary '†#\Ûqpu\‡¥,+Oú\ˆ¸',5,101500.00,'2026-08-21 10:52:31'),(_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ',_binary '†#\Ûqçq^•UsEl\Í1',5,49000.00,'2026-08-21 10:52:32'),(_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ',_binary '†#\Ûq®uöûF\'¨\·ﬂ∫',5,63000.00,'2026-08-21 10:52:32'),(_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ',_binary '†#\Ûq\≈qÆ∏—î\’yÜ®Ö',5,126000.00,'2026-08-21 10:52:32'),(_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ',_binary '†#\Ûq\·p⁄ú4â)\Z˚à§',20,84000.00,'2026-08-21 10:52:32'),(_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ',_binary '†#\Ûq\Ët˘Å2ë_V1CÅ',20,66500.00,'2026-08-21 10:52:32'),(_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ',_binary '†#\Ûq\Òt\Â™\Ò¯\ƒÿúo',20,45500.00,'2026-08-21 10:52:32'),(_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ',_binary '†#\Ûq˘uc°aÄÿñi8U',20,38500.00,'2026-08-21 10:52:32'),(_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ',_binary '†#\Ûrsi¶¶Ç@ßR\n4',20,59500.00,'2026-08-21 10:52:32'),(_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ',_binary '†#\Ûr	q∂ÆπÑrMZ\r',20,3150.00,'2026-08-21 10:52:32'),(_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ',_binary '†#\Ûrwíœ¥y5/:',20,5950.00,'2026-08-21 10:52:32'),(_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ',_binary '†#\Ûr\Zu.ÄFöz\"ú\ı6',20,8400.00,'2026-08-21 10:52:32'),(_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ',_binary '†#\Ûr\"tiè,(?\›#<',20,24500.00,'2026-08-21 10:52:32'),(_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ',_binary '†#\Ûr*q-õTRo\˘ä',20,17500.00,'2026-08-21 10:52:32'),(_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ',_binary '†#\Ûr2rkñá7|\Zyõ',20,10500.00,'2026-08-21 10:52:32'),(_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ',_binary '†#\Ûr9sN†\Ì\·˝ˇtD',20,5950.00,'2026-08-21 10:52:32'),(_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ',_binary '†#\ÛrAqÌîë±(	è&Ü',20,4550.00,'2026-08-21 10:52:32'),(_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ',_binary '†#\ÛrIq_õÑgÄ\‹dN˙',5,45500.00,'2026-08-21 10:52:32'),(_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ',_binary '†#\Ûrgq\Ô±6°JRä\∂',5,59500.00,'2026-08-21 10:52:32');
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
INSERT INTO `permissions` VALUES (_binary '†#\ÛY\”q∑ìº\ \ˆ*L\"\"','users:read','Allows read operations on users'),(_binary '†#\ÛY\›q†è8\Âzö\ÁÖ','users:create','Allows create operations on users'),(_binary '†#\ÛY\ÂsßèVããì!î','users:update','Allows update operations on users'),(_binary '†#\ÛY\Ír1£r\√Eì∞¬é','users:delete','Allows delete operations on users'),(_binary '†#\ÛY\Òr¨ã#O+°1\ ?','roles:read','Allows read operations on roles'),(_binary '†#\ÛY\˜wè≠æ≠∑º¬©\ﬂ','roles:create','Allows create operations on roles'),(_binary '†#\ÛY¸qÄ¨ê≤tL\ı','roles:update','Allows update operations on roles'),(_binary '†#\ÛZuú∏`Ø\√ê\0í','roles:delete','Allows delete operations on roles'),(_binary '†#\ÛZr8¨ãΩX\æ=s','branches:read','Allows read operations on branches'),(_binary '†#\ÛZ\rsàÆø\‚ù\Œh8~','branches:create','Allows create operations on branches'),(_binary '†#\ÛZt©≠∫zjÜ>\ÿ','branches:update','Allows update operations on branches'),(_binary '†#\ÛZwÿ≥‡∑™åï*','branches:delete','Allows delete operations on branches'),(_binary '†#\ÛZqi¶A≠\Ù.ˇl','customers:read','Allows read operations on customers'),(_binary '†#\ÛZ\"rπ\ÁÑ\Î\√A$#','customers:create','Allows create operations on customers'),(_binary '†#\ÛZ\'t\‚èq\‰U,∫ò|','customers:update','Allows update operations on customers'),(_binary '†#\ÛZ,ròì	\ÌöK~ü','customers:delete','Allows delete operations on customers'),(_binary '†#\ÛZ2wˇî¨<;1¥','catalog:read','Allows read operations on catalog'),(_binary '†#\ÛZ7u™∫∂\ﬁK\ﬂ\Íè','catalog:create','Allows create operations on catalog'),(_binary '†#\ÛZ<vÌÑ®∑+\€\'Ön','catalog:update','Allows update operations on catalog'),(_binary '†#\ÛZBváíen˛õ','catalog:delete','Allows delete operations on catalog'),(_binary '†#\ÛZHpè˙r\*∆†','inventory:read','Allows read operations on inventory'),(_binary '†#\ÛZMu=Æ\È,§§#ß','inventory:adjust','Allows adjust operations on inventory'),(_binary '†#\ÛZSw«ôVFßb','inventory:transfer','Allows transfer operations on inventory'),(_binary '†#\ÛZXs\Óï5\ˆù\ˆÑÖ','inventory:delete','Allows delete operations on inventory'),(_binary '†#\ÛZ]tõÅ›Ç\r˚Up','warehouses:read','Allows read operations on warehouses'),(_binary '†#\ÛZapˇå\‰¯€±¿∞O','warehouses:create','Allows create operations on warehouses'),(_binary '†#\ÛZgsú≤\\Zs;2\Òï','warehouses:update','Allows update operations on warehouses'),(_binary '†#\ÛZlp√∏ﬁë≠ad\‘+','suppliers:read','Allows read operations on suppliers'),(_binary '†#\ÛZqqß¥A{H\ÈC5','suppliers:create','Allows create operations on suppliers'),(_binary '†#\ÛZvs´¢ﬂëó™ê','suppliers:update','Allows update operations on suppliers'),(_binary '†#\ÛZ{tπå0É™Œî;','trips:read','Allows read operations on trips'),(_binary '†#\ÛZr∏Hq>2Üw','trips:create','Allows create operations on trips'),(_binary '†#\ÛZÖvnè\ÓxH\ÛÖ\ƒ','trips:update','Allows update operations on trips'),(_binary '†#\ÛZâqú.\ŒFêÉ','trips:delete','Allows delete operations on trips'),(_binary '†#\ÛZéu}ª∑\…ﬂ¥åg','trips:reconcile','Allows reconcile operations on trips'),(_binary '†#\ÛZìtå\Í\ıv•2\Ë','trips:force_end','Allows force_end operations on trips'),(_binary '†#\ÛZòrIú\ÀyfLá','logistics:read','Allows read operations on logistics'),(_binary '†#\ÛZùt>à\,Q]*z/','logistics:create','Allows create operations on logistics'),(_binary '†#\ÛZ°tœØv˛p\”]¯','logistics:update','Allows update operations on logistics'),(_binary '†#\ÛZ¶p˘¨]¢\‹¡èT','sales:read','Allows read operations on sales'),(_binary '†#\ÛZ´t7âN˛”π\0F\”','sales:create','Allows create operations on sales'),(_binary '†#\ÛZØr<∑w◊åì\»\ÿ','sales:update','Allows update operations on sales'),(_binary '†#\ÛZ¥wÅ¨âëø™i\Ì','sales:view_cost','Allows view_cost operations on sales'),(_binary '†#\ÛZπvË≠£˝9\‹0p]','collections:read','Allows read operations on collections'),(_binary '†#\ÛZær[™0TJ[æº','collections:create','Allows create operations on collections'),(_binary '†#\ÛZ\¬r˛æX\ﬁ\"\Õ&16','collections:update','Allows update operations on collections'),(_binary '†#\ÛZ\»v∏ìwA9ìÄº\À','collections:adjust','Allows adjust operations on collections'),(_binary '†#\ÛZ\Õt\Â¶\Ãh¸e1X','promotions:read','Allows read operations on promotions'),(_binary '†#\ÛZ\—wØjt]x\≈]≤','promotions:create','Allows create operations on promotions'),(_binary '†#\ÛZ\÷v¯ò≥Dú¸Z\Ë','promotions:update','Allows update operations on promotions'),(_binary '†#\ÛZ\€vÃÖD\Í\Úü@Ωç','promotions:delete','Allows delete operations on promotions'),(_binary '†#\ÛZ\‡qQ•\◊I\Zn¸','service:read','Allows read operations on service'),(_binary '†#\ÛZ\Âv\Åi˚ì2•\€q','service:process','Allows process operations on service'),(_binary '†#\ÛZ\Ípƒ™\Ÿ\rpC\⁄\”\ ','reports:view','Allows view operations on reports'),(_binary '†#\ÛZ\tp†ù\”\Ó\„\”$≤','reports:export','Allows export operations on reports'),(_binary '†#\ÛZ\ÙqèΩ%Zd\‚Jux','settings:read','Allows read operations on settings'),(_binary '†#\ÛZ˙q ¶ªQ•\…\ı∏','settings:update','Allows update operations on settings'),(_binary '†#\ÛZˇut°Nì	\Æa','sync:manage','Allows manage operations on sync'),(_binary '†#\Û[s]†\À\ˆ\›','orders:read','Allows read operations on orders'),(_binary '†#\Û[\nu4π\'(aCæü','orders:create','Allows create operations on orders'),(_binary '†#\Û[w ª\Ê\„)Sê!)','orders:delete','Allows delete operations on orders'),(_binary '†#\Û[sZÑIcIq\Ï9','assets:read','Allows read operations on assets'),(_binary '†#\Û[r*§\Î\`Fî0i','assets:create','Allows create operations on assets'),(_binary '†#\Û[q/ïê=¯c!æq','assets:update','Allows update operations on assets'),(_binary '†#\Û[$u=åhÉçºhF=','assets:delete','Allows delete operations on assets'),(_binary '†#\Û[)ví´z\”\€X?\‘\ˆ','expenses:read','Allows read operations on expenses'),(_binary '†#\Û[-r\Ùúü+\'à','expenses:create','Allows create operations on expenses'),(_binary '†#\Û[1sŒÅ\Ì ⁄©ï¸∂','expenses:update','Allows update operations on expenses'),(_binary '†#\Û[5tÔÑ¢¥\Ó$Ç˚D','wallets:read','Allows read operations on wallets'),(_binary '†#\Û[9s¢´ÜuSK\ÈRP','wallets:update','Allows update operations on wallets');
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
  `brand_id` binary(16) DEFAULT NULL,
  `warranty_type` enum('WARRANTY','GUARANTEE','NONE') NOT NULL DEFAULT 'NONE',
  `warranty_period_years` int NOT NULL DEFAULT '0',
  `warranty_period_months` int NOT NULL DEFAULT '0',
  `avg_cost` decimal(12,2) NOT NULL DEFAULT '0.00',
  `last_purchase_price` decimal(12,2) NOT NULL DEFAULT '0.00',
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
INSERT INTO `products` VALUES (_binary '†#\Ûp$wóõ˙Fòh\ƒ\€',_binary '†#\Ûo\⁄v\rã‘õcZg\˜\ﬁ','LG 65\' 4K Smart TV','DEMO-100','Demo product for LG 65\' 4K Smart TV',NULL,150000.00,'pieces',1,0.00,NULL,'NONE',0,0,0.00,0.00,1,'2026-08-21 10:52:31','2026-08-21 10:52:31'),(_binary '†#\ÛpNt9ã\"˚ú',_binary '†#\Ûo\⁄v\rã‘õcZg\˜\ﬁ','Samsung 55\' 4K TV','DEMO-101','Demo product for Samsung 55\' 4K TV',NULL,120000.00,'pieces',1,0.00,NULL,'NONE',0,0,0.00,0.00,1,'2026-08-21 10:52:31','2026-08-21 10:52:31'),(_binary '†#\Ûplpä°+\Ï\€\⁄9',_binary '†#\Ûo\⁄v\rã‘õcZg\˜\ﬁ','Sony 50\' LED TV','DEMO-102','Demo product for Sony 50\' LED TV',NULL,95000.00,'pieces',1,0.00,NULL,'NONE',0,0,0.00,0.00,1,'2026-08-21 10:52:31','2026-08-21 10:52:31'),(_binary '†#\Ûpâs!ë∞°±\◊|',_binary '†#\Ûo\⁄v\rã‘õcZg\˜\ﬁ','Hisense 43\' Smart TV','DEMO-103','Demo product for Hisense 43\' Smart TV',NULL,75000.00,'pieces',1,0.00,NULL,'NONE',0,0,0.00,0.00,1,'2026-08-21 10:52:31','2026-08-21 10:52:31'),(_binary '†#\Ûp©q˝ΩßU\ÚYWD',_binary '†#\Ûo\⁄v\rã‘õcZg\˜\ﬁ','Panasonic 32\' LED TV','DEMO-104','Demo product for Panasonic 32\' LED TV',NULL,45000.00,'pieces',1,0.00,NULL,'NONE',0,0,0.00,0.00,1,'2026-08-21 10:52:31','2026-08-21 10:52:31'),(_binary '†#\Ûp\«sVü‰ãül\›\Ûâ',_binary '†#\Ûo\‰r≥πﬂÄ]\·\‘l¿','Whirlpool 2-Door Fridge','DEMO-105','Demo product for Whirlpool 2-Door Fridge',NULL,110000.00,'pieces',1,0.00,NULL,'NONE',0,0,0.00,0.00,1,'2026-08-21 10:52:31','2026-08-21 10:52:31'),(_binary '†#\Ûp\ÂtH¢A∫ÄTÑ\”V',_binary '†#\Ûo\‰r≥πﬂÄ]\·\‘l¿','Samsung Inverter Fridge','DEMO-106','Demo product for Samsung Inverter Fridge',NULL,135000.00,'pieces',1,0.00,NULL,'NONE',0,0,0.00,0.00,1,'2026-08-21 10:52:31','2026-08-21 10:52:31'),(_binary '†#\Ûqsrïx-å\Ú0',_binary '†#\Ûo\‰r≥πﬂÄ]\·\‘l¿','LG Side-by-Side Fridge','DEMO-107','Demo product for LG Side-by-Side Fridge',NULL,250000.00,'pieces',1,0.00,NULL,'NONE',0,0,0.00,0.00,1,'2026-08-21 10:52:31','2026-08-21 10:52:31'),(_binary '†#\Ûqp«∞\Ï\Ù8\⁄\—\Ë\—',_binary '†#\Ûo\‰r≥πﬂÄ]\·\‘l¿','Beko Single Door Fridge','DEMO-108','Demo product for Beko Single Door Fridge',NULL,65000.00,'pieces',1,0.00,NULL,'NONE',0,0,0.00,0.00,1,'2026-08-21 10:52:31','2026-08-21 10:52:31'),(_binary '†#\Ûq;sèµ≥0q}\¬˛∫',_binary '†#\Ûo\‰r≥πﬂÄ]\·\‘l¿','Innovex Mini Fridge','DEMO-109','Demo product for Innovex Mini Fridge',NULL,35000.00,'pieces',1,0.00,NULL,'NONE',0,0,0.00,0.00,1,'2026-08-21 10:52:31','2026-08-21 10:52:31'),(_binary '†#\ÛqUqå¶H∫àpsq',_binary '†#\Ûo\‰r≥πﬂÄ]\·\‘l¿','Samsung 7kg Washing Machine','DEMO-110','Demo product for Samsung 7kg Washing Machine',NULL,85000.00,'pieces',1,0.00,NULL,'NONE',0,0,0.00,0.00,1,'2026-08-21 10:52:31','2026-08-21 10:52:31'),(_binary '†#\Ûqpu\‡¥,+Oú\ˆ¸',_binary '†#\Ûo\‰r≥πﬂÄ]\·\‘l¿','LG 9kg Front Load Washer','DEMO-111','Demo product for LG 9kg Front Load Washer',NULL,145000.00,'pieces',1,0.00,NULL,'NONE',0,0,0.00,0.00,1,'2026-08-21 10:52:31','2026-08-21 10:52:31'),(_binary '†#\Ûqçq^•UsEl\Í1',_binary '†#\Ûo\‰r≥πﬂÄ]\·\‘l¿','Whirlpool 6kg Washer','DEMO-112','Demo product for Whirlpool 6kg Washer',NULL,70000.00,'pieces',1,0.00,NULL,'NONE',0,0,0.00,0.00,1,'2026-08-21 10:52:32','2026-08-21 10:52:32'),(_binary '†#\Ûq®uöûF\'¨\·ﬂ∫',_binary '†#\Ûo\‰r≥πﬂÄ]\·\‘l¿','Panasonic 8kg Top Load','DEMO-113','Demo product for Panasonic 8kg Top Load',NULL,90000.00,'pieces',1,0.00,NULL,'NONE',0,0,0.00,0.00,1,'2026-08-21 10:52:32','2026-08-21 10:52:32'),(_binary '†#\Ûq\≈qÆ∏—î\’yÜ®Ö',_binary '†#\Ûo\‰r≥πﬂÄ]\·\‘l¿','Beko 10kg Washer/Dryer','DEMO-114','Demo product for Beko 10kg Washer/Dryer',NULL,180000.00,'pieces',1,0.00,NULL,'NONE',0,0,0.00,0.00,1,'2026-08-21 10:52:32','2026-08-21 10:52:32'),(_binary '†#\Ûq\·p⁄ú4â)\Z˚à§',_binary '†#\Ûpq|ñáu :[\Ô','Premium Teak Sofa Set','DEMO-115','Demo product for Premium Teak Sofa Set',NULL,120000.00,'pieces',0,0.00,NULL,'NONE',0,0,0.00,0.00,1,'2026-08-21 10:52:32','2026-08-21 10:52:32'),(_binary '†#\Ûq\Ët˘Å2ë_V1CÅ',_binary '†#\Ûpq|ñáu :[\Ô','Modern L-Shape Fabric Sofa','DEMO-116','Demo product for Modern L-Shape Fabric Sofa',NULL,95000.00,'pieces',0,0.00,NULL,'NONE',0,0,0.00,0.00,1,'2026-08-21 10:52:32','2026-08-21 10:52:32'),(_binary '†#\Ûq\Òt\Â™\Ò¯\ƒÿúo',_binary '†#\Ûpq|ñáu :[\Ô','Queen Size Wooden Bed','DEMO-117','Demo product for Queen Size Wooden Bed',NULL,65000.00,'pieces',0,0.00,NULL,'NONE',0,0,0.00,0.00,1,'2026-08-21 10:52:32','2026-08-21 10:52:32'),(_binary '†#\Ûq˘uc°aÄÿñi8U',_binary '†#\Ûpq|ñáu :[\Ô','King Size Spring Mattress','DEMO-118','Demo product for King Size Spring Mattress',NULL,55000.00,'pieces',0,0.00,NULL,'NONE',0,0,0.00,0.00,1,'2026-08-21 10:52:32','2026-08-21 10:52:32'),(_binary '†#\Ûrsi¶¶Ç@ßR\n4',_binary '†#\Ûpq|ñáu :[\Ô','6-Seater Glass Dining Table','DEMO-119','Demo product for 6-Seater Glass Dining Table',NULL,85000.00,'pieces',0,0.00,NULL,'NONE',0,0,0.00,0.00,1,'2026-08-21 10:52:32','2026-08-21 10:52:32'),(_binary '†#\Ûr	q∂ÆπÑrMZ\r',_binary '†#\ÛpröîR\Î˘º∫B\≈','Philips Iron','DEMO-120','Demo product for Philips Iron',NULL,4500.00,'pieces',0,0.00,NULL,'NONE',0,0,0.00,0.00,1,'2026-08-21 10:52:32','2026-08-21 10:52:32'),(_binary '†#\Ûrwíœ¥y5/:',_binary '†#\ÛpröîR\Î˘º∫B\≈','Panasonic Rice Cooker 1.8L','DEMO-121','Demo product for Panasonic Rice Cooker 1.8L',NULL,8500.00,'pieces',0,0.00,NULL,'NONE',0,0,0.00,0.00,1,'2026-08-21 10:52:32','2026-08-21 10:52:32'),(_binary '†#\Ûr\Zu.ÄFöz\"ú\ı6',_binary '†#\ÛpröîR\Î˘º∫B\≈','Black+Decker Blender','DEMO-122','Demo product for Black+Decker Blender',NULL,12000.00,'pieces',0,0.00,NULL,'NONE',0,0,0.00,0.00,1,'2026-08-21 10:52:32','2026-08-21 10:52:32'),(_binary '†#\Ûr\"tiè,(?\›#<',_binary '†#\ÛpröîR\Î˘º∫B\≈','Kenwood Stand Mixer','DEMO-123','Demo product for Kenwood Stand Mixer',NULL,35000.00,'pieces',0,0.00,NULL,'NONE',0,0,0.00,0.00,1,'2026-08-21 10:52:32','2026-08-21 10:52:32'),(_binary '†#\Ûr*q-õTRo\˘ä',_binary '†#\ÛpröîR\Î˘º∫B\≈','Sharp Microwave Oven 20L','DEMO-124','Demo product for Sharp Microwave Oven 20L',NULL,25000.00,'pieces',0,0.00,NULL,'NONE',0,0,0.00,0.00,1,'2026-08-21 10:52:32','2026-08-21 10:52:32'),(_binary '†#\Ûr2rkñá7|\Zyõ',_binary '†#\Ûpp|¢Ç¢H“≥ù','KDK Ceiling Fan','DEMO-125','Demo product for KDK Ceiling Fan',NULL,15000.00,'pieces',0,0.00,NULL,'NONE',0,0,0.00,0.00,1,'2026-08-21 10:52:32','2026-08-21 10:52:32'),(_binary '†#\Ûr9sN†\Ì\·˝ˇtD',_binary '†#\Ûpp|¢Ç¢H“≥ù','Orient Stand Fan','DEMO-126','Demo product for Orient Stand Fan',NULL,8500.00,'pieces',0,0.00,NULL,'NONE',0,0,0.00,0.00,1,'2026-08-21 10:52:32','2026-08-21 10:52:32'),(_binary '†#\ÛrAqÌîë±(	è&Ü',_binary '†#\Ûpp|¢Ç¢H“≥ù','Orange Wall Fan','DEMO-127','Demo product for Orange Wall Fan',NULL,6500.00,'pieces',0,0.00,NULL,'NONE',0,0,0.00,0.00,1,'2026-08-21 10:52:32','2026-08-21 10:52:32'),(_binary '†#\ÛrIq_õÑgÄ\‹dN˙',_binary '†#\Ûo\⁄v\rã‘õcZg\˜\ﬁ','Sony Home Theater 5.1','DEMO-128','Demo product for Sony Home Theater 5.1',NULL,65000.00,'pieces',1,0.00,NULL,'NONE',0,0,0.00,0.00,1,'2026-08-21 10:52:32','2026-08-21 10:52:32'),(_binary '†#\Ûrgq\Ô±6°JRä\∂',_binary '†#\Ûo\⁄v\rã‘õcZg\˜\ﬁ','JBL PartyBox 100','DEMO-129','Demo product for JBL PartyBox 100',NULL,85000.00,'pieces',1,0.00,NULL,'NONE',0,0,0.00,0.00,1,'2026-08-21 10:52:32','2026-08-21 10:52:32');
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
INSERT INTO `role_permissions` VALUES (_binary '†#\Û[@q®;7v',_binary '†#\ÛY\”q∑ìº\ \ˆ*L\"\"'),(_binary '†#\Û[@q®;7v',_binary '†#\ÛY\›q†è8\Âzö\ÁÖ'),(_binary '†#\Û[@q®;7v',_binary '†#\ÛY\ÂsßèVããì!î'),(_binary '†#\Û[@q®;7v',_binary '†#\ÛY\Ír1£r\√Eì∞¬é'),(_binary '†#\Û[@q®;7v',_binary '†#\ÛY\Òr¨ã#O+°1\ ?'),(_binary '†#\Û[@q®;7v',_binary '†#\ÛY\˜wè≠æ≠∑º¬©\ﬂ'),(_binary '†#\Û[@q®;7v',_binary '†#\ÛY¸qÄ¨ê≤tL\ı'),(_binary '†#\Û[@q®;7v',_binary '†#\ÛZuú∏`Ø\√ê\0í'),(_binary '†#\Û[@q®;7v',_binary '†#\ÛZr8¨ãΩX\æ=s'),(_binary '†#\Û[@q®;7v',_binary '†#\ÛZ\rsàÆø\‚ù\Œh8~'),(_binary '†#\Û[@q®;7v',_binary '†#\ÛZt©≠∫zjÜ>\ÿ'),(_binary '†#\Û[@q®;7v',_binary '†#\ÛZwÿ≥‡∑™åï*'),(_binary '†#\Û[@q®;7v',_binary '†#\ÛZqi¶A≠\Ù.ˇl'),(_binary '†#\Û[@q®;7v',_binary '†#\ÛZ\"rπ\ÁÑ\Î\√A$#'),(_binary '†#\Û[@q®;7v',_binary '†#\ÛZ\'t\‚èq\‰U,∫ò|'),(_binary '†#\Û[@q®;7v',_binary '†#\ÛZ,ròì	\ÌöK~ü'),(_binary '†#\Û[@q®;7v',_binary '†#\ÛZ2wˇî¨<;1¥'),(_binary '†#\Û[@q®;7v',_binary '†#\ÛZ7u™∫∂\ﬁK\ﬂ\Íè'),(_binary '†#\Û[@q®;7v',_binary '†#\ÛZ<vÌÑ®∑+\€\'Ön'),(_binary '†#\Û[@q®;7v',_binary '†#\ÛZBváíen˛õ'),(_binary '†#\Û[@q®;7v',_binary '†#\ÛZHpè˙r\*∆†'),(_binary '†#\Û[@q®;7v',_binary '†#\ÛZMu=Æ\È,§§#ß'),(_binary '†#\Û[@q®;7v',_binary '†#\ÛZSw«ôVFßb'),(_binary '†#\Û[@q®;7v',_binary '†#\ÛZXs\Óï5\ˆù\ˆÑÖ'),(_binary '†#\Û[@q®;7v',_binary '†#\ÛZ]tõÅ›Ç\r˚Up'),(_binary '†#\Û[@q®;7v',_binary '†#\ÛZapˇå\‰¯€±¿∞O'),(_binary '†#\Û[@q®;7v',_binary '†#\ÛZgsú≤\\Zs;2\Òï'),(_binary '†#\Û[@q®;7v',_binary '†#\ÛZlp√∏ﬁë≠ad\‘+'),(_binary '†#\Û[@q®;7v',_binary '†#\ÛZqqß¥A{H\ÈC5'),(_binary '†#\Û[@q®;7v',_binary '†#\ÛZvs´¢ﬂëó™ê'),(_binary '†#\Û[@q®;7v',_binary '†#\ÛZ{tπå0É™Œî;'),(_binary '†#\Û[@q®;7v',_binary '†#\ÛZr∏Hq>2Üw'),(_binary '†#\Û[@q®;7v',_binary '†#\ÛZÖvnè\ÓxH\ÛÖ\ƒ'),(_binary '†#\Û[@q®;7v',_binary '†#\ÛZâqú.\ŒFêÉ'),(_binary '†#\Û[@q®;7v',_binary '†#\ÛZéu}ª∑\…ﬂ¥åg'),(_binary '†#\Û[@q®;7v',_binary '†#\ÛZìtå\Í\ıv•2\Ë'),(_binary '†#\Û[@q®;7v',_binary '†#\ÛZòrIú\ÀyfLá'),(_binary '†#\Û[@q®;7v',_binary '†#\ÛZùt>à\,Q]*z/'),(_binary '†#\Û[@q®;7v',_binary '†#\ÛZ°tœØv˛p\”]¯'),(_binary '†#\Û[@q®;7v',_binary '†#\ÛZ¶p˘¨]¢\‹¡èT'),(_binary '†#\Û[@q®;7v',_binary '†#\ÛZ´t7âN˛”π\0F\”'),(_binary '†#\Û[@q®;7v',_binary '†#\ÛZØr<∑w◊åì\»\ÿ'),(_binary '†#\Û[@q®;7v',_binary '†#\ÛZ¥wÅ¨âëø™i\Ì'),(_binary '†#\Û[@q®;7v',_binary '†#\ÛZπvË≠£˝9\‹0p]'),(_binary '†#\Û[@q®;7v',_binary '†#\ÛZær[™0TJ[æº'),(_binary '†#\Û[@q®;7v',_binary '†#\ÛZ\¬r˛æX\ﬁ\"\Õ&16'),(_binary '†#\Û[@q®;7v',_binary '†#\ÛZ\»v∏ìwA9ìÄº\À'),(_binary '†#\Û[@q®;7v',_binary '†#\ÛZ\Õt\Â¶\Ãh¸e1X'),(_binary '†#\Û[@q®;7v',_binary '†#\ÛZ\—wØjt]x\≈]≤'),(_binary '†#\Û[@q®;7v',_binary '†#\ÛZ\÷v¯ò≥Dú¸Z\Ë'),(_binary '†#\Û[@q®;7v',_binary '†#\ÛZ\€vÃÖD\Í\Úü@Ωç'),(_binary '†#\Û[@q®;7v',_binary '†#\ÛZ\‡qQ•\◊I\Zn¸'),(_binary '†#\Û[@q®;7v',_binary '†#\ÛZ\Âv\Åi˚ì2•\€q'),(_binary '†#\Û[@q®;7v',_binary '†#\ÛZ\Ípƒ™\Ÿ\rpC\⁄\”\ '),(_binary '†#\Û[@q®;7v',_binary '†#\ÛZ\tp†ù\”\Ó\„\”$≤'),(_binary '†#\Û[@q®;7v',_binary '†#\ÛZ\ÙqèΩ%Zd\‚Jux'),(_binary '†#\Û[@q®;7v',_binary '†#\ÛZ˙q ¶ªQ•\…\ı∏'),(_binary '†#\Û[@q®;7v',_binary '†#\ÛZˇut°Nì	\Æa'),(_binary '†#\Û[@q®;7v',_binary '†#\Û[s]†\À\ˆ\›'),(_binary '†#\Û[@q®;7v',_binary '†#\Û[\nu4π\'(aCæü'),(_binary '†#\Û[@q®;7v',_binary '†#\Û[w ª\Ê\„)Sê!)'),(_binary '†#\Û[@q®;7v',_binary '†#\Û[sZÑIcIq\Ï9'),(_binary '†#\Û[@q®;7v',_binary '†#\Û[r*§\Î\`Fî0i'),(_binary '†#\Û[@q®;7v',_binary '†#\Û[q/ïê=¯c!æq'),(_binary '†#\Û[@q®;7v',_binary '†#\Û[$u=åhÉçºhF='),(_binary '†#\Û[@q®;7v',_binary '†#\Û[)ví´z\”\€X?\‘\ˆ'),(_binary '†#\Û[@q®;7v',_binary '†#\Û[-r\Ùúü+\'à'),(_binary '†#\Û[@q®;7v',_binary '†#\Û[1sŒÅ\Ì ⁄©ï¸∂'),(_binary '†#\Û[@q®;7v',_binary '†#\Û[5tÔÑ¢¥\Ó$Ç˚D'),(_binary '†#\Û[@q®;7v',_binary '†#\Û[9s¢´ÜuSK\ÈRP'),(_binary '†#\Û\\\’w}ï\Â≠\ˆ\∆F|Ü',_binary '†#\ÛY\”q∑ìº\ \ˆ*L\"\"'),(_binary '†#\Û\\\’w}ï\Â≠\ˆ\∆F|Ü',_binary '†#\ÛY\›q†è8\Âzö\ÁÖ'),(_binary '†#\Û\\\’w}ï\Â≠\ˆ\∆F|Ü',_binary '†#\ÛY\ÂsßèVããì!î'),(_binary '†#\Û\\\’w}ï\Â≠\ˆ\∆F|Ü',_binary '†#\ÛY\Ír1£r\√Eì∞¬é'),(_binary '†#\Û\\\’w}ï\Â≠\ˆ\∆F|Ü',_binary '†#\ÛY\Òr¨ã#O+°1\ ?'),(_binary '†#\Û\\\’w}ï\Â≠\ˆ\∆F|Ü',_binary '†#\ÛY\˜wè≠æ≠∑º¬©\ﬂ'),(_binary '†#\Û\\\’w}ï\Â≠\ˆ\∆F|Ü',_binary '†#\ÛY¸qÄ¨ê≤tL\ı'),(_binary '†#\Û\\\’w}ï\Â≠\ˆ\∆F|Ü',_binary '†#\ÛZuú∏`Ø\√ê\0í'),(_binary '†#\Û\\\’w}ï\Â≠\ˆ\∆F|Ü',_binary '†#\ÛZr8¨ãΩX\æ=s'),(_binary '†#\Û\\\’w}ï\Â≠\ˆ\∆F|Ü',_binary '†#\ÛZ\rsàÆø\‚ù\Œh8~'),(_binary '†#\Û\\\’w}ï\Â≠\ˆ\∆F|Ü',_binary '†#\ÛZt©≠∫zjÜ>\ÿ'),(_binary '†#\Û\\\’w}ï\Â≠\ˆ\∆F|Ü',_binary '†#\ÛZwÿ≥‡∑™åï*'),(_binary '†#\Û\\\’w}ï\Â≠\ˆ\∆F|Ü',_binary '†#\ÛZqi¶A≠\Ù.ˇl'),(_binary '†#\Û\\\’w}ï\Â≠\ˆ\∆F|Ü',_binary '†#\ÛZ\"rπ\ÁÑ\Î\√A$#'),(_binary '†#\Û\\\’w}ï\Â≠\ˆ\∆F|Ü',_binary '†#\ÛZ\'t\‚èq\‰U,∫ò|'),(_binary '†#\Û\\\’w}ï\Â≠\ˆ\∆F|Ü',_binary '†#\ÛZ,ròì	\ÌöK~ü'),(_binary '†#\Û\\\’w}ï\Â≠\ˆ\∆F|Ü',_binary '†#\ÛZ2wˇî¨<;1¥'),(_binary '†#\Û\\\’w}ï\Â≠\ˆ\∆F|Ü',_binary '†#\ÛZ7u™∫∂\ﬁK\ﬂ\Íè'),(_binary '†#\Û\\\’w}ï\Â≠\ˆ\∆F|Ü',_binary '†#\ÛZ<vÌÑ®∑+\€\'Ön'),(_binary '†#\Û\\\’w}ï\Â≠\ˆ\∆F|Ü',_binary '†#\ÛZBváíen˛õ'),(_binary '†#\Û\\\’w}ï\Â≠\ˆ\∆F|Ü',_binary '†#\ÛZHpè˙r\*∆†'),(_binary '†#\Û\\\’w}ï\Â≠\ˆ\∆F|Ü',_binary '†#\ÛZMu=Æ\È,§§#ß'),(_binary '†#\Û\\\’w}ï\Â≠\ˆ\∆F|Ü',_binary '†#\ÛZSw«ôVFßb'),(_binary '†#\Û\\\’w}ï\Â≠\ˆ\∆F|Ü',_binary '†#\ÛZXs\Óï5\ˆù\ˆÑÖ'),(_binary '†#\Û\\\’w}ï\Â≠\ˆ\∆F|Ü',_binary '†#\ÛZ]tõÅ›Ç\r˚Up'),(_binary '†#\Û\\\’w}ï\Â≠\ˆ\∆F|Ü',_binary '†#\ÛZapˇå\‰¯€±¿∞O'),(_binary '†#\Û\\\’w}ï\Â≠\ˆ\∆F|Ü',_binary '†#\ÛZgsú≤\\Zs;2\Òï'),(_binary '†#\Û\\\’w}ï\Â≠\ˆ\∆F|Ü',_binary '†#\ÛZlp√∏ﬁë≠ad\‘+'),(_binary '†#\Û\\\’w}ï\Â≠\ˆ\∆F|Ü',_binary '†#\ÛZqqß¥A{H\ÈC5'),(_binary '†#\Û\\\’w}ï\Â≠\ˆ\∆F|Ü',_binary '†#\ÛZvs´¢ﬂëó™ê'),(_binary '†#\Û\\\’w}ï\Â≠\ˆ\∆F|Ü',_binary '†#\ÛZ{tπå0É™Œî;'),(_binary '†#\Û\\\’w}ï\Â≠\ˆ\∆F|Ü',_binary '†#\ÛZr∏Hq>2Üw'),(_binary '†#\Û\\\’w}ï\Â≠\ˆ\∆F|Ü',_binary '†#\ÛZÖvnè\ÓxH\ÛÖ\ƒ'),(_binary '†#\Û\\\’w}ï\Â≠\ˆ\∆F|Ü',_binary '†#\ÛZâqú.\ŒFêÉ'),(_binary '†#\Û\\\’w}ï\Â≠\ˆ\∆F|Ü',_binary '†#\ÛZéu}ª∑\…ﬂ¥åg'),(_binary '†#\Û\\\’w}ï\Â≠\ˆ\∆F|Ü',_binary '†#\ÛZìtå\Í\ıv•2\Ë'),(_binary '†#\Û\\\’w}ï\Â≠\ˆ\∆F|Ü',_binary '†#\ÛZòrIú\ÀyfLá'),(_binary '†#\Û\\\’w}ï\Â≠\ˆ\∆F|Ü',_binary '†#\ÛZùt>à\,Q]*z/'),(_binary '†#\Û\\\’w}ï\Â≠\ˆ\∆F|Ü',_binary '†#\ÛZ°tœØv˛p\”]¯'),(_binary '†#\Û\\\’w}ï\Â≠\ˆ\∆F|Ü',_binary '†#\ÛZ¶p˘¨]¢\‹¡èT'),(_binary '†#\Û\\\’w}ï\Â≠\ˆ\∆F|Ü',_binary '†#\ÛZ´t7âN˛”π\0F\”'),(_binary '†#\Û\\\’w}ï\Â≠\ˆ\∆F|Ü',_binary '†#\ÛZØr<∑w◊åì\»\ÿ'),(_binary '†#\Û\\\’w}ï\Â≠\ˆ\∆F|Ü',_binary '†#\ÛZ¥wÅ¨âëø™i\Ì'),(_binary '†#\Û\\\’w}ï\Â≠\ˆ\∆F|Ü',_binary '†#\ÛZπvË≠£˝9\‹0p]'),(_binary '†#\Û\\\’w}ï\Â≠\ˆ\∆F|Ü',_binary '†#\ÛZær[™0TJ[æº'),(_binary '†#\Û\\\’w}ï\Â≠\ˆ\∆F|Ü',_binary '†#\ÛZ\¬r˛æX\ﬁ\"\Õ&16'),(_binary '†#\Û\\\’w}ï\Â≠\ˆ\∆F|Ü',_binary '†#\ÛZ\»v∏ìwA9ìÄº\À'),(_binary '†#\Û\\\’w}ï\Â≠\ˆ\∆F|Ü',_binary '†#\ÛZ\Õt\Â¶\Ãh¸e1X'),(_binary '†#\Û\\\’w}ï\Â≠\ˆ\∆F|Ü',_binary '†#\ÛZ\—wØjt]x\≈]≤'),(_binary '†#\Û\\\’w}ï\Â≠\ˆ\∆F|Ü',_binary '†#\ÛZ\÷v¯ò≥Dú¸Z\Ë'),(_binary '†#\Û\\\’w}ï\Â≠\ˆ\∆F|Ü',_binary '†#\ÛZ\€vÃÖD\Í\Úü@Ωç'),(_binary '†#\Û\\\’w}ï\Â≠\ˆ\∆F|Ü',_binary '†#\ÛZ\‡qQ•\◊I\Zn¸'),(_binary '†#\Û\\\’w}ï\Â≠\ˆ\∆F|Ü',_binary '†#\ÛZ\Âv\Åi˚ì2•\€q'),(_binary '†#\Û\\\’w}ï\Â≠\ˆ\∆F|Ü',_binary '†#\ÛZ\Ípƒ™\Ÿ\rpC\⁄\”\ '),(_binary '†#\Û\\\’w}ï\Â≠\ˆ\∆F|Ü',_binary '†#\ÛZ\tp†ù\”\Ó\„\”$≤'),(_binary '†#\Û\\\’w}ï\Â≠\ˆ\∆F|Ü',_binary '†#\ÛZ\ÙqèΩ%Zd\‚Jux'),(_binary '†#\Û\\\’w}ï\Â≠\ˆ\∆F|Ü',_binary '†#\ÛZ˙q ¶ªQ•\…\ı∏'),(_binary '†#\Û\\\’w}ï\Â≠\ˆ\∆F|Ü',_binary '†#\ÛZˇut°Nì	\Æa'),(_binary '†#\Û\\\’w}ï\Â≠\ˆ\∆F|Ü',_binary '†#\Û[s]†\À\ˆ\›'),(_binary '†#\Û\\\’w}ï\Â≠\ˆ\∆F|Ü',_binary '†#\Û[\nu4π\'(aCæü'),(_binary '†#\Û\\\’w}ï\Â≠\ˆ\∆F|Ü',_binary '†#\Û[w ª\Ê\„)Sê!)'),(_binary '†#\Û\\\’w}ï\Â≠\ˆ\∆F|Ü',_binary '†#\Û[sZÑIcIq\Ï9'),(_binary '†#\Û\\\’w}ï\Â≠\ˆ\∆F|Ü',_binary '†#\Û[r*§\Î\`Fî0i'),(_binary '†#\Û\\\’w}ï\Â≠\ˆ\∆F|Ü',_binary '†#\Û[q/ïê=¯c!æq'),(_binary '†#\Û\\\’w}ï\Â≠\ˆ\∆F|Ü',_binary '†#\Û[$u=åhÉçºhF='),(_binary '†#\Û\\\’w}ï\Â≠\ˆ\∆F|Ü',_binary '†#\Û[)ví´z\”\€X?\‘\ˆ'),(_binary '†#\Û\\\’w}ï\Â≠\ˆ\∆F|Ü',_binary '†#\Û[-r\Ùúü+\'à'),(_binary '†#\Û\\\’w}ï\Â≠\ˆ\∆F|Ü',_binary '†#\Û[1sŒÅ\Ì ⁄©ï¸∂'),(_binary '†#\Û\\\’w}ï\Â≠\ˆ\∆F|Ü',_binary '†#\Û[5tÔÑ¢¥\Ó$Ç˚D'),(_binary '†#\Û\\\’w}ï\Â≠\ˆ\∆F|Ü',_binary '†#\Û[9s¢´ÜuSK\ÈRP'),(_binary '†#\Û^sdª∞à\ÏbuOJ',_binary '†#\ÛZqi¶A≠\Ù.ˇl'),(_binary '†#\Û^sdª∞à\ÏbuOJ',_binary '†#\ÛZ\"rπ\ÁÑ\Î\√A$#'),(_binary '†#\Û^sdª∞à\ÏbuOJ',_binary '†#\ÛZ\'t\‚èq\‰U,∫ò|'),(_binary '†#\Û^sdª∞à\ÏbuOJ',_binary '†#\ÛZ2wˇî¨<;1¥'),(_binary '†#\Û^sdª∞à\ÏbuOJ',_binary '†#\ÛZHpè˙r\*∆†'),(_binary '†#\Û^sdª∞à\ÏbuOJ',_binary '†#\ÛZ¶p˘¨]¢\‹¡èT'),(_binary '†#\Û^sdª∞à\ÏbuOJ',_binary '†#\ÛZ´t7âN˛”π\0F\”'),(_binary '†#\Û^sdª∞à\ÏbuOJ',_binary '†#\ÛZØr<∑w◊åì\»\ÿ'),(_binary '†#\Û^sdª∞à\ÏbuOJ',_binary '†#\ÛZπvË≠£˝9\‹0p]'),(_binary '†#\Û^sdª∞à\ÏbuOJ',_binary '†#\Û[s]†\À\ˆ\›'),(_binary '†#\Û^sdª∞à\ÏbuOJ',_binary '†#\Û[\nu4π\'(aCæü'),(_binary '†#\Û^VsXê ≤®\…û<',_binary '†#\ÛZqi¶A≠\Ù.ˇl'),(_binary '†#\Û^VsXê ≤®\…û<',_binary '†#\ÛZ\"rπ\ÁÑ\Î\√A$#'),(_binary '†#\Û^VsXê ≤®\…û<',_binary '†#\ÛZ2wˇî¨<;1¥'),(_binary '†#\Û^VsXê ≤®\…û<',_binary '†#\ÛZ¶p˘¨]¢\‹¡èT'),(_binary '†#\Û^VsXê ≤®\…û<',_binary '†#\ÛZπvË≠£˝9\‹0p]'),(_binary '†#\Û^VsXê ≤®\…û<',_binary '†#\ÛZær[™0TJ[æº'),(_binary '†#\Û^VsXê ≤®\…û<',_binary '†#\ÛZ\¬r˛æX\ﬁ\"\Õ&16'),(_binary '†#\Û^VsXê ≤®\…û<',_binary '†#\ÛZ\‡qQ•\◊I\Zn¸'),(_binary '†#\Û^VsXê ≤®\…û<',_binary '†#\ÛZ\Âv\Åi˚ì2•\€q'),(_binary '†#\Û^VsXê ≤®\…û<',_binary '†#\Û[s]†\À\ˆ\›'),(_binary '†#\Û^VsXê ≤®\…û<',_binary '†#\Û[\nu4π\'(aCæü'),(_binary '†#\Û^VsXê ≤®\…û<',_binary '†#\Û[)ví´z\”\€X?\‘\ˆ'),(_binary '†#\Û^VsXê ≤®\…û<',_binary '†#\Û[-r\Ùúü+\'à');
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
INSERT INTO `roles` VALUES (_binary '†#\Û[@q®;7v','Super Admin','Full system access including destructive actions.',100),(_binary '†#\Û\\\’w}ï\Â≠\ˆ\∆F|Ü','Owner','Business owner with full access to reporting and operations.',90),(_binary '†#\Û^sdª∞à\ÏbuOJ','Sales Rep','Handles customer acquisition and sales creation.',50),(_binary '†#\Û^VsXê ≤®\…û<','Front Desk','Handles walk-ins, payments, and basic service operations.',30);
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `route_areas`
--

DROP TABLE IF EXISTS `route_areas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `route_areas` (
  `id` binary(16) NOT NULL,
  `route_id` binary(16) NOT NULL,
  `name` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `route_areas`
--

LOCK TABLES `route_areas` WRITE;
/*!40000 ALTER TABLE `route_areas` DISABLE KEYS */;
/*!40000 ALTER TABLE `route_areas` ENABLE KEYS */;
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
INSERT INTO `routes` VALUES (_binary '†#\Ûo¡t^≠ü¨\…e\"≥D',_binary '†#\Û^ötYì˘q√°õP','DEMO-RT-01','Demo Route','Demo Route Area',1,'2026-08-21 10:52:31');
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
INSERT INTO `sale_items` VALUES (_binary '†#\Ûr∑rù≥c\Î˝õlŸ†',_binary '†#\ÛròuÉã\"å•L\Íz',_binary '†#\Ûp$wóõ˙Fòh\ƒ\€',_binary '†#\Ûp5w∫æ(eŸçBD	',1,0.00,150000.00,0.00,NULL,150000.00);
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
  `notes` text,
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
INSERT INTO `sales` VALUES (_binary '†#\ÛròuÉã\"å•L\Íz','INV-2026-08-0001',NULL,_binary '†#\Û^ötYì˘q√°õP',_binary '†#\ÛrÑv\Ó∏\‘¯>àëäª',NULL,NULL,_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ','INSTALLMENT','CASH',150000.00,NULL,0.00,0.00,30000.00,0.00,NULL,150000.00,NULL,NULL,'COMPLETED',NULL,NULL,'2026-08-21 10:52:32');
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
  PRIMARY KEY (`id`),
  UNIQUE KEY `serial_items_serial_number_unique` (`serial_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `serial_items`
--

LOCK TABLES `serial_items` WRITE;
/*!40000 ALTER TABLE `serial_items` DISABLE KEYS */;
INSERT INTO `serial_items` VALUES (_binary '†#\Ûp5w∫æ(eŸçBD	',_binary '†#\Ûp$wóõ˙Fòh\ƒ\€',NULL,_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ','SN-DEMO-001-0','SOLD','2026-08-21 10:52:31'),(_binary '†#\Ûp<v∑\“\–v\nß\—',_binary '†#\Ûp$wóõ˙Fòh\ƒ\€',NULL,_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ','SN-DEMO-002-0','IN_STOCK','2026-08-21 10:52:31'),(_binary '†#\ÛpAp^û\rÑ\‚\Âû\’',_binary '†#\Ûp$wóõ˙Fòh\ƒ\€',NULL,_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ','SN-DEMO-003-0','IN_STOCK','2026-08-21 10:52:31'),(_binary '†#\ÛpDvÖ~CB;r\€',_binary '†#\Ûp$wóõ˙Fòh\ƒ\€',NULL,_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ','SN-DEMO-004-0','IN_STOCK','2026-08-21 10:52:31'),(_binary '†#\ÛpIp_ñ\Á°DA†',_binary '†#\Ûp$wóõ˙Fòh\ƒ\€',NULL,_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ','SN-DEMO-005-0','IN_STOCK','2026-08-21 10:52:31'),(_binary '†#\ÛpWv:´∏∞K\Á…Ö',_binary '†#\ÛpNt9ã\"˚ú',NULL,_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ','SN-DEMO-001-1','IN_STOCK','2026-08-21 10:52:31'),(_binary '†#\Ûp[w´ê\ÀxWy¸',_binary '†#\ÛpNt9ã\"˚ú',NULL,_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ','SN-DEMO-002-1','IN_STOCK','2026-08-21 10:52:31'),(_binary '†#\Ûp`p¸ô[&åê&',_binary '†#\ÛpNt9ã\"˚ú',NULL,_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ','SN-DEMO-003-1','IN_STOCK','2026-08-21 10:52:31'),(_binary '†#\ÛpcuÖ†èu<a[l',_binary '†#\ÛpNt9ã\"˚ú',NULL,_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ','SN-DEMO-004-1','IN_STOCK','2026-08-21 10:52:31'),(_binary '†#\ÛpgtJ¥ò¡{>8',_binary '†#\ÛpNt9ã\"˚ú',NULL,_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ','SN-DEMO-005-1','IN_STOCK','2026-08-21 10:52:31'),(_binary '†#\Ûptw\Ôû’∏î^Ñ\⁄M',_binary '†#\Ûplpä°+\Ï\€\⁄9',NULL,_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ','SN-DEMO-001-2','IN_STOCK','2026-08-21 10:52:31'),(_binary '†#\Ûpxuç\∆\ˆ]™\\\—',_binary '†#\Ûplpä°+\Ï\€\⁄9',NULL,_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ','SN-DEMO-002-2','IN_STOCK','2026-08-21 10:52:31'),(_binary '†#\Ûp|r\Zà\√\Úåe™Ü',_binary '†#\Ûplpä°+\Ï\€\⁄9',NULL,_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ','SN-DEMO-003-2','IN_STOCK','2026-08-21 10:52:31'),(_binary '†#\ÛpÄrÖ≠+µ˚\Î\◊\Ô¥',_binary '†#\Ûplpä°+\Ï\€\⁄9',NULL,_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ','SN-DEMO-004-2','IN_STOCK','2026-08-21 10:52:31'),(_binary '†#\ÛpÑu≤ò?∑ãêeú\“',_binary '†#\Ûplpä°+\Ï\€\⁄9',NULL,_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ','SN-DEMO-005-2','IN_STOCK','2026-08-21 10:52:31'),(_binary '†#\Ûpíqu∑ ¢ñ\„úmq',_binary '†#\Ûpâs!ë∞°±\◊|',NULL,_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ','SN-DEMO-001-3','IN_STOCK','2026-08-21 10:52:31'),(_binary '†#\ÛpórÃ≠¶5Oònt',_binary '†#\Ûpâs!ë∞°±\◊|',NULL,_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ','SN-DEMO-002-3','IN_STOCK','2026-08-21 10:52:31'),(_binary '†#\Ûpõrh¨xÉ{\„TÉ',_binary '†#\Ûpâs!ë∞°±\◊|',NULL,_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ','SN-DEMO-003-3','IN_STOCK','2026-08-21 10:52:31'),(_binary '†#\Ûp†r¡Ö\r¡:çñ∏',_binary '†#\Ûpâs!ë∞°±\◊|',NULL,_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ','SN-DEMO-004-3','IN_STOCK','2026-08-21 10:52:31'),(_binary '†#\Ûp•r\\†Ω\Ò\”sØ',_binary '†#\Ûpâs!ë∞°±\◊|',NULL,_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ','SN-DEMO-005-3','IN_STOCK','2026-08-21 10:52:31'),(_binary '†#\Ûp≤rå¡|√æ\rñ',_binary '†#\Ûp©q˝ΩßU\ÚYWD',NULL,_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ','SN-DEMO-001-4','IN_STOCK','2026-08-21 10:52:31'),(_binary '†#\Ûp∑s	ãéõÃµ¸≠',_binary '†#\Ûp©q˝ΩßU\ÚYWD',NULL,_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ','SN-DEMO-002-4','IN_STOCK','2026-08-21 10:52:31'),(_binary '†#\Ûpªu-ØzA∫\ÈLëT',_binary '†#\Ûp©q˝ΩßU\ÚYWD',NULL,_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ','SN-DEMO-003-4','IN_STOCK','2026-08-21 10:52:31'),(_binary '†#\Ûpøw—àÄQ\n0âã\‹',_binary '†#\Ûp©q˝ΩßU\ÚYWD',NULL,_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ','SN-DEMO-004-4','IN_STOCK','2026-08-21 10:52:31'),(_binary '†#\Ûp\ƒw\nñ\Ò£^â\Í_',_binary '†#\Ûp©q˝ΩßU\ÚYWD',NULL,_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ','SN-DEMO-005-4','IN_STOCK','2026-08-21 10:52:31'),(_binary '†#\Ûp\–r\Ôæ¡ï@çm}\÷',_binary '†#\Ûp\«sVü‰ãül\›\Ûâ',NULL,_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ','SN-DEMO-001-5','IN_STOCK','2026-08-21 10:52:31'),(_binary '†#\Ûp\’pmÜ#Å&†â™\Ë',_binary '†#\Ûp\«sVü‰ãül\›\Ûâ',NULL,_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ','SN-DEMO-002-5','IN_STOCK','2026-08-21 10:52:31'),(_binary '†#\Ûp\Ÿuúà_§Ωs7~ö',_binary '†#\Ûp\«sVü‰ãül\›\Ûâ',NULL,_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ','SN-DEMO-003-5','IN_STOCK','2026-08-21 10:52:31'),(_binary '†#\Ûp\‹tœögv<ﬁä}',_binary '†#\Ûp\«sVü‰ãül\›\Ûâ',NULL,_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ','SN-DEMO-004-5','IN_STOCK','2026-08-21 10:52:31'),(_binary '†#\Ûp\·vt°\Ùd\Ôå	ë',_binary '†#\Ûp\«sVü‰ãül\›\Ûâ',NULL,_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ','SN-DEMO-005-5','IN_STOCK','2026-08-21 10:52:31'),(_binary '†#\Ûp\Ìt?íü\≈w0l',_binary '†#\Ûp\ÂtH¢A∫ÄTÑ\”V',NULL,_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ','SN-DEMO-001-6','IN_STOCK','2026-08-21 10:52:31'),(_binary '†#\Ûp\Òw/Üïï\’',_binary '†#\Ûp\ÂtH¢A∫ÄTÑ\”V',NULL,_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ','SN-DEMO-002-6','IN_STOCK','2026-08-21 10:52:31'),(_binary '†#\Ûp\ıq\rí\ÙJï8\Ù¶',_binary '†#\Ûp\ÂtH¢A∫ÄTÑ\”V',NULL,_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ','SN-DEMO-003-6','IN_STOCK','2026-08-21 10:52:31'),(_binary '†#\Ûp˘rk¥\·Ä⁄Çsñ',_binary '†#\Ûp\ÂtH¢A∫ÄTÑ\”V',NULL,_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ','SN-DEMO-004-6','IN_STOCK','2026-08-21 10:52:31'),(_binary '†#\Ûp˝rf¶\Ï1ô≠ëò',_binary '†#\Ûp\ÂtH¢A∫ÄTÑ\”V',NULL,_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ','SN-DEMO-005-6','IN_STOCK','2026-08-21 10:52:31'),(_binary '†#\Ûq\nsK§Ä¯≥ˇ$ªë',_binary '†#\Ûqsrïx-å\Ú0',NULL,_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ','SN-DEMO-001-7','IN_STOCK','2026-08-21 10:52:31'),(_binary '†#\Ûq\rqZÇ∞1/ë\Í',_binary '†#\Ûqsrïx-å\Ú0',NULL,_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ','SN-DEMO-002-7','IN_STOCK','2026-08-21 10:52:31'),(_binary '†#\Ûqv’èm+\›\\´ó≠',_binary '†#\Ûqsrïx-å\Ú0',NULL,_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ','SN-DEMO-003-7','IN_STOCK','2026-08-21 10:52:31'),(_binary '†#\Ûqr\ÛáS\‰Ö\ı5',_binary '†#\Ûqsrïx-å\Ú0',NULL,_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ','SN-DEMO-004-7','IN_STOCK','2026-08-21 10:52:31'),(_binary '†#\Ûq\ZqFß(§pç\Í',_binary '†#\Ûqsrïx-å\Ú0',NULL,_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ','SN-DEMO-005-7','IN_STOCK','2026-08-21 10:52:31'),(_binary '†#\Ûq&pæµ\Òl\»R\Ê',_binary '†#\Ûqp«∞\Ï\Ù8\⁄\—\Ë\—',NULL,_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ','SN-DEMO-001-8','IN_STOCK','2026-08-21 10:52:31'),(_binary '†#\Ûq*t˛åäg{éA\œk',_binary '†#\Ûqp«∞\Ï\Ù8\⁄\—\Ë\—',NULL,_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ','SN-DEMO-002-8','IN_STOCK','2026-08-21 10:52:31'),(_binary '†#\Ûq.wªî\"\·\ı2',_binary '†#\Ûqp«∞\Ï\Ù8\⁄\—\Ë\—',NULL,_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ','SN-DEMO-003-8','IN_STOCK','2026-08-21 10:52:31'),(_binary '†#\Ûq3p\Ïá\Ú˝–ã\Èp',_binary '†#\Ûqp«∞\Ï\Ù8\⁄\—\Ë\—',NULL,_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ','SN-DEMO-004-8','IN_STOCK','2026-08-21 10:52:31'),(_binary '†#\Ûq7r%≤í∞ñ\ËÖŸ≤',_binary '†#\Ûqp«∞\Ï\Ù8\⁄\—\Ë\—',NULL,_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ','SN-DEMO-005-8','IN_STOCK','2026-08-21 10:52:31'),(_binary '†#\ÛqAwµ;\‡	V†',_binary '†#\Ûq;sèµ≥0q}\¬˛∫',NULL,_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ','SN-DEMO-001-9','IN_STOCK','2026-08-21 10:52:31'),(_binary '†#\ÛqFtŒÜ˝9o†\·-',_binary '†#\Ûq;sèµ≥0q}\¬˛∫',NULL,_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ','SN-DEMO-002-9','IN_STOCK','2026-08-21 10:52:31'),(_binary '†#\ÛqJrÑ∑\ÿ5j\nû\Ÿb',_binary '†#\Ûq;sèµ≥0q}\¬˛∫',NULL,_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ','SN-DEMO-003-9','IN_STOCK','2026-08-21 10:52:31'),(_binary '†#\ÛqNpnù\Û;X\’V\ƒ',_binary '†#\Ûq;sèµ≥0q}\¬˛∫',NULL,_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ','SN-DEMO-004-9','IN_STOCK','2026-08-21 10:52:31'),(_binary '†#\ÛqQvÎªà†T›≠ì',_binary '†#\Ûq;sèµ≥0q}\¬˛∫',NULL,_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ','SN-DEMO-005-9','IN_STOCK','2026-08-21 10:52:31'),(_binary '†#\Ûq\\q.ñ\–\⁄|r\"',_binary '†#\ÛqUqå¶H∫àpsq',NULL,_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ','SN-DEMO-001-10','IN_STOCK','2026-08-21 10:52:31'),(_binary '†#\Ûq`u8ü\Ï\Í\√=Raf',_binary '†#\ÛqUqå¶H∫àpsq',NULL,_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ','SN-DEMO-002-10','IN_STOCK','2026-08-21 10:52:31'),(_binary '†#\Ûqdsnº@{ÿ∏oU|',_binary '†#\ÛqUqå¶H∫àpsq',NULL,_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ','SN-DEMO-003-10','IN_STOCK','2026-08-21 10:52:31'),(_binary '†#\Ûqis\Òâ;Pi\…7∫\Á',_binary '†#\ÛqUqå¶H∫àpsq',NULL,_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ','SN-DEMO-004-10','IN_STOCK','2026-08-21 10:52:31'),(_binary '†#\Ûqlq©Æ∏)yå\>c',_binary '†#\ÛqUqå¶H∫àpsq',NULL,_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ','SN-DEMO-005-10','IN_STOCK','2026-08-21 10:52:31'),(_binary '†#\Ûqyt_µD}V$_àø',_binary '†#\Ûqpu\‡¥,+Oú\ˆ¸',NULL,_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ','SN-DEMO-001-11','IN_STOCK','2026-08-21 10:52:31'),(_binary '†#\Ûq}tªΩm©6ëd\⁄',_binary '†#\Ûqpu\‡¥,+Oú\ˆ¸',NULL,_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ','SN-DEMO-002-11','IN_STOCK','2026-08-21 10:52:31'),(_binary '†#\ÛqÅshØ\ÛC∫]o\ı',_binary '†#\Ûqpu\‡¥,+Oú\ˆ¸',NULL,_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ','SN-DEMO-003-11','IN_STOCK','2026-08-21 10:52:32'),(_binary '†#\ÛqÖtï∂9\‰úfç•\À',_binary '†#\Ûqpu\‡¥,+Oú\ˆ¸',NULL,_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ','SN-DEMO-004-11','IN_STOCK','2026-08-21 10:52:32'),(_binary '†#\Ûqâv÷ÜZë1\·˝pj',_binary '†#\Ûqpu\‡¥,+Oú\ˆ¸',NULL,_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ','SN-DEMO-005-11','IN_STOCK','2026-08-21 10:52:32'),(_binary '†#\ÛqïwòWΩôx¯\¬',_binary '†#\Ûqçq^•UsEl\Í1',NULL,_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ','SN-DEMO-001-12','IN_STOCK','2026-08-21 10:52:32'),(_binary '†#\Ûqôp¯ü;\Êo_\ÌD\œ',_binary '†#\Ûqçq^•UsEl\Í1',NULL,_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ','SN-DEMO-002-12','IN_STOCK','2026-08-21 10:52:32'),(_binary '†#\Ûqùr©ìÆ/\À\√\˜ìT',_binary '†#\Ûqçq^•UsEl\Í1',NULL,_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ','SN-DEMO-003-12','IN_STOCK','2026-08-21 10:52:32'),(_binary '†#\Ûq†p1ªOú2.\‰,',_binary '†#\Ûqçq^•UsEl\Í1',NULL,_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ','SN-DEMO-004-12','IN_STOCK','2026-08-21 10:52:32'),(_binary '†#\Ûq§piüÈéÆck\⁄p',_binary '†#\Ûqçq^•UsEl\Í1',NULL,_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ','SN-DEMO-005-12','IN_STOCK','2026-08-21 10:52:32'),(_binary '†#\Ûq≤qπâ\‚¸Vô$N',_binary '†#\Ûq®uöûF\'¨\·ﬂ∫',NULL,_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ','SN-DEMO-001-13','IN_STOCK','2026-08-21 10:52:32'),(_binary '†#\Ûq∂uê∏§3‹º\–\Ã˛',_binary '†#\Ûq®uöûF\'¨\·ﬂ∫',NULL,_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ','SN-DEMO-002-13','IN_STOCK','2026-08-21 10:52:32'),(_binary '†#\Ûq∫sπ∏,\ÌÕñr',_binary '†#\Ûq®uöûF\'¨\·ﬂ∫',NULL,_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ','SN-DEMO-003-13','IN_STOCK','2026-08-21 10:52:32'),(_binary '†#\Ûqæu\Ì∏≥©™øv\‹\·',_binary '†#\Ûq®uöûF\'¨\·ﬂ∫',NULL,_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ','SN-DEMO-004-13','IN_STOCK','2026-08-21 10:52:32'),(_binary '†#\Ûq\¬s®πE˝†eµ{E',_binary '†#\Ûq®uöûF\'¨\·ﬂ∫',NULL,_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ','SN-DEMO-005-13','IN_STOCK','2026-08-21 10:52:32'),(_binary '†#\Ûq\Õs=¥LT\Ó™1ÇE',_binary '†#\Ûq\≈qÆ∏—î\’yÜ®Ö',NULL,_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ','SN-DEMO-001-14','IN_STOCK','2026-08-21 10:52:32'),(_binary '†#\Ûq\–pêä\»á“îH\≈',_binary '†#\Ûq\≈qÆ∏—î\’yÜ®Ö',NULL,_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ','SN-DEMO-002-14','IN_STOCK','2026-08-21 10:52:32'),(_binary '†#\Ûq\‘w‘Ñ6Bç\0≠ˇ',_binary '†#\Ûq\≈qÆ∏—î\’yÜ®Ö',NULL,_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ','SN-DEMO-003-14','IN_STOCK','2026-08-21 10:52:32'),(_binary '†#\Ûq\ÿtÿô\Ÿ\ÊOk\Úx',_binary '†#\Ûq\≈qÆ∏—î\’yÜ®Ö',NULL,_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ','SN-DEMO-004-14','IN_STOCK','2026-08-21 10:52:32'),(_binary '†#\Ûq\›tÈÆâ|/\”C\Ìc',_binary '†#\Ûq\≈qÆ∏—î\’yÜ®Ö',NULL,_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ','SN-DEMO-005-14','IN_STOCK','2026-08-21 10:52:32'),(_binary '†#\ÛrRsª∂MdŸµ\Ó[',_binary '†#\ÛrIq_õÑgÄ\‹dN˙',NULL,_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ','SN-DEMO-001-28','IN_STOCK','2026-08-21 10:52:32'),(_binary '†#\ÛrVs+Çz\ÍSß¸{',_binary '†#\ÛrIq_õÑgÄ\‹dN˙',NULL,_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ','SN-DEMO-002-28','IN_STOCK','2026-08-21 10:52:32'),(_binary '†#\ÛrZtb∂\"!mDµ¢',_binary '†#\ÛrIq_õÑgÄ\‹dN˙',NULL,_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ','SN-DEMO-003-28','IN_STOCK','2026-08-21 10:52:32'),(_binary '†#\Ûr]w°\'3\„\È\ÀW',_binary '†#\ÛrIq_õÑgÄ\‹dN˙',NULL,_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ','SN-DEMO-004-28','IN_STOCK','2026-08-21 10:52:32'),(_binary '†#\Ûrctü\—67Å≥',_binary '†#\ÛrIq_õÑgÄ\‹dN˙',NULL,_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ','SN-DEMO-005-28','IN_STOCK','2026-08-21 10:52:32'),(_binary '†#\Ûrorÿúî\È\‰^TcZ',_binary '†#\Ûrgq\Ô±6°JRä\∂',NULL,_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ','SN-DEMO-001-29','IN_STOCK','2026-08-21 10:52:32'),(_binary '†#\ÛrtuÀÆ`*CH\¬\‹J',_binary '†#\Ûrgq\Ô±6°JRä\∂',NULL,_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ','SN-DEMO-002-29','IN_STOCK','2026-08-21 10:52:32'),(_binary '†#\Ûrwv˚§åT\œLÉM\È',_binary '†#\Ûrgq\Ô±6°JRä\∂',NULL,_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ','SN-DEMO-003-29','IN_STOCK','2026-08-21 10:52:32'),(_binary '†#\Ûr{pØûmó\◊\Ûì™',_binary '†#\Ûrgq\Ô±6°JRä\∂',NULL,_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ','SN-DEMO-004-29','IN_STOCK','2026-08-21 10:52:32'),(_binary '†#\ÛrtÄõ\ﬁ\Î0\Ó≤;',_binary '†#\Ûrgq\Ô±6°JRä\∂',NULL,_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ','SN-DEMO-005-29','IN_STOCK','2026-08-21 10:52:32');
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
  `trigger_event` enum('SALE_CREATED','COLLECTION_RECEIPT','PAYMENT_OVERDUE','CUSTOM','DIRECT_SALE_CREATED','PAYMENT_REMINDER') NOT NULL,
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
INSERT INTO `sms_logs` VALUES (_binary '†#\Ûs\ZtmØ`ùªÇ8\Ï',_binary '†#\ÛrÑv\Ó∏\‘¯>àëäª','SALE_CREATED',_binary '†#\ÛròuÉã\"å•L\Íz','0771111111','Dear Demo Customer One, thank you for purchasing 1x LG 65\' 4K Smart TV! We\'ve received your downpayment of Rs.30000.00. Your next installment of Rs.11000.00 is due on 21/09/2026. Thank you for choosing Master House!','SENT','{\"status\":\"success\",\"message\":\"Simulated sending\"}','2026-08-21 10:52:32','2026-08-21 10:52:32'),(_binary '†#\ÛsQw´ùé?™\rë',_binary '†#\ÛrÑv\Ó∏\‘¯>àëäª','COLLECTION_RECEIPT',_binary '†#\Ûs\'u…º≈ñ¡>∑4D','0771111111','Dear Demo Customer One, we have received your payment of Rs.{{paid_amount}}. Your remaining balance is Rs.{{balance}}. - Master House (Support)','PENDING',NULL,'2026-08-21 10:52:32',NULL);
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
  `trigger_event` enum('SALE_CREATED','COLLECTION_RECEIPT','PAYMENT_OVERDUE','DIRECT_SALE_CREATED','PAYMENT_REMINDER') NOT NULL,
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
INSERT INTO `sms_templates` VALUES (_binary '†#\Û_qªÆº\\⁄q\»\Û','SALE_CREATED','Dear {{name}}, thank you for purchasing {{product_name}}! We\'ve received your downpayment of Rs.{{downpayment}}. {{upcoming_dues_message}} Thank you for choosing {{company_name}}!',1,'2026-08-21 10:52:27','2026-08-21 10:52:27'),(_binary '†#\Û_qƒªPÅ£ëÃî','COLLECTION_RECEIPT','Dear {{name}}, we have received your payment of Rs.{{paid_amount}}. Your remaining balance is Rs.{{balance}}. - {{company_name}} ({{branch_phone}})',1,'2026-08-21 10:52:27','2026-08-21 10:52:27'),(_binary '†#\Û_#v\Ûúô«©`J\Ú	','PAYMENT_OVERDUE','Dear {{name}}, your payment of Rs.{{missed_amount}} due on {{due_date}} is overdue. A penalty of Rs.{{penalty_added}} has been added. Pending total: Rs.{{total_pending}}. Call {{branch_phone}}. - {{company_name}}',1,'2026-08-21 10:52:27','2026-08-21 10:52:27'),(_binary '†#\Û_\'q\Ôºq~\ﬁR±πF','DIRECT_SALE_CREATED','Dear {{name}}, thank you for your direct purchase of {{product_name}}. We have received your payment of Rs.{{paid_amount}}. Thank you for choosing {{company_name}}!',1,'2026-08-21 10:52:27','2026-08-21 10:52:27'),(_binary '†#\Û_,qÿ®\∆Gnºéq','PAYMENT_REMINDER','Dear {{name}}, this is a friendly reminder from {{company_name}} that your installment of Rs.{{amount_due}} is due on {{due_date}}. Please ensure payment to avoid late fees. Call {{branch_phone}}.',1,'2026-08-21 10:52:27','2026-08-21 10:52:27');
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
INSERT INTO `system_settings` VALUES ('company_name','Master House',_binary '†#\Û^£t\Ïì;∆ænY\Ê','2026-08-21 10:52:27'),('downpayment_partial_recovery_days_max','14',_binary '†#\Û^£t\Ïì;∆ænY\Ê','2026-08-21 10:52:32'),('enable_overdue_penalties','true',_binary '†#\Û^£t\Ïì;∆ænY\Ê','2026-08-21 10:52:27'),('sms_reminder_days','2',_binary '†#\Û^£t\Ïì;∆ænY\Ê','2026-08-21 10:52:27');
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
INSERT INTO `user_branches` VALUES (_binary '†#\Û^£t\Ïì;∆ænY\Ê',_binary '†#\Û^ötYì˘q√°õP'),(_binary 'π\Î`\ﬂqNpø¥˚\⁄\Ìt',_binary '†#\Û^ötYì˘q√°õP');
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
  `phone_number` varchar(50) DEFAULT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role_id` binary(16) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `max_discount_percentage` decimal(5,2) NOT NULL DEFAULT '0.00',
  `profile_picture_url` varchar(500) DEFAULT NULL,
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
INSERT INTO `users` VALUES (_binary '†#\Û^£t\Ïì;∆ænY\Ê','admin@masterhouse.lk','System Admin',NULL,'05b2b6602676d95b40177a9ca51160a2:f67680c5da0865bfee2c097486b8106c506e2329ac041d94fa1bb5294dd4dfbb6134a1812d6db8b2b37d73f2e1e9fe0877bc792ae06d0a3d909dd128e7cc153a',_binary '†#\Û[@q®;7v',1,0.00,NULL,'2026-08-21 10:52:27'),(_binary 'π\Î`\ﬂqNpø¥˚\⁄\Ìt','demo@masterhouse.lk','Demo Admin',NULL,'a775467875d51eaa964a6549faef22df:6ea4cb05d30b5307643297a1924e39026314db4e1360179a198660af034fae7884daea116dd647809846ff2ddd9bce8890916a6f2e7260091f67d2183daae099',_binary '†#\Û[@q®;7v',1,0.00,NULL,'2026-08-21 10:52:32');
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
INSERT INTO `warehouses` VALUES (_binary '†#\Ûo≤u\ZÜ\\Ñef„ÄØ',_binary '†#\Û^ötYì˘q√°õP','Demo Backroom','456 Demo Avenue',NULL,0,1,'2026-08-21 10:52:31');
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

--
-- Dumping routines for database 'masterhouse_fresh_demo'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-08-21 16:22:33
