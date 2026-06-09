-- MySQL dump 10.13  Distrib 8.0.46, for Linux (x86_64)
--
-- Host: localhost    Database: myphone
-- ------------------------------------------------------
-- Server version	8.0.46

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
-- Table structure for table `admin_accounts`
--

DROP TABLE IF EXISTS `admin_accounts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `admin_accounts` (
  `admin_id` int unsigned NOT NULL AUTO_INCREMENT,
  `username` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `full_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role_id` int unsigned NOT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `address` text COLLATE utf8mb4_unicode_ci,
  `deleted_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`admin_id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`),
  KEY `role_id` (`role_id`),
  CONSTRAINT `admin_accounts_ibfk_1` FOREIGN KEY (`role_id`) REFERENCES `roles` (`role_id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `admin_accounts`
--

LOCK TABLES `admin_accounts` WRITE;
/*!40000 ALTER TABLE `admin_accounts` DISABLE KEYS */;
INSERT INTO `admin_accounts` VALUES (1,'buivanha','$2a$10$v32tpPA78Mk8talOdq4Rb.EV5bxPJg8UMkAfBSB1tdGo3LLk.hYj6','Bùi Văn Hà','buivanha@gmail.com','0978603382',1,'2026-04-20 16:02:50','2026-05-18 05:38:53','Đan Phượng, Hà Nội',NULL),(2,'xuanmai','$2a$10$KsliKCskYWGlKORsHPrOuuzGOuXauhHCOPIXHv5CRx/PO51D6wM7q','Nguyễn Thị Xuân Mai','nguyenthixuanmai@gmail.com','0978603383',1,'2026-04-21 13:50:54','2026-05-13 12:30:43','Lạng Giang, Bắc Giang',NULL),(3,'ngocphong','$2a$10$oxjcSJOAIkaxpNg7LfPj5OqCCwZ5y0uSLAt2XCHphhvobLvWr79ui','Trần Ngọc Phong','trangngocphong@gmail.com','0978603392',2,'2026-05-06 12:24:40','2026-05-06 12:26:05','Sầm Sơn, Thanh Hóa',NULL),(4,'thanhduong','$2a$10$DZepOB8EN3hlM45gaYNsneSq1zKzk0s3sx7JT0.flq87tFc4QvmCO','Nguyễn Thanh Dương','nguyenthanhduong@gmail.com','0978603393',2,'2026-05-06 12:27:42','2026-05-06 12:27:42','Sapa, Lào Cai',NULL);
/*!40000 ALTER TABLE `admin_accounts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bank_settings`
--

DROP TABLE IF EXISTS `bank_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bank_settings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `bank_bin` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT '970422',
  `account_number` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `account_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bank_settings`
--

LOCK TABLES `bank_settings` WRITE;
/*!40000 ALTER TABLE `bank_settings` DISABLE KEYS */;
INSERT INTO `bank_settings` VALUES (1,'970422','0978603382','Bùi Văn Hà',1);
/*!40000 ALTER TABLE `bank_settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bank_transactions`
--

DROP TABLE IF EXISTS `bank_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bank_transactions` (
  `transaction_id` int unsigned NOT NULL AUTO_INCREMENT,
  `transaction_code` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `amount` decimal(15,2) NOT NULL,
  `transfer_content` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `transfer_time` datetime DEFAULT NULL,
  `is_matched` tinyint(1) DEFAULT '0',
  `matched_order_id` int unsigned DEFAULT NULL,
  `payment_attempt_id` int DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `matched_by_admin_id` int unsigned DEFAULT NULL,
  `reconcile_status` enum('PENDING','MATCHED','REJECTED','DELETED') COLLATE utf8mb4_unicode_ci DEFAULT 'PENDING',
  `rejected_reason` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `account_number` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bank_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `deleted_at` datetime(6) DEFAULT NULL,
  `raw_data` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`transaction_id`),
  UNIQUE KEY `uk_transaction_code` (`transaction_code`),
  KEY `matched_order_id` (`matched_order_id`),
  KEY `idx_bank_transactions_content` (`transfer_content`),
  KEY `idx_bank_transactions_amount` (`amount`),
  KEY `fk_bank_transactions_admin` (`matched_by_admin_id`),
  KEY `fk_bank_transactions_payment_attempt` (`payment_attempt_id`),
  CONSTRAINT `bank_transactions_ibfk_1` FOREIGN KEY (`matched_order_id`) REFERENCES `orders` (`order_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_bank_transactions_admin` FOREIGN KEY (`matched_by_admin_id`) REFERENCES `admin_accounts` (`admin_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_bank_transactions_payment_attempt` FOREIGN KEY (`payment_attempt_id`) REFERENCES `payment_attempts` (`attempt_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bank_transactions`
--

LOCK TABLES `bank_transactions` WRITE;
/*!40000 ALTER TABLE `bank_transactions` DISABLE KEYS */;
/*!40000 ALTER TABLE `bank_transactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `banner_images`
--

DROP TABLE IF EXISTS `banner_images`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `banner_images` (
  `banner_image_id` int unsigned NOT NULL AUTO_INCREMENT,
  `banner_id` int unsigned NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `subtitle` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `image_url` varchar(1024) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sort_order` int DEFAULT '0',
  `created_at` datetime DEFAULT NULL,
  `link_url` varchar(1024) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`banner_image_id`),
  KEY `banner_id` (`banner_id`),
  CONSTRAINT `banner_images_ibfk_1` FOREIGN KEY (`banner_id`) REFERENCES `banners` (`banner_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `banner_images`
--

LOCK TABLES `banner_images` WRITE;
/*!40000 ALTER TABLE `banner_images` DISABLE KEYS */;
INSERT INTO `banner_images` VALUES (1,1,'🔥 Ưu đãi cực sốc hôm nay!','Giảm đến 50% – Số lượng có hạn, mua ngay kẻo lỡ!','http://localhost:8080/api/files/banners/5c4763c0-b264-4226-9e97-57a62d95a116.png',0,'2026-05-01 16:02:07',NULL),(2,1,'✨ Trải nghiệm công nghệ mới','Hiệu năng vượt trội – Thiết kế hiện đại – Giá hợp lý','http://localhost:8080/api/files/banners/4f6ac0c1-781f-4915-9601-7070c09af05a.png',1,'2026-05-01 16:02:07',NULL),(3,1,'💎 Chất lượng tạo nên khác biệt','Cam kết uy tín – Đồng hành cùng bạn mỗi ngày','http://localhost:8080/api/files/banners/4b4a2a39-3a78-4ac1-9d91-6b19a70d9abd.png',2,'2026-05-01 16:02:07',NULL);
/*!40000 ALTER TABLE `banner_images` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `banners`
--

DROP TABLE IF EXISTS `banners`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `banners` (
  `banner_id` int unsigned NOT NULL AUTO_INCREMENT,
  `position` enum('SLIDER','TOP','MIDDLE','BOTTOM') COLLATE utf8mb4_unicode_ci DEFAULT 'SLIDER',
  `is_active` tinyint(1) DEFAULT '1',
  `start_date` datetime DEFAULT NULL,
  `end_date` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `deleted_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`banner_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `banners`
--

LOCK TABLES `banners` WRITE;
/*!40000 ALTER TABLE `banners` DISABLE KEYS */;
INSERT INTO `banners` VALUES (1,'SLIDER',1,'2026-05-01 16:00:00','2026-05-15 16:00:00','2026-05-01 16:02:06','2026-05-01 16:02:06',NULL);
/*!40000 ALTER TABLE `banners` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `brand_images`
--

DROP TABLE IF EXISTS `brand_images`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `brand_images` (
  `brand_image_id` int unsigned NOT NULL AUTO_INCREMENT,
  `brand_id` int unsigned NOT NULL,
  `image_url` varchar(1024) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sort_order` int DEFAULT '0',
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`brand_image_id`),
  KEY `brand_id` (`brand_id`),
  CONSTRAINT `brand_images_ibfk_1` FOREIGN KEY (`brand_id`) REFERENCES `brands` (`brand_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `brand_images`
--

LOCK TABLES `brand_images` WRITE;
/*!40000 ALTER TABLE `brand_images` DISABLE KEYS */;
INSERT INTO `brand_images` VALUES (1,1,'http://localhost:8080/api/files/brands/fdea6d5c-433c-4b47-a1ad-f0ee3502161a.png',0,'2026-04-20 16:50:17'),(2,2,'http://localhost:8080/api/files/brands/30f8ddbc-22b8-4370-af6c-a2d883e2be94.png',0,'2026-04-20 16:50:40'),(3,3,'http://localhost:8080/api/files/brands/eb5be9ce-0a6e-429f-890d-e426e6974c5e.png',0,'2026-04-20 16:51:11'),(4,4,'http://localhost:8080/api/files/brands/b8980129-fca3-4c82-a2f1-37a0347d7a0c.png',0,'2026-04-20 16:51:38'),(5,5,'http://localhost:8080/api/files/brands/ea04127a-bd95-4ab5-a27c-de0b5aa2c3a0.png',0,'2026-04-20 16:52:00'),(6,6,'http://localhost:8080/api/files/brands/a1293411-e81a-4f2a-bbaa-c48b1f8b57a6.png',0,'2026-04-20 16:52:33'),(7,7,'http://localhost:8080/api/files/brands/e8d0c772-23f9-4c70-8508-8ffb6cdfef82.png',0,'2026-04-20 16:53:08');
/*!40000 ALTER TABLE `brand_images` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `brands`
--

DROP TABLE IF EXISTS `brands`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `brands` (
  `brand_id` int unsigned NOT NULL AUTO_INCREMENT,
  `brand_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `brand_description` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `deleted_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`brand_id`),
  UNIQUE KEY `brand_name` (`brand_name`),
  UNIQUE KEY `slug` (`slug`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `brands`
--

LOCK TABLES `brands` WRITE;
/*!40000 ALTER TABLE `brands` DISABLE KEYS */;
INSERT INTO `brands` VALUES (1,'Apple','apple','Apple là tập đoàn công nghệ đa quốc gia có trụ sở tại Mỹ, được thành lập năm 1976 và là một trong những thương hiệu giá trị nhất thế giới. Công ty nổi tiếng với việc thiết kế và sản xuất các sản phẩm công nghệ cao cấp như iPhone, iPad, MacBook, Apple Watch và hệ điều hành iOS. Apple luôn chú trọng đến trải nghiệm người dùng, thiết kế tinh tế, hiệu năng ổn định và khả năng bảo mật cao.\n\nNgoài phần cứng, Apple còn xây dựng một hệ sinh thái phần mềm và dịch vụ mạnh mẽ, giúp các thiết bị kết nối và hoạt động đồng bộ với nhau. Nhờ chiến lược tập trung vào chất lượng và thương hiệu cao cấp, Apple luôn nằm trong nhóm dẫn đầu thị trường smartphone toàn cầu, đặc biệt ở phân khúc cao cấp.','2026-04-20 16:50:17','2026-05-07 05:27:03',NULL),(2,'Samsung','samsung','Samsung là tập đoàn công nghệ lớn nhất Hàn Quốc và là một trong những nhà sản xuất smartphone hàng đầu thế giới. Công ty được thành lập năm 1969 và nổi tiếng với dòng sản phẩm Galaxy, bao gồm các thiết bị từ phổ thông đến cao cấp như Galaxy A, Galaxy S và Galaxy Z (điện thoại gập).\n\nSamsung có thế mạnh về công nghệ màn hình, chip xử lý, pin và camera, đồng thời là nhà sản xuất linh kiện điện tử lớn cho nhiều thương hiệu khác. Công ty luôn tiên phong trong việc phát triển công nghệ mới như màn hình AMOLED, điện thoại gập và kết nối 5G. Với danh mục sản phẩm đa dạng và mạng lưới phân phối rộng khắp, Samsung giữ vị trí quan trọng trong ngành công nghiệp điện tử toàn cầu.','2026-04-20 16:50:40','2026-04-20 16:50:40',NULL),(3,'Xiaomi','xiaomi','Xiaomi là công ty công nghệ đến từ Trung Quốc, được thành lập năm 2010 và nhanh chóng trở thành một trong những thương hiệu smartphone lớn nhất thế giới. Xiaomi nổi tiếng với chiến lược cung cấp sản phẩm cấu hình mạnh, thiết kế hiện đại với mức giá cạnh tranh, giúp người dùng tiếp cận công nghệ mới với chi phí hợp lý.\n\nNgoài smartphone, Xiaomi còn phát triển một hệ sinh thái thiết bị thông minh phong phú như đồng hồ thông minh, tai nghe, tivi, robot hút bụi và các thiết bị nhà thông minh. Công ty tập trung vào đổi mới công nghệ, tối ưu hiệu năng và trải nghiệm người dùng, đặc biệt trong phân khúc tầm trung và giá rẻ.','2026-04-20 16:51:11','2026-04-20 16:51:11',NULL),(4,'Oppo','oppo','OPPO là thương hiệu smartphone nổi tiếng thuộc tập đoàn BBK Electronics của Trung Quốc, được thành lập năm 2004. Công ty được biết đến với các sản phẩm có thiết kế đẹp, camera chất lượng cao và công nghệ sạc nhanh tiên tiến như VOOC và SuperVOOC.\n\nOPPO tập trung mạnh vào nghiên cứu và phát triển công nghệ chụp ảnh, màn hình và pin, đồng thời hướng đến nhóm khách hàng trẻ với phong cách thời trang và hiện đại. Các dòng sản phẩm nổi bật của OPPO bao gồm OPPO Reno, OPPO Find và OPPO A, phục vụ nhiều phân khúc thị trường khác nhau.','2026-04-20 16:51:38','2026-04-20 16:51:38',NULL),(5,'Vivo','vivo','Vivo là thương hiệu smartphone thuộc tập đoàn BBK Electronics, được thành lập năm 2009 tại Trung Quốc. Công ty nổi tiếng với việc phát triển các công nghệ tiên tiến trong lĩnh vực camera, âm thanh và thiết kế điện thoại mỏng nhẹ.\n\nVivo tập trung vào trải nghiệm người dùng, đặc biệt là trong việc chụp ảnh và quay video. Các sản phẩm của Vivo thường có thiết kế trẻ trung, hiệu năng ổn định và mức giá cạnh tranh. Dòng sản phẩm chính của Vivo bao gồm Vivo Y, Vivo V và Vivo X, đáp ứng nhu cầu từ phổ thông đến cao cấp.','2026-04-20 16:52:00','2026-04-20 16:52:00',NULL),(6,'Huawei','huawei','Huawei là tập đoàn công nghệ và viễn thông lớn của Trung Quốc, được thành lập năm 1987. Công ty là một trong những nhà cung cấp thiết bị viễn thông và smartphone lớn nhất thế giới. Huawei nổi tiếng với việc đầu tư mạnh vào nghiên cứu và phát triển (R&D), đặc biệt trong lĩnh vực mạng 5G, chip xử lý và công nghệ camera.\n\nCác dòng smartphone của Huawei như Mate và P series được đánh giá cao về chất lượng camera, pin và hiệu năng. Ngoài smartphone, Huawei còn phát triển nhiều sản phẩm công nghệ khác như thiết bị mạng, laptop, tablet và thiết bị đeo thông minh. Công ty đóng vai trò quan trọng trong ngành công nghiệp viễn thông toàn cầu.','2026-04-20 16:52:33','2026-04-20 16:52:33',NULL),(7,'Google','google','Google là tập đoàn công nghệ đa quốc gia của Mỹ, được thành lập năm 1998 và nổi tiếng với công cụ tìm kiếm Google cùng nhiều dịch vụ trực tuyến khác như Gmail, Google Maps và YouTube. Trong lĩnh vực smartphone, Google phát triển hệ điều hành Android – nền tảng di động phổ biến nhất thế giới.\n\nNgoài phần mềm, Google cũng sản xuất dòng điện thoại Pixel, được thiết kế để mang lại trải nghiệm Android thuần túy, cập nhật phần mềm nhanh chóng và khả năng chụp ảnh thông minh nhờ trí tuệ nhân tạo (AI). Google đóng vai trò quan trọng trong việc định hình hệ sinh thái công nghệ di động toàn cầu.','2026-04-20 16:53:08','2026-04-20 16:53:08',NULL);
/*!40000 ALTER TABLE `brands` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cart_items`
--

DROP TABLE IF EXISTS `cart_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cart_items` (
  `cart_item_id` int unsigned NOT NULL AUTO_INCREMENT,
  `cart_id` int unsigned NOT NULL,
  `variant_id` int unsigned NOT NULL,
  `quantity` int DEFAULT '1',
  `product_color_id` int DEFAULT NULL,
  `product_id` int NOT NULL,
  PRIMARY KEY (`cart_item_id`),
  UNIQUE KEY `cart_id` (`cart_id`,`variant_id`),
  KEY `variant_id` (`variant_id`),
  CONSTRAINT `cart_items_ibfk_1` FOREIGN KEY (`cart_id`) REFERENCES `carts` (`cart_id`) ON DELETE CASCADE,
  CONSTRAINT `cart_items_ibfk_2` FOREIGN KEY (`variant_id`) REFERENCES `product_variants` (`variant_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=53 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cart_items`
--

LOCK TABLES `cart_items` WRITE;
/*!40000 ALTER TABLE `cart_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `cart_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `carts`
--

DROP TABLE IF EXISTS `carts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `carts` (
  `cart_id` int unsigned NOT NULL AUTO_INCREMENT,
  `customer_id` int unsigned NOT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`cart_id`),
  UNIQUE KEY `customer_id` (`customer_id`),
  CONSTRAINT `carts_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customer_accounts` (`customer_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `carts`
--

LOCK TABLES `carts` WRITE;
/*!40000 ALTER TABLE `carts` DISABLE KEYS */;
INSERT INTO `carts` VALUES (1,1,'2026-04-21 14:03:05','2026-04-21 14:03:05'),(2,2,'2026-04-23 04:42:03','2026-04-23 04:42:03'),(3,3,'2026-04-27 06:13:44','2026-04-27 06:13:44'),(4,4,'2026-04-27 13:41:22','2026-04-27 13:41:22'),(5,5,'2026-05-07 10:24:03','2026-05-07 10:24:03'),(6,6,'2026-05-10 04:57:15','2026-05-10 04:57:15');
/*!40000 ALTER TABLE `carts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `categories`
--

DROP TABLE IF EXISTS `categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `categories` (
  `category_id` int unsigned NOT NULL AUTO_INCREMENT,
  `category_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `category_description` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `deleted_at` datetime(6) DEFAULT NULL,
  `price_from` decimal(15,2) DEFAULT NULL,
  `price_to` decimal(15,2) DEFAULT NULL,
  PRIMARY KEY (`category_id`),
  UNIQUE KEY `category_name` (`category_name`),
  UNIQUE KEY `slug` (`slug`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categories`
--

LOCK TABLES `categories` WRITE;
/*!40000 ALTER TABLE `categories` DISABLE KEYS */;
INSERT INTO `categories` VALUES (1,'Điện thoại cao cấp','cao-cap','Danh mục điện thoại cao cấp trên 20 triệu đồng bao gồm các sản phẩm smartphone thuộc phân khúc flagship đến từ những thương hiệu hàng đầu như Apple Inc., Samsung Electronics, Xiaomi Corporation, OPPO và Huawei Technologies. Đây là những thiết bị được trang bị công nghệ tiên tiến nhất, đáp ứng nhu cầu sử dụng cao cấp và trải nghiệm tối ưu cho người dùng.\n\nCác sản phẩm trong danh mục này thường sở hữu cấu hình mạnh mẽ với chip xử lý hiệu năng cao, màn hình chất lượng cao như OLED hoặc AMOLED, camera chuyên nghiệp, dung lượng RAM và bộ nhớ lớn, cùng nhiều tính năng hiện đại như sạc nhanh, chống nước, bảo mật sinh trắc học và kết nối 5G. Ngoài ra, điện thoại cao cấp còn được chú trọng về thiết kế sang trọng, vật liệu cao cấp và độ hoàn thiện tinh xảo.\n\nDanh mục điện thoại trên 20 triệu đồng phù hợp với người dùng có nhu cầu sử dụng thiết bị cao cấp để làm việc, giải trí, chụp ảnh, chơi game hoặc trải nghiệm các công nghệ mới nhất. Đây cũng là phân khúc thể hiện đẳng cấp, phong cách cá nhân và sự đầu tư vào chất lượng sản phẩm trong thời gian dài.','2026-04-20 16:54:50','2026-04-20 16:54:50',NULL,NULL,NULL),(2,'Điện thoại cận cao cấp','can-cao-cap','Danh mục điện thoại cận cao cấp trong khoảng giá từ 10 đến 20 triệu đồng bao gồm các dòng smartphone có hiệu năng mạnh mẽ, thiết kế hiện đại và nhiều công nghệ tiên tiến, nhưng vẫn có mức giá hợp lý hơn so với phân khúc flagship. Các sản phẩm trong phân khúc này thường đến từ những thương hiệu uy tín như Samsung Electronics, Xiaomi Corporation, OPPO, Vivo và Apple Inc..\n\nNhững thiết bị thuộc phân khúc cận cao cấp thường được trang bị chip xử lý hiệu năng cao, màn hình chất lượng tốt như AMOLED hoặc OLED với tần số quét cao, hệ thống camera đa ống kính cho khả năng chụp ảnh sắc nét, cùng dung lượng RAM và bộ nhớ lớn đáp ứng tốt nhu cầu làm việc, giải trí và chơi game. Ngoài ra, các tính năng hiện đại như sạc nhanh, pin dung lượng lớn, kết nối 5G và bảo mật sinh trắc học cũng là tiêu chuẩn phổ biến trong phân khúc này.\n\nĐiện thoại cận cao cấp từ 10 đến 20 triệu đồng phù hợp với người dùng muốn trải nghiệm hiệu năng mạnh, thiết kế đẹp và nhiều tính năng cao cấp nhưng không cần đầu tư quá nhiều chi phí như các dòng flagship. Đây là phân khúc được lựa chọn phổ biến nhờ sự cân bằng giữa giá thành và hiệu suất sử dụng trong thời gian dài.','2026-04-20 16:55:57','2026-04-20 16:55:57',NULL,NULL,NULL),(3,'Điện thoại tầm trung','tam-trung','Danh mục điện thoại tầm trung trong khoảng giá từ 5 đến 10 triệu đồng bao gồm các sản phẩm smartphone có hiệu năng ổn định, thiết kế hiện đại và đáp ứng tốt các nhu cầu sử dụng hàng ngày như học tập, làm việc, giải trí và chụp ảnh. Các thiết bị trong phân khúc này thường đến từ những thương hiệu phổ biến và uy tín như Samsung Electronics, Xiaomi Corporation, OPPO, Vivo và Realme.\n\nNhững smartphone thuộc phân khúc tầm trung thường được trang bị chip xử lý đủ mạnh để chạy mượt các ứng dụng phổ biến, màn hình lớn với độ phân giải cao, dung lượng RAM từ 6GB đến 12GB và bộ nhớ trong đủ dùng cho nhu cầu lưu trữ ảnh, video và ứng dụng. Ngoài ra, các tính năng như camera nhiều ống kính, pin dung lượng lớn, sạc nhanh và kết nối 4G hoặc 5G cũng ngày càng phổ biến trong phân khúc này.\n\nĐiện thoại tầm trung từ 5 đến 10 triệu đồng là lựa chọn phù hợp cho đa số người dùng nhờ sự cân bằng giữa hiệu năng, tính năng và giá thành. Đây là phân khúc được ưa chuộng trên thị trường vì đáp ứng tốt nhu cầu sử dụng lâu dài với chi phí hợp lý, đặc biệt phù hợp cho học sinh, sinh viên, nhân viên văn phòng và người dùng phổ thông.','2026-04-20 16:58:29','2026-04-20 16:58:29',NULL,NULL,NULL),(4,'Điện thoại giá rẻ','gia-re','Danh mục điện thoại giá rẻ dưới 5 triệu đồng bao gồm các sản phẩm smartphone có mức giá phải chăng, phù hợp với người dùng cần thiết bị phục vụ các nhu cầu cơ bản như nghe gọi, nhắn tin, lướt web, học tập và giải trí nhẹ. Các sản phẩm trong phân khúc này thường đến từ những thương hiệu phổ biến như Samsung Electronics, Xiaomi Corporation, OPPO, Vivo và Realme.\n\nNhững smartphone thuộc phân khúc giá rẻ hiện nay vẫn được trang bị cấu hình đủ dùng cho các tác vụ hàng ngày, màn hình lớn, pin dung lượng cao và camera đáp ứng nhu cầu chụp ảnh cơ bản. Nhiều mẫu máy dưới 5 triệu đồng đã có hiệu năng ổn định, pin bền và thiết kế hiện đại, giúp người dùng có trải nghiệm tốt mà không cần chi phí cao.\n\nNgoài ra, điện thoại giá rẻ thường có dung lượng pin khoảng 5.000 mAh trở lên, cho phép sử dụng cả ngày dài, cùng khả năng chạy mượt các ứng dụng phổ biến và game nhẹ. Đây là phân khúc được lựa chọn nhiều bởi học sinh, sinh viên và người lao động nhờ chi phí thấp nhưng vẫn đáp ứng tốt nhu cầu sử dụng cơ bản.\n\nĐiện thoại dưới 5 triệu đồng là lựa chọn phù hợp cho người dùng cần một thiết bị bền bỉ, tiết kiệm chi phí và dễ tiếp cận, đặc biệt thích hợp làm điện thoại phụ, điện thoại cho người lớn tuổi hoặc người mới bắt đầu sử dụng smartphone.','2026-04-20 16:59:51','2026-04-20 16:59:51',NULL,NULL,NULL);
/*!40000 ALTER TABLE `categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `category_images`
--

DROP TABLE IF EXISTS `category_images`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `category_images` (
  `category_image_id` int unsigned NOT NULL AUTO_INCREMENT,
  `category_id` int unsigned NOT NULL,
  `image_url` varchar(1024) COLLATE utf8mb4_unicode_ci NOT NULL,
  `image_type` enum('THUMBNAIL','BANNER','ICON','SLIDER') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sort_order` int DEFAULT '0',
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`category_image_id`),
  KEY `category_id` (`category_id`),
  CONSTRAINT `category_images_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `categories` (`category_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `category_images`
--

LOCK TABLES `category_images` WRITE;
/*!40000 ALTER TABLE `category_images` DISABLE KEYS */;
INSERT INTO `category_images` VALUES (5,1,'http://localhost:8080/api/files/categories/dfbeb6e7-1b54-4dd6-9ebf-fb3b8bac354d.png','THUMBNAIL',0,'2026-04-20 18:33:47','2026-04-20 18:33:46.500034'),(6,2,'http://localhost:8080/api/files/categories/8d692c92-f463-4150-aabd-680fea4f1afa.png','THUMBNAIL',0,'2026-04-20 18:34:01','2026-04-20 18:34:00.993362'),(7,3,'http://localhost:8080/api/files/categories/e06cba30-0c93-4ab3-962b-617d30ef6234.png','THUMBNAIL',0,'2026-04-20 18:34:17','2026-04-20 18:34:17.200185'),(8,4,'http://localhost:8080/api/files/categories/640a632a-b9d7-4bd0-ba6d-755e94a054fa.png','THUMBNAIL',0,'2026-04-20 18:34:32','2026-04-20 18:34:32.460068');
/*!40000 ALTER TABLE `category_images` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `category_price_segments`
--

DROP TABLE IF EXISTS `category_price_segments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `category_price_segments` (
  `category_price_segment_id` int unsigned NOT NULL AUTO_INCREMENT,
  `category_id` int unsigned NOT NULL,
  `price_segment_id` int unsigned NOT NULL,
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`category_price_segment_id`),
  UNIQUE KEY `uk_category_segment` (`category_id`,`price_segment_id`),
  KEY `price_segment_id` (`price_segment_id`),
  CONSTRAINT `category_price_segments_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `categories` (`category_id`) ON DELETE CASCADE,
  CONSTRAINT `category_price_segments_ibfk_2` FOREIGN KEY (`price_segment_id`) REFERENCES `price_segments` (`price_segment_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `category_price_segments`
--

LOCK TABLES `category_price_segments` WRITE;
/*!40000 ALTER TABLE `category_price_segments` DISABLE KEYS */;
INSERT INTO `category_price_segments` VALUES (1,1,1,'2026-04-20 18:33:46'),(2,2,2,'2026-04-20 18:34:01'),(3,3,3,'2026-04-20 18:34:17'),(4,4,4,'2026-04-20 18:34:32');
/*!40000 ALTER TABLE `category_price_segments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `chat_messages`
--

DROP TABLE IF EXISTS `chat_messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `chat_messages` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `content` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `cost_usd` decimal(12,6) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  `input_tokens` int DEFAULT NULL,
  `model_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `output_tokens` int DEFAULT NULL,
  `role` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `session_id` bigint NOT NULL,
  `user_id` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `chat_messages`
--

LOCK TABLES `chat_messages` WRITE;
/*!40000 ALTER TABLE `chat_messages` DISABLE KEYS */;
INSERT INTO `chat_messages` VALUES (1,'📱 Tư vấn iPhone đời mới nhất',NULL,'2026-05-10 06:30:40.291290',8,NULL,NULL,'user',1,NULL),(2,'🔋 Điện thoại pin trâu, giá hời?',NULL,'2026-05-10 06:35:09.689575',8,NULL,NULL,'user',2,NULL),(3,'Shop có nhiều mẫu điện thoại pin trâu, giá cả phải chăng. Bạn có thể tham khảo Samsung Galaxy M52, Oppo A76, hoặc Xiaomi Redmi 10. Giá từ 4-7 triệu đồng. Bạn muốn biết thêm thông tin về mẫu nào?',0.000159,'2026-05-10 06:35:10.761688',112,'llama-3.3-70b-versatile',58,'assistant',2,NULL);
/*!40000 ALTER TABLE `chat_messages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `chat_sessions`
--

DROP TABLE IF EXISTS `chat_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `chat_sessions` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `guest_session_id` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` bit(1) NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updated_at` datetime(6) NOT NULL,
  `user_id` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `chat_sessions`
--

LOCK TABLES `chat_sessions` WRITE;
/*!40000 ALTER TABLE `chat_sessions` DISABLE KEYS */;
INSERT INTO `chat_sessions` VALUES (1,'2026-05-10 06:30:40.068810','guest-1778394293512-b89hcea5',_binary '','Tư vấn sản phẩm','2026-05-10 06:30:40.068810',NULL),(2,'2026-05-10 06:35:09.529257','guest-1778394293512-b89hcea5',_binary '','Tư vấn sản phẩm','2026-05-10 06:35:09.529257',NULL);
/*!40000 ALTER TABLE `chat_sessions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `contact_images`
--

DROP TABLE IF EXISTS `contact_images`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `contact_images` (
  `contact_image_id` int unsigned NOT NULL AUTO_INCREMENT,
  `contact_id` int unsigned NOT NULL,
  `image_url` varchar(1024) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`contact_image_id`),
  KEY `contact_id` (`contact_id`),
  CONSTRAINT `contact_images_ibfk_1` FOREIGN KEY (`contact_id`) REFERENCES `contacts` (`contact_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `contact_images`
--

LOCK TABLES `contact_images` WRITE;
/*!40000 ALTER TABLE `contact_images` DISABLE KEYS */;
/*!40000 ALTER TABLE `contact_images` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `contact_replies`
--

DROP TABLE IF EXISTS `contact_replies`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `contact_replies` (
  `reply_id` int unsigned NOT NULL AUTO_INCREMENT,
  `contact_id` int unsigned NOT NULL,
  `admin_id` int unsigned DEFAULT NULL,
  `reply_content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_read` tinyint(1) DEFAULT '0',
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`reply_id`),
  KEY `admin_id` (`admin_id`),
  KEY `idx_contact_replies_contact_id` (`contact_id`),
  CONSTRAINT `contact_replies_ibfk_1` FOREIGN KEY (`contact_id`) REFERENCES `contacts` (`contact_id`) ON DELETE CASCADE,
  CONSTRAINT `contact_replies_ibfk_2` FOREIGN KEY (`admin_id`) REFERENCES `admin_accounts` (`admin_id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `contact_replies`
--

LOCK TABLES `contact_replies` WRITE;
/*!40000 ALTER TABLE `contact_replies` DISABLE KEYS */;
/*!40000 ALTER TABLE `contact_replies` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `contact_reply_images`
--

DROP TABLE IF EXISTS `contact_reply_images`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `contact_reply_images` (
  `reply_image_id` int unsigned NOT NULL AUTO_INCREMENT,
  `reply_id` int unsigned NOT NULL,
  `image_url` varchar(1024) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sort_order` int DEFAULT '0',
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`reply_image_id`),
  KEY `idx_contact_reply_images_reply_id` (`reply_id`),
  CONSTRAINT `contact_reply_images_ibfk_1` FOREIGN KEY (`reply_id`) REFERENCES `contact_replies` (`reply_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=24 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `contact_reply_images`
--

LOCK TABLES `contact_reply_images` WRITE;
/*!40000 ALTER TABLE `contact_reply_images` DISABLE KEYS */;
/*!40000 ALTER TABLE `contact_reply_images` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `contacts`
--

DROP TABLE IF EXISTS `contacts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `contacts` (
  `contact_id` int unsigned NOT NULL AUTO_INCREMENT,
  `full_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `subject` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `message` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime DEFAULT NULL,
  `customer_id` int DEFAULT NULL,
  `deleted_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`contact_id`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `contacts`
--

LOCK TABLES `contacts` WRITE;
/*!40000 ALTER TABLE `contacts` DISABLE KEYS */;
/*!40000 ALTER TABLE `contacts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customer_accounts`
--

DROP TABLE IF EXISTS `customer_accounts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customer_accounts` (
  `customer_id` int unsigned NOT NULL AUTO_INCREMENT,
  `full_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `username` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `google_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `auth_provider` enum('LOCAL','GOOGLE') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `deleted_at` datetime(6) DEFAULT NULL,
  `is_active` bit(1) DEFAULT NULL,
  PRIMARY KEY (`customer_id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `google_id` (`google_id`),
  KEY `idx_customer_email` (`email`),
  KEY `idx_customer_username` (`username`),
  KEY `idx_customer_google_id` (`google_id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customer_accounts`
--

LOCK TABLES `customer_accounts` WRITE;
/*!40000 ALTER TABLE `customer_accounts` DISABLE KEYS */;
INSERT INTO `customer_accounts` VALUES (1,'Nguyễn Trà Giang','tragiang','$2a$10$Rhg2WBRrnvLAwbZOI9IWX..MBnUHUggfZcFj1s/CTFW0dddyRBjDe','nguyentragiang2005@gmail.com','0978603384','Đan Phượng, Hà Nội','2026-04-20 16:02:50','2026-05-06 12:23:07.770814',NULL,NULL,NULL,NULL),(2,'Nguyễn Thị Hồng Nhung','hongnhung','$2a$10$max0e3oG4wt/sISH578lfueWE.qe/Y0FXsU7.6NTwq7UN1BdFVCXy','nguyenhongnhung20042004@gmail.com','0978603390','Đan Phượng, Hà Nội','2026-04-21 13:59:14','2026-05-06 12:23:17.056103',NULL,NULL,NULL,NULL),(3,'Bùi Văn Hà','buivanha2004','$2a$10$xun6lo.3bOq5DioLV5NWIOEHxTx7PPt3FgITOnR7Y9xms/gRC.Lai','habui28022019@gmail.com','0978603388','Đan Phượng, Hà Nội','2026-04-27 06:13:33','2026-05-10 07:20:40.923124','113617455618264357146','GOOGLE',NULL,NULL),(4,'Nguyễn Thị Xuân Mai','xuanmai2005','$2a$10$QSuiuJk96kTh93FmHfbjRu66QVcx9y7BGjR34cIsgp3T1Nct2Ooc.','nguyenthixuanmai20052004@gmail.com','0978603389','Lạng Giang, Bắc Giang','2026-04-27 13:40:31','2026-05-06 12:23:26.145210',NULL,NULL,NULL,NULL),(5,'Trần Văn Việt','vanviet','$2a$10$FMKhibgfmx9iSZcgUH3Awut/ddxVBcQuoAEV2OIB3JPmJ7cMV3ZMi','tranvanviet@gmail.com','0978603399','Quế Võ, Bắc Ninh','2026-05-07 10:23:54','2026-05-07 10:23:53.511763',NULL,NULL,NULL,NULL),(6,'Hà Bùi','hbi','$2a$10$8Cwx6l6UY7VW/D9dV9d0m.olt4ecwOnk1gbMpJq/A7vABbzV/ZPwG','buivanha22032004@gmail.com','0978603310','Đan Phượng, Hà Nội','2026-05-10 04:56:23','2026-05-14 08:03:01.215921','116079547297400088298',NULL,NULL,NULL);
/*!40000 ALTER TABLE `customer_accounts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customer_notifications`
--

DROP TABLE IF EXISTS `customer_notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customer_notifications` (
  `notification_id` int NOT NULL AUTO_INCREMENT,
  `action` enum('CREATE','CANCEL','CONFIRM','REJECT','SHIPPING','DELIVERED','REVIEW','REPLY') COLLATE utf8mb4_unicode_ci NOT NULL,
  `actor_id` int DEFAULT NULL,
  `actor_type` enum('CUSTOMER','SYSTEM','ADMIN') COLLATE utf8mb4_unicode_ci DEFAULT 'SYSTEM',
  `created_at` datetime(6) DEFAULT NULL,
  `is_read` bit(1) DEFAULT NULL,
  `message` text COLLATE utf8mb4_unicode_ci,
  `read_at` datetime(6) DEFAULT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `type` enum('ORDER','CONTACT','EVALUATE') COLLATE utf8mb4_unicode_ci NOT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `contact_id` int DEFAULT NULL,
  `customer_id` int NOT NULL,
  `evaluate_id` int DEFAULT NULL,
  `order_id` int DEFAULT NULL,
  `actor_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `deleted_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`notification_id`)
) ENGINE=InnoDB AUTO_INCREMENT=100 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customer_notifications`
--

LOCK TABLES `customer_notifications` WRITE;
/*!40000 ALTER TABLE `customer_notifications` DISABLE KEYS */;
INSERT INTO `customer_notifications` VALUES (2,'CONFIRM',NULL,'ADMIN','2026-05-07 07:01:18.218627',_binary '','Đơn hàng ORD-C81048EDCB của bạn đã chuyển sang trạng thái: Chờ lấy hàng','2026-05-07 07:01:56.762653','Cập nhật đơn hàng','ORDER','2026-05-07 07:01:56.765415',NULL,3,NULL,17,NULL,NULL),(3,'CONFIRM',NULL,'ADMIN','2026-05-07 10:27:18.589699',_binary '','Đơn hàng ORD-EFEFBCB7A2 của bạn đã chuyển sang trạng thái: Chờ lấy hàng','2026-05-07 10:33:35.366963','Cập nhật đơn hàng','ORDER','2026-05-07 10:33:35.366963',NULL,5,NULL,19,NULL,NULL),(4,'CONFIRM',NULL,'ADMIN','2026-05-07 10:32:28.009300',_binary '','Đơn hàng ORD-6FBD148728 của bạn đã chuyển sang trạng thái: Chờ lấy hàng','2026-05-07 10:33:31.690617','Cập nhật đơn hàng','ORDER','2026-05-07 10:33:31.690617',NULL,5,NULL,20,NULL,NULL),(5,'CONFIRM',NULL,'ADMIN','2026-05-07 11:02:15.583848',_binary '','Đơn hàng ORD-50A3BBD04A của bạn đã chuyển sang trạng thái: Chờ lấy hàng','2026-05-07 11:02:25.226227','Cập nhật đơn hàng','ORDER','2026-05-07 11:02:25.239646',NULL,5,NULL,21,NULL,NULL),(6,'CONFIRM',NULL,'ADMIN','2026-05-07 11:11:31.849936',_binary '','Đơn hàng ORD-8538FEBA64 của bạn đã chuyển sang trạng thái: Chờ lấy hàng','2026-05-07 11:11:40.906356','Cập nhật đơn hàng','ORDER','2026-05-07 11:11:40.906905',NULL,5,NULL,23,NULL,NULL),(7,'CONFIRM',NULL,'ADMIN','2026-05-07 11:16:22.579055',_binary '','Đơn hàng ORD-506A4B3D94 của bạn đã chuyển sang trạng thái: Chờ lấy hàng','2026-05-07 11:16:33.970209','Cập nhật đơn hàng','ORDER','2026-05-07 11:16:33.970209',NULL,5,NULL,24,NULL,NULL),(8,'CONFIRM',NULL,'ADMIN','2026-05-07 14:29:21.875062',_binary '','Đơn hàng ORD-34B37C9454 của bạn đã chuyển sang trạng thái: Chờ lấy hàng','2026-05-07 14:43:13.996752','Cập nhật đơn hàng','ORDER','2026-05-07 14:43:14.002025',NULL,5,NULL,26,NULL,NULL),(9,'CONFIRM',NULL,'ADMIN','2026-05-07 14:46:41.980481',_binary '','Đơn hàng ORD-1176979DB5 của bạn đã chuyển sang trạng thái: Chờ lấy hàng','2026-05-07 14:46:55.771504','Cập nhật đơn hàng','ORDER','2026-05-07 14:46:55.773446',NULL,5,NULL,27,NULL,NULL),(10,'DELIVERED',NULL,'ADMIN','2026-05-08 02:26:09.133827',_binary '','Đơn hàng ORD-1176979DB5 của bạn đã chuyển sang trạng thái: Đã giao hàng','2026-05-08 02:26:19.629782','Cập nhật đơn hàng','ORDER','2026-05-08 02:26:19.630385',NULL,5,NULL,27,NULL,NULL),(11,'REPLY',NULL,'ADMIN','2026-05-08 02:38:02.056736',_binary '','Admin đã phản hồi liên hệ của bạn về: Chào bạn','2026-05-08 02:38:25.892689','Phản hồi liên hệ','CONTACT','2026-05-08 02:38:25.893292',12,5,NULL,NULL,NULL,NULL),(12,'REPLY',NULL,'ADMIN','2026-05-08 02:40:37.132476',_binary '','Admin đã phản hồi đánh giá của bạn cho sản phẩm Samsung Galaxy S25 Ultra','2026-05-08 02:41:47.087633','Phản hồi đánh giá','EVALUATE','2026-05-08 02:41:47.096994',NULL,5,14,NULL,NULL,NULL),(13,'REPLY',NULL,'ADMIN','2026-05-08 02:58:09.016136',_binary '','Admin đã phản hồi đánh giá của bạn cho sản phẩm OPPO Find X7 Ultra','2026-05-08 03:05:37.366073','Phản hồi đánh giá','EVALUATE','2026-05-08 03:05:37.385537',NULL,5,11,NULL,NULL,NULL),(14,'REPLY',NULL,'ADMIN','2026-05-08 03:06:19.941877',_binary '','Shop đã phản hồi đánh giá của bạn cho sản phẩm Huawei Mate 80 Pro','2026-05-08 03:06:30.370141','Phản hồi đánh giá','EVALUATE','2026-05-08 03:06:30.372102',NULL,5,15,27,NULL,NULL),(15,'DELIVERED',NULL,'ADMIN','2026-05-10 13:07:52.585364',_binary '','Đơn hàng ORD-7CEA6E61A8 của bạn đã chuyển sang trạng thái: Đã giao hàng','2026-05-10 13:10:40.791108','Cập nhật đơn hàng','ORDER','2026-05-10 13:10:40.792473',NULL,1,NULL,28,NULL,NULL),(16,'CONFIRM',NULL,'ADMIN','2026-05-10 13:08:33.218543',_binary '','Đơn hàng ORD-7CEA6E61A8 của bạn đã chuyển sang trạng thái: Đã xác nhận','2026-05-10 13:10:32.500771','Cập nhật đơn hàng','ORDER','2026-05-10 13:10:32.501376',NULL,1,NULL,28,NULL,NULL),(17,'CONFIRM',NULL,'ADMIN','2026-05-10 13:09:12.962990',_binary '','Đơn hàng ORD-BE883D7615 của bạn đã chuyển sang trạng thái: Đã xác nhận','2026-05-10 13:09:21.217126','Cập nhật đơn hàng','ORDER','2026-05-10 13:09:21.217689',NULL,2,NULL,29,NULL,NULL),(18,'CONFIRM',NULL,'ADMIN','2026-05-11 14:52:46.977102',_binary '','Đơn hàng ORD-76259C2C5D của bạn đã chuyển sang trạng thái: Chờ lấy hàng','2026-05-31 14:09:02.520762','Cập nhật đơn hàng','ORDER','2026-05-11 14:52:46.977102',NULL,1,NULL,32,NULL,NULL),(19,'CONFIRM',NULL,'ADMIN','2026-05-11 15:03:04.958964',_binary '','Đơn hàng ORD-C7DB57C015 của bạn đã chuyển sang trạng thái: Chờ xác nhận thanh toán','2026-05-12 12:44:01.745683','Cập nhật đơn hàng','ORDER','2026-05-12 12:44:01.747477',NULL,4,NULL,34,NULL,NULL),(20,'CONFIRM',NULL,'ADMIN','2026-05-12 14:20:29.153786',_binary '','Đơn hàng ORD-28DB3DA863 của bạn đã chuyển sang trạng thái: Chờ xác nhận thanh toán','2026-05-12 14:24:23.625902','Cập nhật đơn hàng','ORDER','2026-05-12 14:24:23.626484',NULL,3,NULL,37,NULL,NULL),(21,'CONFIRM',NULL,'ADMIN','2026-05-12 14:23:59.467611',_binary '','Đơn hàng ORD-28DB3DA863 của bạn đã được xác nhận thanh toán thành công.','2026-05-12 14:24:20.645138','Cập nhật đơn hàng','ORDER','2026-05-12 14:24:20.645695',NULL,3,NULL,37,NULL,NULL),(22,'CONFIRM',NULL,'ADMIN','2026-05-12 15:22:11.953939',_binary '','Đơn hàng ORD-28DB3DA863 của bạn đã chuyển sang trạng thái: Chờ xác nhận thanh toán','2026-06-04 13:54:23.743835','Cập nhật đơn hàng','ORDER','2026-05-12 15:22:11.953939',NULL,3,NULL,37,NULL,NULL),(23,'CONFIRM',NULL,'ADMIN','2026-05-12 15:22:37.969138',_binary '','Đơn hàng ORD-28DB3DA863 của bạn đã được xác nhận thanh toán thành công.','2026-06-04 13:54:23.743835','Cập nhật đơn hàng','ORDER','2026-05-12 15:22:37.969138',NULL,3,NULL,37,NULL,NULL),(24,'CONFIRM',NULL,'ADMIN','2026-05-12 15:26:35.930497',_binary '','Đơn hàng ORD-5F81A5EAE8 của bạn đã được xác nhận thanh toán thành công.','2026-06-04 13:54:23.743835','Cập nhật đơn hàng','ORDER','2026-05-12 15:26:35.930497',NULL,3,NULL,38,NULL,NULL),(25,'CONFIRM',NULL,'ADMIN','2026-05-12 15:28:54.736698',_binary '','Đơn hàng ORD-5F81A5EAE8 của bạn đã chuyển sang trạng thái: Chờ xác nhận thanh toán','2026-06-04 13:54:23.743835','Cập nhật đơn hàng','ORDER','2026-05-12 15:28:54.736698',NULL,3,NULL,38,NULL,NULL),(26,'CONFIRM',NULL,'ADMIN','2026-05-12 15:33:35.627259',_binary '','Đơn hàng ORD-6A0C2F0217 của bạn đã được xác nhận thanh toán thành công.','2026-06-04 13:54:23.743835','Cập nhật đơn hàng','ORDER','2026-05-12 15:33:35.627259',NULL,3,NULL,39,NULL,NULL),(27,'CONFIRM',NULL,'ADMIN','2026-05-13 12:25:17.445014',_binary '','Đơn hàng ORD-91163E7E79 của bạn đã được xác nhận thanh toán thành công.','2026-06-04 13:54:23.743835','Cập nhật đơn hàng','ORDER','2026-05-13 12:25:17.445014',NULL,3,NULL,40,NULL,NULL),(28,'CONFIRM',NULL,'ADMIN','2026-05-13 12:34:05.749149',_binary '','Đơn hàng ORD-2D9DDCDEBB của bạn đã được xác nhận thanh toán thành công.','2026-05-13 16:23:58.717799','Cập nhật đơn hàng','ORDER','2026-05-13 12:34:05.749149',NULL,2,NULL,41,NULL,NULL),(29,'CONFIRM',NULL,'ADMIN','2026-05-13 12:37:07.410757',_binary '','Đơn hàng ORD-2D9DDCDEBB của bạn đã chuyển sang trạng thái: Chờ xác nhận thanh toán','2026-05-13 16:23:58.717799','Cập nhật đơn hàng','ORDER','2026-05-13 12:37:07.410757',NULL,2,NULL,41,NULL,NULL),(30,'CONFIRM',NULL,'ADMIN','2026-05-13 15:32:46.061041',_binary '','Đơn hàng ORD-E89B1C56C6 của bạn đã chuyển sang trạng thái: Đã xác nhận','2026-05-13 16:23:58.717799','Cập nhật đơn hàng','ORDER','2026-05-13 15:32:46.061041',NULL,2,NULL,42,NULL,NULL),(31,'CONFIRM',NULL,'ADMIN','2026-05-13 15:33:05.360839',_binary '','Đơn hàng ORD-2D9DDCDEBB của bạn đã chuyển sang trạng thái: Đã xác nhận','2026-05-13 16:23:58.717799','Cập nhật đơn hàng','ORDER','2026-05-13 15:33:05.360839',NULL,2,NULL,41,NULL,NULL),(32,'CONFIRM',NULL,'ADMIN','2026-05-13 19:57:39.570403',_binary '','Đơn hàng ORD-BBF300EAD1 đã được xác nhận thanh toán.','2026-05-13 20:04:25.535336','Cập nhật thanh toán','ORDER','2026-05-13 20:04:25.539517',NULL,2,NULL,50,NULL,NULL),(33,'CONFIRM',NULL,'ADMIN','2026-05-14 04:05:41.699615',_binary '','Đơn hàng ORD-C80569AF29 đã được xác nhận thanh toán.','2026-05-14 04:08:51.798717','Cập nhật thanh toán','ORDER','2026-05-14 04:08:51.800478',NULL,2,NULL,51,NULL,NULL),(34,'CONFIRM',NULL,'ADMIN','2026-05-14 04:15:34.709031',_binary '\0','Đơn hàng ORD-087F927BCC đã được xác nhận thanh toán.',NULL,'Cập nhật thanh toán','ORDER','2026-05-14 04:15:34.709031',NULL,2,NULL,52,NULL,NULL),(35,'CONFIRM',NULL,'ADMIN','2026-05-14 04:20:17.259554',_binary '','Đơn hàng ORD-A2AFA84F3A đã được xác nhận thanh toán.','2026-05-31 14:09:02.520762','Cập nhật thanh toán','ORDER','2026-05-14 04:20:17.259554',NULL,1,NULL,54,NULL,NULL),(36,'CONFIRM',NULL,'ADMIN','2026-05-14 04:21:43.735142',_binary '','Đơn hàng ORD-1D163046D9 đã được xác nhận thanh toán.','2026-05-31 14:09:02.520762','Cập nhật thanh toán','ORDER','2026-05-14 04:21:43.735142',NULL,1,NULL,53,NULL,NULL),(37,'CONFIRM',NULL,'ADMIN','2026-05-14 04:42:28.612201',_binary '','Đơn hàng ORD-8067A8354F đã được xác nhận thanh toán.','2026-06-04 13:54:23.743835','Cập nhật thanh toán','ORDER','2026-05-14 04:42:28.612201',NULL,3,NULL,55,NULL,NULL),(38,'CONFIRM',NULL,'ADMIN','2026-05-14 05:16:54.493024',_binary '\0','Đơn hàng ORD-BE5B1EEC18 đã được xác nhận thanh toán.',NULL,'Cập nhật thanh toán','ORDER','2026-05-14 05:16:54.493024',NULL,2,NULL,58,NULL,NULL),(39,'CONFIRM',NULL,'ADMIN','2026-05-14 05:24:24.388286',_binary '\0','Đơn hàng ORD-A00FFD515D đã được xác nhận thanh toán.',NULL,'Cập nhật thanh toán','ORDER','2026-05-14 05:24:24.388286',NULL,2,NULL,59,NULL,NULL),(40,'CONFIRM',NULL,'ADMIN','2026-05-14 05:42:31.552617',_binary '\0','Đơn hàng ORD-6077A54E03 đã được xác nhận thanh toán.',NULL,'Cập nhật thanh toán','ORDER','2026-05-14 05:42:31.552617',NULL,2,NULL,60,NULL,NULL),(41,'CONFIRM',NULL,'ADMIN','2026-05-14 05:59:11.123350',_binary '\0','Đơn hàng ORD-6077A54E03 của bạn đã chuyển sang trạng thái: Chờ xác nhận thanh toán',NULL,'Cập nhật đơn hàng','ORDER','2026-05-14 05:59:11.123350',NULL,2,NULL,60,NULL,NULL),(42,'CANCEL',NULL,'ADMIN','2026-05-14 06:09:01.856961',_binary '\0','Minh chứng thanh toán cho đơn hàng ORD-6077A54E03 đã bị từ chối.',NULL,'Cập nhật thanh toán','ORDER','2026-05-14 06:09:01.856961',NULL,2,NULL,60,NULL,NULL),(43,'CONFIRM',NULL,'ADMIN','2026-05-14 06:12:00.454600',_binary '','Đơn hàng ORD-75FF1221E7 đã được xác nhận thanh toán.','2026-05-14 06:19:23.311188','Cập nhật thanh toán','ORDER','2026-05-14 06:19:23.314610',NULL,2,NULL,61,NULL,NULL),(44,'CONFIRM',NULL,'ADMIN','2026-05-14 06:21:21.447484',_binary '\0','Đơn hàng ORD-3D0962B9B6 đã được xác nhận thanh toán.',NULL,'Cập nhật thanh toán','ORDER','2026-05-14 06:21:21.447484',NULL,2,NULL,62,NULL,NULL),(45,'CONFIRM',NULL,'ADMIN','2026-05-14 06:30:58.107607',_binary '\0','Đơn hàng ORD-0B362D8C9D đã được xác nhận thanh toán.',NULL,'Cập nhật thanh toán','ORDER','2026-05-14 06:30:58.107607',NULL,2,NULL,63,NULL,NULL),(46,'CONFIRM',NULL,'ADMIN','2026-05-14 06:34:21.368936',_binary '\0','Đơn hàng ORD-BE2B2105A6 đã được xác nhận thanh toán.',NULL,'Cập nhật thanh toán','ORDER','2026-05-14 06:34:21.368936',NULL,2,NULL,64,NULL,NULL),(47,'CONFIRM',NULL,'ADMIN','2026-05-14 06:34:21.534764',_binary '\0','Đơn hàng ORD-BE2B2105A6 đã được xác nhận thanh toán.',NULL,'Cập nhật thanh toán','ORDER','2026-05-14 06:34:21.534764',NULL,2,NULL,64,NULL,NULL),(48,'CONFIRM',NULL,'ADMIN','2026-05-14 06:50:01.470077',_binary '\0','Đơn hàng ORD-B9C909A5B3 đã được xác nhận thanh toán.',NULL,'Cập nhật thanh toán','ORDER','2026-05-14 06:50:01.470077',NULL,2,NULL,65,NULL,NULL),(49,'CONFIRM',NULL,'ADMIN','2026-05-14 07:32:17.910698',_binary '\0','Đơn hàng ORD-B02BCE7445 đã được xác nhận thanh toán.',NULL,'Cập nhật thanh toán','ORDER','2026-05-14 07:32:17.910698',NULL,2,NULL,66,NULL,NULL),(50,'CONFIRM',NULL,'ADMIN','2026-05-14 07:33:09.813815',_binary '\0','Đơn hàng ORD-B02BCE7445 đã được xác nhận thanh toán.',NULL,'Cập nhật thanh toán','ORDER','2026-05-14 07:33:09.813815',NULL,2,NULL,66,NULL,NULL),(51,'CONFIRM',NULL,'ADMIN','2026-05-14 12:50:13.907008',_binary '\0','Đơn hàng ORD-64D140B695 đã được xác nhận thanh toán.',NULL,'Cập nhật thanh toán','ORDER','2026-05-14 12:50:13.907008',NULL,2,NULL,67,NULL,NULL),(52,'CONFIRM',NULL,'ADMIN','2026-05-14 13:02:37.673586',_binary '','Đơn hàng ORD-1F6D2F0588 đã được xác nhận thanh toán.','2026-05-31 14:09:02.520762','Cập nhật thanh toán','ORDER','2026-05-14 13:02:37.673586',NULL,1,NULL,68,NULL,NULL),(53,'CONFIRM',NULL,'ADMIN','2026-05-14 13:03:28.585375',_binary '','Đơn hàng ORD-1F6D2F0588 đã được xác nhận thanh toán.','2026-05-31 14:09:02.520762','Cập nhật thanh toán','ORDER','2026-05-14 13:03:28.585375',NULL,1,NULL,68,NULL,NULL),(54,'CONFIRM',NULL,'ADMIN','2026-05-14 14:20:52.984104',_binary '','Đơn hàng ORD-27739A1D35 đã được xác nhận thanh toán.','2026-05-31 14:09:02.520762','Cập nhật thanh toán','ORDER','2026-05-14 14:20:52.984104',NULL,1,NULL,70,NULL,NULL),(55,'CONFIRM',NULL,'ADMIN','2026-05-14 14:41:55.091394',_binary '','Đơn hàng ORD-27739A1D35 của bạn đã chuyển sang trạng thái: Chờ xác nhận thanh toán','2026-05-31 14:09:02.520762','Cập nhật đơn hàng','ORDER','2026-05-14 14:41:55.091394',NULL,1,NULL,70,NULL,NULL),(56,'CONFIRM',NULL,'ADMIN','2026-05-14 14:55:13.764191',_binary '','Đơn hàng ORD-27739A1D35 đã được xác nhận thanh toán.','2026-05-31 14:09:02.520762','Cập nhật thanh toán','ORDER','2026-05-14 14:55:13.764191',NULL,1,NULL,70,NULL,NULL),(57,'CANCEL',NULL,'ADMIN','2026-05-14 14:55:27.322108',_binary '','Minh chứng thanh toán cho đơn hàng ORD-27739A1D35 đã bị từ chối.','2026-05-31 14:09:02.520762','Cập nhật thanh toán','ORDER','2026-05-14 14:55:27.322108',NULL,1,NULL,70,NULL,NULL),(58,'CANCEL',NULL,'ADMIN','2026-05-14 14:59:09.055664',_binary '\0','Minh chứng thanh toán cho đơn hàng ORD-9D9A728317 đã bị từ chối.',NULL,'Cập nhật thanh toán','ORDER','2026-05-14 14:59:09.055664',NULL,2,NULL,72,NULL,NULL),(59,'CONFIRM',NULL,'ADMIN','2026-05-14 14:59:14.470332',_binary '\0','Đơn hàng ORD-9D9A728317 đã được xác nhận thanh toán.',NULL,'Cập nhật thanh toán','ORDER','2026-05-14 14:59:14.470332',NULL,2,NULL,72,NULL,NULL),(60,'CONFIRM',NULL,'ADMIN','2026-05-14 14:59:37.141444',_binary '\0','Đơn hàng ORD-EFE18F728D đã được xác nhận thanh toán.',NULL,'Cập nhật thanh toán','ORDER','2026-05-14 14:59:37.141444',NULL,2,NULL,71,NULL,NULL),(61,'CANCEL',NULL,'ADMIN','2026-05-14 15:09:35.201763',_binary '\0','Minh chứng thanh toán cho đơn hàng ORD-FC688C838C đã bị từ chối.',NULL,'Cập nhật thanh toán','ORDER','2026-05-14 15:09:35.201763',NULL,2,NULL,73,NULL,NULL),(62,'CANCEL',NULL,'ADMIN','2026-05-14 15:17:54.462022',_binary '\0','Minh chứng thanh toán cho đơn hàng ORD-EFE18F728D đã bị từ chối.',NULL,'Cập nhật thanh toán','ORDER','2026-05-14 15:17:54.462022',NULL,2,NULL,71,NULL,NULL),(63,'CANCEL',NULL,'ADMIN','2026-05-14 15:18:09.124049',_binary '\0','Minh chứng thanh toán cho đơn hàng ORD-9D9A728317 đã bị từ chối.',NULL,'Cập nhật thanh toán','ORDER','2026-05-14 15:18:09.124049',NULL,2,NULL,72,NULL,NULL),(64,'CONFIRM',NULL,'ADMIN','2026-05-14 15:34:36.760279',_binary '\0','Đơn hàng ORD-9D9A728317 của bạn đã chuyển sang trạng thái: Chờ xác nhận thanh toán',NULL,'Cập nhật đơn hàng','ORDER','2026-05-14 15:34:36.760279',NULL,2,NULL,72,NULL,NULL),(65,'CANCEL',NULL,'ADMIN','2026-05-15 14:07:24.525527',_binary '','Đơn hàng ORD-791B849017 của bạn đã chuyển sang trạng thái: Đã hủy','2026-06-04 13:54:23.743835','Cập nhật đơn hàng','ORDER','2026-05-15 14:07:24.525527',NULL,3,NULL,74,NULL,NULL),(66,'CONFIRM',NULL,'ADMIN','2026-05-15 14:17:58.769776',_binary '','Đơn hàng ORD-791B849017 của bạn đã chuyển sang trạng thái: Chờ xác nhận','2026-06-04 13:54:23.743835','Cập nhật đơn hàng','ORDER','2026-05-15 14:17:58.769776',NULL,3,NULL,74,NULL,NULL),(67,'CONFIRM',NULL,'ADMIN','2026-05-15 14:45:12.078779',_binary '','Đơn hàng ORD-791B849017 của bạn đã chuyển sang trạng thái: Chờ xác nhận','2026-06-04 13:54:23.743835','Cập nhật đơn hàng','ORDER','2026-05-15 14:45:12.078779',NULL,3,NULL,74,NULL,NULL),(68,'CONFIRM',NULL,'ADMIN','2026-05-15 14:46:42.500281',_binary '','Đơn hàng ORD-791B849017 của bạn đã chuyển sang trạng thái: Chờ xác nhận','2026-06-04 13:54:23.743835','Cập nhật đơn hàng','ORDER','2026-05-15 14:46:42.500281',NULL,3,NULL,74,NULL,NULL),(69,'CANCEL',NULL,'ADMIN','2026-05-15 14:47:52.461786',_binary '','Đơn hàng ORD-791B849017 của bạn đã chuyển sang trạng thái: Đã hủy','2026-06-04 13:54:23.743835','Cập nhật đơn hàng','ORDER','2026-05-15 14:47:52.461786',NULL,3,NULL,74,NULL,NULL),(70,'CANCEL',NULL,'ADMIN','2026-05-15 14:48:51.474614',_binary '','Đơn hàng ORD-B41CC2F039 của bạn đã chuyển sang trạng thái: Đã hủy','2026-06-04 13:54:23.743835','Cập nhật đơn hàng','ORDER','2026-05-15 14:48:51.474614',NULL,3,NULL,75,NULL,NULL),(71,'CONFIRM',NULL,'ADMIN','2026-05-16 04:11:04.790850',_binary '','Đơn hàng ORD-B41CC2F039 của bạn đã chuyển sang trạng thái: Chờ xác nhận','2026-06-04 13:54:23.743835','Cập nhật đơn hàng','ORDER','2026-05-16 04:11:04.790850',NULL,3,NULL,75,NULL,NULL),(72,'CANCEL',1,'ADMIN','2026-05-16 04:18:55.829388',_binary '','Đơn hàng #ORD-B41CC2F039 đã bị hủy bởi nhân viên','2026-05-16 04:19:51.581625','Đơn hàng đã bị hủy','ORDER','2026-05-16 04:19:51.586648',NULL,3,NULL,75,NULL,NULL),(73,'CANCEL',1,'ADMIN','2026-05-16 04:35:58.061096',_binary '\0','Đơn hàng #ORD-FC688C838C đã bị hủy bởi nhân viên',NULL,'Đơn hàng đã bị hủy','ORDER','2026-05-16 04:35:58.061096',NULL,2,NULL,73,NULL,NULL),(74,'CONFIRM',NULL,'ADMIN','2026-05-16 04:46:52.830097',_binary '\0','Đơn hàng ORD-FC688C838C của bạn đã chuyển sang trạng thái: Đã xác nhận',NULL,'Cập nhật đơn hàng','ORDER','2026-05-16 04:46:52.830097',NULL,2,NULL,73,NULL,NULL),(75,'SHIPPING',NULL,'ADMIN','2026-05-16 04:48:40.513530',_binary '\0','Đơn hàng ORD-FC688C838C của bạn đã chuyển sang trạng thái: Đang giao hàng',NULL,'Cập nhật đơn hàng','ORDER','2026-05-16 04:48:40.513530',NULL,2,NULL,73,NULL,NULL),(76,'CONFIRM',NULL,'ADMIN','2026-05-16 04:48:54.463278',_binary '\0','Đơn hàng ORD-FC688C838C của bạn đã chuyển sang trạng thái: Chờ lấy hàng',NULL,'Cập nhật đơn hàng','ORDER','2026-05-16 04:48:54.463278',NULL,2,NULL,73,NULL,NULL),(77,'CONFIRM',NULL,'ADMIN','2026-05-16 05:22:21.933769',_binary '','Đơn hàng ORD-B41CC2F039 của bạn đã chuyển sang trạng thái: Chờ lấy hàng','2026-06-04 13:54:23.743835','Cập nhật đơn hàng','ORDER','2026-05-16 05:22:21.933769',NULL,3,NULL,75,NULL,NULL),(78,'CONFIRM',NULL,'ADMIN','2026-05-16 05:22:53.355185',_binary '\0','Đơn hàng ORD-FC688C838C của bạn đã chuyển sang trạng thái: Chờ lấy hàng',NULL,'Cập nhật đơn hàng','ORDER','2026-05-16 05:22:53.355185',NULL,2,NULL,73,NULL,NULL),(79,'CANCEL',1,'ADMIN','2026-05-16 05:23:21.671680',_binary '\0','Đơn hàng #ORD-FC688C838C đã bị hủy bởi nhân viên',NULL,'Đơn hàng đã bị hủy','ORDER','2026-05-16 05:23:21.671680',NULL,2,NULL,73,NULL,NULL),(80,'CANCEL',1,'ADMIN','2026-05-16 05:40:56.734632',_binary '\0','Đơn hàng #ORD-FC688C838C đã bị hủy bởi nhân viên',NULL,'Đơn hàng đã bị hủy','ORDER','2026-05-16 05:40:56.734632',NULL,2,NULL,73,NULL,NULL),(81,'CONFIRM',NULL,'ADMIN','2026-05-16 05:47:12.237225',_binary '\0','Đơn hàng ORD-FC688C838C của bạn đã chuyển sang trạng thái: Chờ xác nhận thanh toán',NULL,'Cập nhật đơn hàng','ORDER','2026-05-16 05:47:12.237225',NULL,2,NULL,73,NULL,NULL),(82,'CANCEL',1,'ADMIN','2026-05-16 05:47:35.173550',_binary '\0','Đơn hàng #ORD-FC688C838C đã bị hủy bởi nhân viên',NULL,'Đơn hàng đã bị hủy','ORDER','2026-05-16 05:47:35.173550',NULL,2,NULL,73,NULL,NULL),(83,'CANCEL',1,'ADMIN','2026-05-16 05:47:53.886782',_binary '\0','Đơn hàng #ORD-FC688C838C đã bị hủy bởi nhân viên',NULL,'Đơn hàng đã bị hủy','ORDER','2026-05-16 05:47:53.886782',NULL,2,NULL,73,NULL,NULL),(84,'CANCEL',1,'ADMIN','2026-05-16 05:48:19.658369',_binary '\0','Đơn hàng #ORD-FC688C838C đã bị hủy bởi nhân viên',NULL,'Đơn hàng đã bị hủy','ORDER','2026-05-16 05:48:19.658369',NULL,2,NULL,73,NULL,NULL),(85,'CANCEL',1,'ADMIN','2026-05-16 05:49:37.028875',_binary '\0','Đơn hàng #ORD-FC688C838C đã bị hủy bởi nhân viên',NULL,'Đơn hàng đã bị hủy','ORDER','2026-05-16 05:49:37.028875',NULL,2,NULL,73,NULL,NULL),(88,'CANCEL',1,'ADMIN','2026-05-16 05:57:01.614932',_binary '\0','Đơn hàng #ORD-FC688C838C đã bị hủy bởi nhân viên',NULL,'Đơn hàng đã bị hủy','ORDER','2026-05-16 05:57:01.614932',NULL,2,NULL,73,NULL,NULL),(89,'CONFIRM',NULL,'ADMIN','2026-05-18 14:24:10.392128',_binary '\0','Đơn hàng ORD-9FF2412CB3 đã được xác nhận thanh toán.',NULL,'Cập nhật thanh toán','ORDER','2026-05-18 14:24:10.392128',NULL,2,NULL,77,NULL,NULL),(90,'CANCEL',NULL,'ADMIN','2026-05-18 14:36:04.336511',_binary '\0','Minh chứng thanh toán cho đơn hàng ORD-840FED17E6 đã bị từ chối.',NULL,'Cập nhật thanh toán','ORDER','2026-05-18 14:36:04.336511',NULL,2,NULL,78,NULL,NULL),(91,'CONFIRM',NULL,'ADMIN','2026-05-18 14:37:25.001535',_binary '\0','Đơn hàng ORD-A9846B8308 đã được xác nhận thanh toán.',NULL,'Cập nhật thanh toán','ORDER','2026-05-18 14:37:25.001535',NULL,2,NULL,79,NULL,NULL),(92,'CONFIRM',NULL,'ADMIN','2026-05-31 13:43:37.745262',_binary '','Đơn hàng ORD-74996B3403 đã được xác nhận thanh toán.','2026-05-31 13:49:11.943740','Cập nhật thanh toán','ORDER','2026-05-31 13:49:11.949642',NULL,1,NULL,80,NULL,NULL),(93,'CONFIRM',NULL,'ADMIN','2026-06-04 13:56:17.535207',_binary '','Đơn hàng ORD-0AC3D64143 đã được xác nhận thanh toán.','2026-06-04 13:56:33.714898','Cập nhật thanh toán','ORDER','2026-06-04 13:56:33.717532',NULL,3,NULL,81,NULL,NULL),(94,'CONFIRM',NULL,'ADMIN','2026-06-04 13:57:45.984146',_binary '\0','Đơn hàng ORD-413A64DBA1 của bạn đã chuyển sang trạng thái: Đã xác nhận',NULL,'Cập nhật đơn hàng','ORDER','2026-06-04 13:57:45.984146',NULL,1,NULL,82,NULL,NULL),(95,'DELIVERED',NULL,'ADMIN','2026-06-04 14:01:06.445338',_binary '','Đơn hàng ORD-413A64DBA1 của bạn đã chuyển sang trạng thái: Đã giao hàng','2026-06-04 14:01:48.184731','Cập nhật đơn hàng','ORDER','2026-06-04 14:01:48.185927',NULL,1,NULL,82,NULL,NULL),(96,'DELIVERED',NULL,'ADMIN','2026-06-04 14:01:15.634884',_binary '','Đơn hàng ORD-0AC3D64143 của bạn đã chuyển sang trạng thái: Đã giao hàng','2026-06-04 14:05:09.889855','Cập nhật đơn hàng','ORDER','2026-06-04 14:05:09.894367',NULL,3,NULL,81,NULL,NULL),(97,'SHIPPING',NULL,'ADMIN','2026-06-04 14:01:28.433047',_binary '','Đơn hàng ORD-74996B3403 của bạn đã chuyển sang trạng thái: Đang giao hàng','2026-06-04 14:01:41.391515','Cập nhật đơn hàng','ORDER','2026-06-04 14:01:41.392150',NULL,1,NULL,80,NULL,NULL),(98,'REPLY',NULL,'ADMIN','2026-06-04 14:04:10.122342',_binary '','Shop đã phản hồi đánh giá của bạn cho sản phẩm iPhone 17 Pro Max','2026-06-04 14:04:18.999742','Phản hồi đánh giá','EVALUATE','2026-06-04 14:04:19.000908',NULL,1,17,82,NULL,NULL),(99,'REPLY',NULL,'ADMIN','2026-06-04 14:15:55.171912',_binary '','Shop đã phản hồi đánh giá của bạn cho sản phẩm iPhone 17 Pro Max','2026-06-04 14:21:58.224840','Phản hồi đánh giá','EVALUATE','2026-06-04 14:21:58.228506',NULL,3,18,81,NULL,NULL);
/*!40000 ALTER TABLE `customer_notifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `evaluate_images`
--

DROP TABLE IF EXISTS `evaluate_images`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `evaluate_images` (
  `evaluate_image_id` int unsigned NOT NULL AUTO_INCREMENT,
  `evaluate_id` int unsigned NOT NULL,
  `image_url` varchar(1024) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`evaluate_image_id`),
  KEY `idx_evaluate_images_evaluate_id` (`evaluate_id`),
  CONSTRAINT `evaluate_images_ibfk_1` FOREIGN KEY (`evaluate_id`) REFERENCES `evaluates` (`evaluate_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `evaluate_images`
--

LOCK TABLES `evaluate_images` WRITE;
/*!40000 ALTER TABLE `evaluate_images` DISABLE KEYS */;
INSERT INTO `evaluate_images` VALUES (20,17,'http://localhost:8080/api/files/evaluates/5ff85cb1-0787-456f-aee3-42c3642d3c08.png','2026-06-04 14:03:25'),(21,18,'http://localhost:8080/api/files/evaluates/1d1d8dff-d119-4aed-bc26-412658475306.png','2026-06-04 14:14:49');
/*!40000 ALTER TABLE `evaluate_images` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `evaluate_replies`
--

DROP TABLE IF EXISTS `evaluate_replies`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `evaluate_replies` (
  `reply_id` int unsigned NOT NULL AUTO_INCREMENT,
  `evaluate_id` int unsigned NOT NULL,
  `admin_id` int unsigned DEFAULT NULL,
  `reply_content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`reply_id`),
  KEY `admin_id` (`admin_id`),
  KEY `idx_evaluate_replies_evaluate_id` (`evaluate_id`),
  CONSTRAINT `evaluate_replies_ibfk_1` FOREIGN KEY (`evaluate_id`) REFERENCES `evaluates` (`evaluate_id`) ON DELETE CASCADE,
  CONSTRAINT `evaluate_replies_ibfk_2` FOREIGN KEY (`admin_id`) REFERENCES `admin_accounts` (`admin_id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `evaluate_replies`
--

LOCK TABLES `evaluate_replies` WRITE;
/*!40000 ALTER TABLE `evaluate_replies` DISABLE KEYS */;
INSERT INTO `evaluate_replies` VALUES (15,17,NULL,'Cảm ơn bạn đã ủng hộ Shop','2026-06-04 14:04:10','2026-06-04 14:04:10'),(16,18,NULL,'Cảm ơn bạn đã ủng hộ Shop ạ','2026-06-04 14:15:55','2026-06-04 14:15:55');
/*!40000 ALTER TABLE `evaluate_replies` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `evaluates`
--

DROP TABLE IF EXISTS `evaluates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `evaluates` (
  `evaluate_id` int unsigned NOT NULL AUTO_INCREMENT,
  `product_id` int unsigned NOT NULL,
  `customer_id` int unsigned NOT NULL,
  `rating` int NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime DEFAULT NULL,
  `order_item_id` int DEFAULT NULL,
  PRIMARY KEY (`evaluate_id`),
  KEY `product_id` (`product_id`),
  KEY `customer_id` (`customer_id`),
  CONSTRAINT `evaluates_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON DELETE CASCADE,
  CONSTRAINT `evaluates_ibfk_2` FOREIGN KEY (`customer_id`) REFERENCES `customer_accounts` (`customer_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `evaluates`
--

LOCK TABLES `evaluates` WRITE;
/*!40000 ALTER TABLE `evaluates` DISABLE KEYS */;
INSERT INTO `evaluates` VALUES (17,1,1,5,'Sản phẩm đúng với trên ảnh và mô tả','2026-06-04 14:03:24',106),(18,1,3,5,'Sản phẩm xứng đáng với giá tiền','2026-06-04 14:14:49',101);
/*!40000 ALTER TABLE `evaluates` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `news`
--

DROP TABLE IF EXISTS `news`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `news` (
  `news_id` int unsigned NOT NULL AUTO_INCREMENT,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `deleted_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`news_id`),
  UNIQUE KEY `slug` (`slug`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `news`
--

LOCK TABLES `news` WRITE;
/*!40000 ALTER TABLE `news` DISABLE KEYS */;
INSERT INTO `news` VALUES (1,'iPhone 18 chuẩn bị ra mắt: Apple thay đổi chiến lược lớn, lần đầu tiên xuất hiện iPhone gập và chip 2nm siêu mạnh','iphone18-ra-mat','iPhone 18 đang trở thành tâm điểm của giới công nghệ toàn cầu khi hàng loạt thông tin rò rỉ cho thấy Apple sẽ thực hiện những thay đổi lớn nhất trong nhiều năm đối với dòng iPhone. Theo các nguồn tin trong ngành, các phiên bản cao cấp như iPhone 18 Pro và iPhone 18 Pro Max dự kiến sẽ được giới thiệu vào khoảng tháng 9/2026, tiếp tục duy trì truyền thống ra mắt vào mùa thu của Apple.\n\nĐiểm đáng chú ý là Apple có thể áp dụng chiến lược phát hành theo hai giai đoạn hoàn toàn mới. Cụ thể, các mẫu cao cấp sẽ ra mắt trước vào cuối năm 2026, trong khi phiên bản iPhone 18 tiêu chuẩn có thể bị dời sang đầu năm 2027. Đây được xem là bước đi nhằm kéo dài vòng đời sản phẩm và tối ưu doanh thu, đồng thời tạo không gian cho những thiết bị mới như iPhone màn hình gập xuất hiện trên thị trường.\n\nVề cấu hình, iPhone 18 được đồn đoán sẽ trang bị chip Apple A20 Pro sản xuất trên tiến trình 2nm tiên tiến, mang lại hiệu năng mạnh mẽ hơn đáng kể so với thế hệ trước, đặc biệt trong các tác vụ AI, xử lý đồ họa và quay video chuyên nghiệp. Công nghệ này cũng hứa hẹn cải thiện hiệu suất năng lượng, giúp thiết bị tiết kiệm pin tốt hơn dù sở hữu sức mạnh xử lý vượt trội.\n\nNgoài ra, Apple được cho là đang thử nghiệm công nghệ Face ID dưới màn hình và thu nhỏ Dynamic Island, giúp màn hình hiển thị liền mạch hơn và mang lại trải nghiệm cao cấp hơn cho người dùng. Một số nguồn tin còn tiết lộ hãng có thể ra mắt phiên bản iPhone gập đầu tiên cùng dòng iPhone 18, đánh dấu bước ngoặt lớn trong thiết kế smartphone của Apple.\n\nNhìn chung, iPhone 18 được kỳ vọng sẽ là thế hệ iPhone mang tính chuyển đổi, không chỉ nâng cấp về hiệu năng mà còn thay đổi cách Apple giới thiệu sản phẩm trong tương lai. Nếu các tin đồn chính xác, đây có thể là một trong những dòng iPhone đáng chờ đợi nhất trong nhiều năm tới, đặc biệt với người dùng yêu thích công nghệ mới và trải nghiệm cao cấp.','2026-04-21 13:01:57','2026-04-21 13:01:57',NULL),(2,'Samsung Galaxy S26 Ultra chính thức ra mắt: Flagship AI mạnh nhất 2026 với camera 200MP và chip Snapdragon 8 Elite Gen 5','samsung26ultra-ra-mat','Samsung Galaxy S26 Ultra là mẫu flagship cao cấp nhất của Samsung trong năm 2026, chính thức được giới thiệu tại sự kiện Galaxy Unpacked vào ngày 26/02/2026 và mở bán toàn cầu từ tháng 3/2026. Đây là thế hệ kế nhiệm dòng Galaxy S25, tập trung mạnh vào trí tuệ nhân tạo (Galaxy AI), hiệu năng cao và khả năng chụp ảnh chuyên nghiệp.\n\nVề cấu hình, Galaxy S26 Ultra được trang bị vi xử lý Snapdragon 8 Elite Gen 5 (3nm) – một trong những con chip mạnh nhất trên smartphone Android hiện nay, đi kèm RAM từ 12GB đến 16GB và bộ nhớ trong lên tới 1TB. Sức mạnh này cho phép thiết bị xử lý mượt các tác vụ nặng như chơi game đồ họa cao, chỉnh sửa video 8K hay chạy các tính năng AI trực tiếp trên thiết bị mà không cần kết nối đám mây.\n\nĐiểm nổi bật nhất của Samsung Galaxy S26 Ultra là hệ thống camera cao cấp với camera chính 200MP, kết hợp camera tele 5x và camera góc siêu rộng, mang lại khả năng chụp ảnh chi tiết cao và zoom xa vượt trội. Nhờ công nghệ xử lý ảnh bằng AI, thiết bị được đánh giá là một trong những smartphone có camera tốt nhất trên thị trường năm 2026, đặc biệt trong điều kiện thiếu sáng và quay video chuyên nghiệp.\n\nNgoài ra, Galaxy S26 Ultra sở hữu màn hình lớn 6.9 inch Dynamic AMOLED 2X, hỗ trợ tần số quét 120Hz và độ sáng cao, giúp hiển thị rõ nét ngay cả dưới ánh nắng mạnh. Máy đi kèm viên pin 5.000mAh và sạc nhanh khoảng 60W, đáp ứng nhu cầu sử dụng cả ngày dài cho công việc, giải trí và sáng tạo nội dung. Samsung cũng cam kết hỗ trợ cập nhật phần mềm và bảo mật lên tới 7 năm, giúp thiết bị duy trì hiệu năng và độ an toàn trong thời gian dài.\n\nNhìn chung, Samsung Galaxy S26 Ultra được xem là một trong những flagship Android mạnh nhất năm 2026, hướng đến người dùng cao cấp, doanh nhân, game thủ và nhà sáng tạo nội dung. Với sự kết hợp giữa phần cứng mạnh mẽ, camera chất lượng cao và hệ sinh thái Galaxy AI, thiết bị này tiếp tục khẳng định vị thế của Samsung trong phân khúc smartphone cao cấp toàn cầu.','2026-04-21 13:07:20','2026-04-21 13:07:20',NULL);
/*!40000 ALTER TABLE `news` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `news_images`
--

DROP TABLE IF EXISTS `news_images`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `news_images` (
  `news_image_id` int unsigned NOT NULL AUTO_INCREMENT,
  `news_id` int unsigned NOT NULL,
  `image_url` varchar(1024) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sort_order` int DEFAULT '0',
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`news_image_id`),
  KEY `news_id` (`news_id`),
  CONSTRAINT `news_images_ibfk_1` FOREIGN KEY (`news_id`) REFERENCES `news` (`news_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `news_images`
--

LOCK TABLES `news_images` WRITE;
/*!40000 ALTER TABLE `news_images` DISABLE KEYS */;
INSERT INTO `news_images` VALUES (1,1,'http://localhost:8080/api/files/news/4754c6b5-7df5-4db1-b4d2-959b1b184c24.png',0,'2026-04-21 13:01:57'),(2,1,'http://localhost:8080/api/files/news/35ff6a12-86f0-4147-b46b-fccd9e19b9a4.png',1,'2026-04-21 13:01:57'),(3,1,'http://localhost:8080/api/files/news/ebd9fc2c-aa94-43a9-ad72-07b127d66332.png',2,'2026-04-21 13:01:57'),(4,2,'http://localhost:8080/api/files/news/64831983-cb43-4eb6-9a0e-76d78b58db7a.png',0,'2026-04-21 13:07:20'),(5,2,'http://localhost:8080/api/files/news/fbc46cee-7bb5-4234-b172-a84a317827fe.png',1,'2026-04-21 13:07:20'),(6,2,'http://localhost:8080/api/files/news/731b0386-fb3d-4641-a373-741d43cda29a.png',2,'2026-04-21 13:07:20');
/*!40000 ALTER TABLE `news_images` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notifications`
--

DROP TABLE IF EXISTS `notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notifications` (
  `notification_id` int unsigned NOT NULL AUTO_INCREMENT,
  `admin_id` int unsigned NOT NULL,
  `type` enum('ORDER','CONTACT','EVALUATE') COLLATE utf8mb4_unicode_ci NOT NULL,
  `action` enum('CREATE','CANCEL','CONFIRM','REJECT','SHIPPING','DELIVERED','REVIEW','REPLY') COLLATE utf8mb4_unicode_ci NOT NULL,
  `actor_type` enum('CUSTOMER','SYSTEM','ADMIN') COLLATE utf8mb4_unicode_ci DEFAULT 'CUSTOMER',
  `actor_id` int unsigned DEFAULT NULL,
  `actor_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `order_id` int unsigned DEFAULT NULL,
  `contact_id` int unsigned DEFAULT NULL,
  `evaluate_id` int unsigned DEFAULT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `message` text COLLATE utf8mb4_unicode_ci,
  `is_read` tinyint(1) DEFAULT '0',
  `read_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `deleted_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`notification_id`),
  KEY `idx_admin_id` (`admin_id`),
  KEY `idx_type` (`type`),
  KEY `idx_action` (`action`),
  KEY `idx_is_read` (`is_read`),
  KEY `order_id` (`order_id`),
  KEY `contact_id` (`contact_id`),
  KEY `evaluate_id` (`evaluate_id`),
  CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`admin_id`) REFERENCES `admin_accounts` (`admin_id`) ON DELETE CASCADE,
  CONSTRAINT `notifications_ibfk_2` FOREIGN KEY (`order_id`) REFERENCES `orders` (`order_id`) ON DELETE SET NULL,
  CONSTRAINT `notifications_ibfk_3` FOREIGN KEY (`contact_id`) REFERENCES `contacts` (`contact_id`) ON DELETE SET NULL,
  CONSTRAINT `notifications_ibfk_4` FOREIGN KEY (`evaluate_id`) REFERENCES `evaluates` (`evaluate_id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=341 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notifications`
--

LOCK TABLES `notifications` WRITE;
/*!40000 ALTER TABLE `notifications` DISABLE KEYS */;
INSERT INTO `notifications` VALUES (1,1,'ORDER','CREATE','CUSTOMER',3,'Bùi Văn Hà',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Bùi Văn Hà',1,'2026-05-07 06:03:40','2026-05-07 06:00:32','2026-05-07 06:03:40',NULL),(2,2,'ORDER','CREATE','CUSTOMER',3,'Bùi Văn Hà',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Bùi Văn Hà',1,'2026-05-13 12:32:21','2026-05-07 06:00:33','2026-05-07 06:00:33',NULL),(3,3,'ORDER','CREATE','CUSTOMER',3,'Bùi Văn Hà',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Bùi Văn Hà',0,NULL,'2026-05-07 06:00:33','2026-05-07 06:00:33',NULL),(4,4,'ORDER','CREATE','CUSTOMER',3,'Bùi Văn Hà',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Bùi Văn Hà',0,NULL,'2026-05-07 06:00:33','2026-05-07 06:00:33',NULL),(5,1,'ORDER','CREATE','CUSTOMER',3,'Bùi Văn Hà',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Bùi Văn Hà',1,'2026-05-07 06:26:22','2026-05-07 06:06:44','2026-05-07 06:26:22',NULL),(6,2,'ORDER','CREATE','CUSTOMER',3,'Bùi Văn Hà',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Bùi Văn Hà',1,'2026-05-13 12:32:21','2026-05-07 06:06:44','2026-05-07 06:06:44',NULL),(7,3,'ORDER','CREATE','CUSTOMER',3,'Bùi Văn Hà',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Bùi Văn Hà',0,NULL,'2026-05-07 06:06:44','2026-05-07 06:06:44',NULL),(8,4,'ORDER','CREATE','CUSTOMER',3,'Bùi Văn Hà',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Bùi Văn Hà',0,NULL,'2026-05-07 06:06:44','2026-05-07 06:06:44',NULL),(9,1,'CONTACT','CREATE','CUSTOMER',3,'Bùi Văn Hà',NULL,NULL,NULL,'Liên hệ mới','Bạn có liên hệ mới từ Bùi Văn Hà',1,'2026-05-07 06:08:07','2026-05-07 06:07:50','2026-05-07 06:08:07',NULL),(10,2,'CONTACT','CREATE','CUSTOMER',3,'Bùi Văn Hà',NULL,NULL,NULL,'Liên hệ mới','Bạn có liên hệ mới từ Bùi Văn Hà',1,'2026-05-13 12:32:21','2026-05-07 06:07:50','2026-05-07 06:07:50',NULL),(11,3,'CONTACT','CREATE','CUSTOMER',3,'Bùi Văn Hà',NULL,NULL,NULL,'Liên hệ mới','Bạn có liên hệ mới từ Bùi Văn Hà',0,NULL,'2026-05-07 06:07:50','2026-05-07 06:07:50',NULL),(12,4,'CONTACT','CREATE','CUSTOMER',3,'Bùi Văn Hà',NULL,NULL,NULL,'Liên hệ mới','Bạn có liên hệ mới từ Bùi Văn Hà',0,NULL,'2026-05-07 06:07:50','2026-05-07 06:07:50',NULL),(13,1,'ORDER','CREATE','CUSTOMER',5,'Trần Văn Việt',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Trần Văn Việt',1,'2026-05-07 10:58:37','2026-05-07 10:26:34','2026-05-07 10:58:37',NULL),(14,2,'ORDER','CREATE','CUSTOMER',5,'Trần Văn Việt',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Trần Văn Việt',1,'2026-05-13 12:32:21','2026-05-07 10:26:34','2026-05-07 10:26:34',NULL),(15,3,'ORDER','CREATE','CUSTOMER',5,'Trần Văn Việt',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Trần Văn Việt',0,NULL,'2026-05-07 10:26:34','2026-05-07 10:26:34',NULL),(16,4,'ORDER','CREATE','CUSTOMER',5,'Trần Văn Việt',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Trần Văn Việt',0,NULL,'2026-05-07 10:26:34','2026-05-07 10:26:34',NULL),(17,1,'ORDER','CREATE','CUSTOMER',5,'Trần Văn Việt',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Trần Văn Việt',1,'2026-05-07 10:58:35','2026-05-07 10:32:05','2026-05-07 10:58:35',NULL),(18,2,'ORDER','CREATE','CUSTOMER',5,'Trần Văn Việt',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Trần Văn Việt',1,'2026-05-13 12:32:21','2026-05-07 10:32:05','2026-05-07 10:32:05',NULL),(19,3,'ORDER','CREATE','CUSTOMER',5,'Trần Văn Việt',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Trần Văn Việt',0,NULL,'2026-05-07 10:32:05','2026-05-07 10:32:05',NULL),(20,4,'ORDER','CREATE','CUSTOMER',5,'Trần Văn Việt',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Trần Văn Việt',0,NULL,'2026-05-07 10:32:05','2026-05-07 10:32:05',NULL),(21,1,'ORDER','CREATE','CUSTOMER',5,'Trần Văn Việt',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Trần Văn Việt',1,'2026-05-07 11:02:01','2026-05-07 11:01:44','2026-05-07 11:02:01',NULL),(22,2,'ORDER','CREATE','CUSTOMER',5,'Trần Văn Việt',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Trần Văn Việt',1,'2026-05-13 12:32:21','2026-05-07 11:01:44','2026-05-07 11:01:44',NULL),(23,3,'ORDER','CREATE','CUSTOMER',5,'Trần Văn Việt',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Trần Văn Việt',0,NULL,'2026-05-07 11:01:44','2026-05-07 11:01:44',NULL),(24,4,'ORDER','CREATE','CUSTOMER',5,'Trần Văn Việt',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Trần Văn Việt',0,NULL,'2026-05-07 11:01:44','2026-05-07 11:01:44',NULL),(25,1,'ORDER','CREATE','CUSTOMER',5,'Trần Văn Việt',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Trần Văn Việt',1,'2026-05-07 11:05:42','2026-05-07 11:05:30','2026-05-07 11:05:42',NULL),(26,2,'ORDER','CREATE','CUSTOMER',5,'Trần Văn Việt',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Trần Văn Việt',1,'2026-05-13 12:32:21','2026-05-07 11:05:30','2026-05-07 11:05:30',NULL),(27,3,'ORDER','CREATE','CUSTOMER',5,'Trần Văn Việt',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Trần Văn Việt',0,NULL,'2026-05-07 11:05:30','2026-05-07 11:05:30',NULL),(28,4,'ORDER','CREATE','CUSTOMER',5,'Trần Văn Việt',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Trần Văn Việt',0,NULL,'2026-05-07 11:05:30','2026-05-07 11:05:30',NULL),(29,1,'ORDER','CREATE','CUSTOMER',5,'Trần Văn Việt',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Trần Văn Việt',1,'2026-05-07 11:11:22','2026-05-07 11:11:11','2026-05-07 11:11:22',NULL),(30,2,'ORDER','CREATE','CUSTOMER',5,'Trần Văn Việt',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Trần Văn Việt',1,'2026-05-13 12:32:21','2026-05-07 11:11:11','2026-05-07 11:11:11',NULL),(31,3,'ORDER','CREATE','CUSTOMER',5,'Trần Văn Việt',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Trần Văn Việt',0,NULL,'2026-05-07 11:11:11','2026-05-07 11:11:11',NULL),(32,4,'ORDER','CREATE','CUSTOMER',5,'Trần Văn Việt',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Trần Văn Việt',0,NULL,'2026-05-07 11:11:11','2026-05-07 11:11:11',NULL),(33,1,'ORDER','CREATE','CUSTOMER',5,'Trần Văn Việt',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Trần Văn Việt',1,'2026-05-07 11:16:11','2026-05-07 11:15:56','2026-05-07 11:16:11',NULL),(34,2,'ORDER','CREATE','CUSTOMER',5,'Trần Văn Việt',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Trần Văn Việt',1,'2026-05-13 12:32:21','2026-05-07 11:15:56','2026-05-07 11:15:56',NULL),(35,3,'ORDER','CREATE','CUSTOMER',5,'Trần Văn Việt',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Trần Văn Việt',0,NULL,'2026-05-07 11:15:56','2026-05-07 11:15:56',NULL),(36,4,'ORDER','CREATE','CUSTOMER',5,'Trần Văn Việt',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Trần Văn Việt',0,NULL,'2026-05-07 11:15:56','2026-05-07 11:15:56',NULL),(37,1,'ORDER','CREATE','CUSTOMER',5,'Trần Văn Việt',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Trần Văn Việt',1,'2026-05-07 14:42:56','2026-05-07 14:21:28','2026-05-07 14:42:56',NULL),(38,2,'ORDER','CREATE','CUSTOMER',5,'Trần Văn Việt',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Trần Văn Việt',1,'2026-05-13 12:32:21','2026-05-07 14:21:28','2026-05-07 14:21:28',NULL),(39,3,'ORDER','CREATE','CUSTOMER',5,'Trần Văn Việt',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Trần Văn Việt',0,NULL,'2026-05-07 14:21:28','2026-05-07 14:21:28',NULL),(40,4,'ORDER','CREATE','CUSTOMER',5,'Trần Văn Việt',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Trần Văn Việt',0,NULL,'2026-05-07 14:21:29','2026-05-07 14:21:29',NULL),(41,1,'ORDER','CREATE','CUSTOMER',5,'Trần Văn Việt',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Trần Văn Việt',1,'2026-05-07 14:35:08','2026-05-07 14:28:49','2026-05-07 14:35:08',NULL),(42,2,'ORDER','CREATE','CUSTOMER',5,'Trần Văn Việt',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Trần Văn Việt',1,'2026-05-13 12:32:21','2026-05-07 14:28:49','2026-05-07 14:28:49',NULL),(43,3,'ORDER','CREATE','CUSTOMER',5,'Trần Văn Việt',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Trần Văn Việt',0,NULL,'2026-05-07 14:28:49','2026-05-07 14:28:49',NULL),(44,4,'ORDER','CREATE','CUSTOMER',5,'Trần Văn Việt',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Trần Văn Việt',0,NULL,'2026-05-07 14:28:49','2026-05-07 14:28:49',NULL),(45,1,'ORDER','CREATE','CUSTOMER',5,'Trần Văn Việt',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Trần Văn Việt',1,'2026-05-07 14:46:31','2026-05-07 14:46:11','2026-05-07 14:46:31',NULL),(46,2,'ORDER','CREATE','CUSTOMER',5,'Trần Văn Việt',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Trần Văn Việt',1,'2026-05-13 12:32:21','2026-05-07 14:46:11','2026-05-07 14:46:11',NULL),(47,3,'ORDER','CREATE','CUSTOMER',5,'Trần Văn Việt',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Trần Văn Việt',0,NULL,'2026-05-07 14:46:11','2026-05-07 14:46:11',NULL),(48,4,'ORDER','CREATE','CUSTOMER',5,'Trần Văn Việt',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Trần Văn Việt',0,NULL,'2026-05-07 14:46:11','2026-05-07 14:46:11',NULL),(49,1,'EVALUATE','CREATE','CUSTOMER',5,'Trần Văn Việt',NULL,NULL,NULL,'Đánh giá mới','Trần Văn Việt đã đánh giá sản phẩm OPPO Find X7 Ultra',1,'2026-05-08 02:54:46','2026-05-08 02:26:57','2026-05-08 02:54:46',NULL),(50,2,'EVALUATE','CREATE','CUSTOMER',5,'Trần Văn Việt',NULL,NULL,NULL,'Đánh giá mới','Trần Văn Việt đã đánh giá sản phẩm OPPO Find X7 Ultra',1,'2026-05-13 12:32:21','2026-05-08 02:26:57','2026-05-08 02:26:57',NULL),(51,3,'EVALUATE','CREATE','CUSTOMER',5,'Trần Văn Việt',NULL,NULL,NULL,'Đánh giá mới','Trần Văn Việt đã đánh giá sản phẩm OPPO Find X7 Ultra',0,NULL,'2026-05-08 02:26:57','2026-05-08 02:26:57',NULL),(52,4,'EVALUATE','CREATE','CUSTOMER',5,'Trần Văn Việt',NULL,NULL,NULL,'Đánh giá mới','Trần Văn Việt đã đánh giá sản phẩm OPPO Find X7 Ultra',0,NULL,'2026-05-08 02:26:57','2026-05-08 02:26:57',NULL),(53,1,'EVALUATE','CREATE','CUSTOMER',5,'Trần Văn Việt',NULL,NULL,NULL,'Đánh giá mới','Trần Văn Việt đã đánh giá sản phẩm vivo X300 Ultra',1,'2026-05-08 02:54:40','2026-05-08 02:27:22','2026-05-08 02:54:40',NULL),(54,2,'EVALUATE','CREATE','CUSTOMER',5,'Trần Văn Việt',NULL,NULL,NULL,'Đánh giá mới','Trần Văn Việt đã đánh giá sản phẩm vivo X300 Ultra',1,'2026-05-13 12:32:21','2026-05-08 02:27:22','2026-05-08 02:27:22',NULL),(55,3,'EVALUATE','CREATE','CUSTOMER',5,'Trần Văn Việt',NULL,NULL,NULL,'Đánh giá mới','Trần Văn Việt đã đánh giá sản phẩm vivo X300 Ultra',0,NULL,'2026-05-08 02:27:22','2026-05-08 02:27:22',NULL),(56,4,'EVALUATE','CREATE','CUSTOMER',5,'Trần Văn Việt',NULL,NULL,NULL,'Đánh giá mới','Trần Văn Việt đã đánh giá sản phẩm vivo X300 Ultra',0,NULL,'2026-05-08 02:27:22','2026-05-08 02:27:22',NULL),(57,1,'EVALUATE','CREATE','CUSTOMER',5,'Trần Văn Việt',NULL,NULL,NULL,'Đánh giá mới','Trần Văn Việt đã đánh giá sản phẩm vivo X300 Ultra',1,'2026-05-08 02:54:32','2026-05-08 02:27:59','2026-05-08 02:54:32',NULL),(58,2,'EVALUATE','CREATE','CUSTOMER',5,'Trần Văn Việt',NULL,NULL,NULL,'Đánh giá mới','Trần Văn Việt đã đánh giá sản phẩm vivo X300 Ultra',1,'2026-05-13 12:32:21','2026-05-08 02:27:59','2026-05-08 02:27:59',NULL),(59,3,'EVALUATE','CREATE','CUSTOMER',5,'Trần Văn Việt',NULL,NULL,NULL,'Đánh giá mới','Trần Văn Việt đã đánh giá sản phẩm vivo X300 Ultra',0,NULL,'2026-05-08 02:27:59','2026-05-08 02:27:59',NULL),(60,4,'EVALUATE','CREATE','CUSTOMER',5,'Trần Văn Việt',NULL,NULL,NULL,'Đánh giá mới','Trần Văn Việt đã đánh giá sản phẩm vivo X300 Ultra',0,NULL,'2026-05-08 02:27:59','2026-05-08 02:27:59',NULL),(61,1,'EVALUATE','CREATE','CUSTOMER',5,'Trần Văn Việt',NULL,NULL,NULL,'Đánh giá mới','Trần Văn Việt đã đánh giá sản phẩm Samsung Galaxy S25 Ultra',1,'2026-05-08 02:54:25','2026-05-08 02:29:08','2026-05-08 02:54:25',NULL),(62,2,'EVALUATE','CREATE','CUSTOMER',5,'Trần Văn Việt',NULL,NULL,NULL,'Đánh giá mới','Trần Văn Việt đã đánh giá sản phẩm Samsung Galaxy S25 Ultra',1,'2026-05-13 12:32:21','2026-05-08 02:29:08','2026-05-08 02:29:08',NULL),(63,3,'EVALUATE','CREATE','CUSTOMER',5,'Trần Văn Việt',NULL,NULL,NULL,'Đánh giá mới','Trần Văn Việt đã đánh giá sản phẩm Samsung Galaxy S25 Ultra',0,NULL,'2026-05-08 02:29:08','2026-05-08 02:29:08',NULL),(64,4,'EVALUATE','CREATE','CUSTOMER',5,'Trần Văn Việt',NULL,NULL,NULL,'Đánh giá mới','Trần Văn Việt đã đánh giá sản phẩm Samsung Galaxy S25 Ultra',0,NULL,'2026-05-08 02:29:08','2026-05-08 02:29:08',NULL),(65,1,'EVALUATE','CREATE','CUSTOMER',5,'Trần Văn Việt',NULL,NULL,NULL,'Đánh giá mới','Trần Văn Việt đã đánh giá sản phẩm Huawei Mate 80 Pro',1,'2026-05-08 02:54:11','2026-05-08 02:29:32','2026-05-08 02:54:11',NULL),(66,2,'EVALUATE','CREATE','CUSTOMER',5,'Trần Văn Việt',NULL,NULL,NULL,'Đánh giá mới','Trần Văn Việt đã đánh giá sản phẩm Huawei Mate 80 Pro',1,'2026-05-13 12:32:21','2026-05-08 02:29:32','2026-05-08 02:29:32',NULL),(67,3,'EVALUATE','CREATE','CUSTOMER',5,'Trần Văn Việt',NULL,NULL,NULL,'Đánh giá mới','Trần Văn Việt đã đánh giá sản phẩm Huawei Mate 80 Pro',0,NULL,'2026-05-08 02:29:32','2026-05-08 02:29:32',NULL),(68,4,'EVALUATE','CREATE','CUSTOMER',5,'Trần Văn Việt',NULL,NULL,NULL,'Đánh giá mới','Trần Văn Việt đã đánh giá sản phẩm Huawei Mate 80 Pro',0,NULL,'2026-05-08 02:29:32','2026-05-08 02:29:32',NULL),(69,1,'EVALUATE','CREATE','CUSTOMER',5,'Trần Văn Việt',NULL,NULL,NULL,'Đánh giá mới','Trần Văn Việt đã đánh giá sản phẩm Xiaomi 17 Pro Max',1,'2026-05-08 02:31:36','2026-05-08 02:29:59','2026-05-08 02:31:36',NULL),(70,2,'EVALUATE','CREATE','CUSTOMER',5,'Trần Văn Việt',NULL,NULL,NULL,'Đánh giá mới','Trần Văn Việt đã đánh giá sản phẩm Xiaomi 17 Pro Max',1,'2026-05-13 12:32:21','2026-05-08 02:29:59','2026-05-08 02:29:59',NULL),(71,3,'EVALUATE','CREATE','CUSTOMER',5,'Trần Văn Việt',NULL,NULL,NULL,'Đánh giá mới','Trần Văn Việt đã đánh giá sản phẩm Xiaomi 17 Pro Max',0,NULL,'2026-05-08 02:29:59','2026-05-08 02:29:59',NULL),(72,4,'EVALUATE','CREATE','CUSTOMER',5,'Trần Văn Việt',NULL,NULL,NULL,'Đánh giá mới','Trần Văn Việt đã đánh giá sản phẩm Xiaomi 17 Pro Max',0,NULL,'2026-05-08 02:29:59','2026-05-08 02:29:59',NULL),(73,1,'CONTACT','CREATE','CUSTOMER',5,'Trần Văn Việt',NULL,NULL,NULL,'Liên hệ mới','Bạn có liên hệ mới từ Trần Văn Việt',1,'2026-05-08 02:37:23','2026-05-08 02:37:16','2026-05-08 02:37:23',NULL),(74,2,'CONTACT','CREATE','CUSTOMER',5,'Trần Văn Việt',NULL,NULL,NULL,'Liên hệ mới','Bạn có liên hệ mới từ Trần Văn Việt',1,'2026-05-13 12:32:21','2026-05-08 02:37:16','2026-05-08 02:37:16',NULL),(75,3,'CONTACT','CREATE','CUSTOMER',5,'Trần Văn Việt',NULL,NULL,NULL,'Liên hệ mới','Bạn có liên hệ mới từ Trần Văn Việt',0,NULL,'2026-05-08 02:37:16','2026-05-08 02:37:16',NULL),(76,4,'CONTACT','CREATE','CUSTOMER',5,'Trần Văn Việt',NULL,NULL,NULL,'Liên hệ mới','Bạn có liên hệ mới từ Trần Văn Việt',0,NULL,'2026-05-08 02:37:16','2026-05-08 02:37:16',NULL),(77,1,'ORDER','CREATE','CUSTOMER',1,'Nguyễn Trà Giang',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Trà Giang',1,'2026-05-10 12:49:16','2026-05-10 12:31:16','2026-05-10 12:49:16',NULL),(78,2,'ORDER','CREATE','CUSTOMER',1,'Nguyễn Trà Giang',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Trà Giang',1,'2026-05-13 12:32:21','2026-05-10 12:31:16','2026-05-10 12:31:16',NULL),(79,3,'ORDER','CREATE','CUSTOMER',1,'Nguyễn Trà Giang',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Trà Giang',0,NULL,'2026-05-10 12:31:16','2026-05-10 12:31:16',NULL),(80,4,'ORDER','CREATE','CUSTOMER',1,'Nguyễn Trà Giang',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Trà Giang',0,NULL,'2026-05-10 12:31:16','2026-05-10 12:31:16',NULL),(81,1,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',1,'2026-05-10 13:09:08','2026-05-10 13:09:01','2026-05-10 13:09:08',NULL),(82,2,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',1,'2026-05-13 12:32:21','2026-05-10 13:09:01','2026-05-10 13:09:01',NULL),(83,3,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',0,NULL,'2026-05-10 13:09:01','2026-05-10 13:09:01',NULL),(84,4,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',0,NULL,'2026-05-10 13:09:01','2026-05-10 13:09:01',NULL),(85,1,'ORDER','CREATE','CUSTOMER',1,'Nguyễn Trà Giang',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Trà Giang',1,'2026-05-11 14:39:36','2026-05-11 14:19:09','2026-05-11 14:39:36',NULL),(86,2,'ORDER','CREATE','CUSTOMER',1,'Nguyễn Trà Giang',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Trà Giang',1,'2026-05-13 12:32:21','2026-05-11 14:19:09','2026-05-11 14:19:09',NULL),(87,3,'ORDER','CREATE','CUSTOMER',1,'Nguyễn Trà Giang',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Trà Giang',0,NULL,'2026-05-11 14:19:09','2026-05-11 14:19:09',NULL),(88,4,'ORDER','CREATE','CUSTOMER',1,'Nguyễn Trà Giang',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Trà Giang',0,NULL,'2026-05-11 14:19:09','2026-05-11 14:19:09',NULL),(89,1,'ORDER','CREATE','CUSTOMER',1,'Nguyễn Trà Giang',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Trà Giang',1,'2026-05-11 14:39:41','2026-05-11 14:25:34','2026-05-11 14:39:41',NULL),(90,2,'ORDER','CREATE','CUSTOMER',1,'Nguyễn Trà Giang',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Trà Giang',1,'2026-05-13 12:32:21','2026-05-11 14:25:34','2026-05-11 14:25:34',NULL),(91,3,'ORDER','CREATE','CUSTOMER',1,'Nguyễn Trà Giang',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Trà Giang',0,NULL,'2026-05-11 14:25:34','2026-05-11 14:25:34',NULL),(92,4,'ORDER','CREATE','CUSTOMER',1,'Nguyễn Trà Giang',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Trà Giang',0,NULL,'2026-05-11 14:25:34','2026-05-11 14:25:34',NULL),(93,1,'ORDER','CREATE','CUSTOMER',1,'Nguyễn Trà Giang',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Trà Giang',1,'2026-05-11 14:39:42','2026-05-11 14:38:54','2026-05-11 14:39:42',NULL),(94,2,'ORDER','CREATE','CUSTOMER',1,'Nguyễn Trà Giang',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Trà Giang',1,'2026-05-13 12:32:21','2026-05-11 14:38:54','2026-05-11 14:38:54',NULL),(95,3,'ORDER','CREATE','CUSTOMER',1,'Nguyễn Trà Giang',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Trà Giang',0,NULL,'2026-05-11 14:38:54','2026-05-11 14:38:54',NULL),(96,4,'ORDER','CREATE','CUSTOMER',1,'Nguyễn Trà Giang',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Trà Giang',0,NULL,'2026-05-11 14:38:54','2026-05-11 14:38:54',NULL),(97,1,'ORDER','CREATE','CUSTOMER',1,'Nguyễn Trà Giang',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Trà Giang',1,'2026-05-11 14:48:16','2026-05-11 14:47:49','2026-05-11 14:48:16',NULL),(98,2,'ORDER','CREATE','CUSTOMER',1,'Nguyễn Trà Giang',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Trà Giang',1,'2026-05-13 12:32:21','2026-05-11 14:47:49','2026-05-11 14:47:49',NULL),(99,3,'ORDER','CREATE','CUSTOMER',1,'Nguyễn Trà Giang',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Trà Giang',0,NULL,'2026-05-11 14:47:49','2026-05-11 14:47:49',NULL),(100,4,'ORDER','CREATE','CUSTOMER',1,'Nguyễn Trà Giang',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Trà Giang',0,NULL,'2026-05-11 14:47:49','2026-05-11 14:47:49',NULL),(101,1,'ORDER','CREATE','CUSTOMER',4,'Nguyễn Thị Xuân Mai',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Xuân Mai',1,'2026-05-11 14:52:15','2026-05-11 14:51:53','2026-05-11 14:52:15',NULL),(102,2,'ORDER','CREATE','CUSTOMER',4,'Nguyễn Thị Xuân Mai',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Xuân Mai',1,'2026-05-13 12:32:21','2026-05-11 14:51:53','2026-05-11 14:51:53',NULL),(103,3,'ORDER','CREATE','CUSTOMER',4,'Nguyễn Thị Xuân Mai',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Xuân Mai',0,NULL,'2026-05-11 14:51:53','2026-05-11 14:51:53',NULL),(104,4,'ORDER','CREATE','CUSTOMER',4,'Nguyễn Thị Xuân Mai',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Xuân Mai',0,NULL,'2026-05-11 14:51:53','2026-05-11 14:51:53',NULL),(105,1,'ORDER','CREATE','CUSTOMER',4,'Nguyễn Thị Xuân Mai',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Xuân Mai',1,'2026-05-12 12:44:09','2026-05-12 12:40:20','2026-05-12 12:44:09',NULL),(106,2,'ORDER','CREATE','CUSTOMER',4,'Nguyễn Thị Xuân Mai',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Xuân Mai',1,'2026-05-13 12:32:21','2026-05-12 12:40:20','2026-05-12 12:40:20',NULL),(107,3,'ORDER','CREATE','CUSTOMER',4,'Nguyễn Thị Xuân Mai',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Xuân Mai',0,NULL,'2026-05-12 12:40:20','2026-05-12 12:40:20',NULL),(108,4,'ORDER','CREATE','CUSTOMER',4,'Nguyễn Thị Xuân Mai',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Xuân Mai',0,NULL,'2026-05-12 12:40:20','2026-05-12 12:40:20',NULL),(109,1,'ORDER','CREATE','CUSTOMER',3,'Bùi Văn Hà',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Bùi Văn Hà',1,'2026-05-12 12:54:00','2026-05-12 12:53:44','2026-05-12 12:54:00',NULL),(110,2,'ORDER','CREATE','CUSTOMER',3,'Bùi Văn Hà',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Bùi Văn Hà',1,'2026-05-13 12:32:21','2026-05-12 12:53:44','2026-05-12 12:53:44',NULL),(111,3,'ORDER','CREATE','CUSTOMER',3,'Bùi Văn Hà',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Bùi Văn Hà',0,NULL,'2026-05-12 12:53:44','2026-05-12 12:53:44',NULL),(112,4,'ORDER','CREATE','CUSTOMER',3,'Bùi Văn Hà',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Bùi Văn Hà',0,NULL,'2026-05-12 12:53:44','2026-05-12 12:53:44',NULL),(113,1,'ORDER','CREATE','CUSTOMER',3,'Bùi Văn Hà',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Bùi Văn Hà',1,'2026-05-12 14:04:55','2026-05-12 14:04:34','2026-05-12 14:04:55',NULL),(114,2,'ORDER','CREATE','CUSTOMER',3,'Bùi Văn Hà',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Bùi Văn Hà',1,'2026-05-13 12:32:21','2026-05-12 14:04:34','2026-05-12 14:04:34',NULL),(115,3,'ORDER','CREATE','CUSTOMER',3,'Bùi Văn Hà',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Bùi Văn Hà',0,NULL,'2026-05-12 14:04:34','2026-05-12 14:04:34',NULL),(116,4,'ORDER','CREATE','CUSTOMER',3,'Bùi Văn Hà',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Bùi Văn Hà',0,NULL,'2026-05-12 14:04:34','2026-05-12 14:04:34',NULL),(117,1,'ORDER','CREATE','CUSTOMER',3,'Bùi Văn Hà',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Bùi Văn Hà',1,'2026-05-12 15:24:53','2026-05-12 15:24:32','2026-05-12 15:24:53',NULL),(118,2,'ORDER','CREATE','CUSTOMER',3,'Bùi Văn Hà',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Bùi Văn Hà',1,'2026-05-13 12:32:21','2026-05-12 15:24:32','2026-05-12 15:24:32',NULL),(119,3,'ORDER','CREATE','CUSTOMER',3,'Bùi Văn Hà',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Bùi Văn Hà',0,NULL,'2026-05-12 15:24:32','2026-05-12 15:24:32',NULL),(120,4,'ORDER','CREATE','CUSTOMER',3,'Bùi Văn Hà',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Bùi Văn Hà',0,NULL,'2026-05-12 15:24:32','2026-05-12 15:24:32',NULL),(121,1,'ORDER','CREATE','CUSTOMER',3,'Bùi Văn Hà',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Bùi Văn Hà',1,'2026-05-13 17:48:49','2026-05-12 15:32:22','2026-05-12 15:32:22',NULL),(122,2,'ORDER','CREATE','CUSTOMER',3,'Bùi Văn Hà',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Bùi Văn Hà',1,'2026-05-13 12:32:21','2026-05-12 15:32:23','2026-05-12 15:32:23',NULL),(123,3,'ORDER','CREATE','CUSTOMER',3,'Bùi Văn Hà',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Bùi Văn Hà',0,NULL,'2026-05-12 15:32:23','2026-05-12 15:32:23',NULL),(124,4,'ORDER','CREATE','CUSTOMER',3,'Bùi Văn Hà',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Bùi Văn Hà',0,NULL,'2026-05-12 15:32:23','2026-05-12 15:32:23',NULL),(125,1,'ORDER','CREATE','CUSTOMER',3,'Bùi Văn Hà',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Bùi Văn Hà',1,'2026-05-13 17:48:49','2026-05-13 12:24:15','2026-05-13 12:24:15',NULL),(126,2,'ORDER','CREATE','CUSTOMER',3,'Bùi Văn Hà',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Bùi Văn Hà',1,'2026-05-13 12:32:21','2026-05-13 12:24:15','2026-05-13 12:24:15',NULL),(127,3,'ORDER','CREATE','CUSTOMER',3,'Bùi Văn Hà',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Bùi Văn Hà',0,NULL,'2026-05-13 12:24:15','2026-05-13 12:24:15',NULL),(128,4,'ORDER','CREATE','CUSTOMER',3,'Bùi Văn Hà',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Bùi Văn Hà',0,NULL,'2026-05-13 12:24:15','2026-05-13 12:24:15',NULL),(129,1,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',1,'2026-05-13 17:48:49','2026-05-13 12:31:55','2026-05-13 12:31:55',NULL),(130,2,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',1,'2026-05-13 12:32:16','2026-05-13 12:31:55','2026-05-13 12:32:16',NULL),(131,3,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',0,NULL,'2026-05-13 12:31:55','2026-05-13 12:31:55',NULL),(132,4,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',0,NULL,'2026-05-13 12:31:55','2026-05-13 12:31:55',NULL),(133,1,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',1,'2026-05-13 17:48:49','2026-05-13 15:24:32','2026-05-13 15:24:32',NULL),(134,2,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',0,NULL,'2026-05-13 15:24:32','2026-05-13 15:24:32',NULL),(135,3,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',0,NULL,'2026-05-13 15:24:32','2026-05-13 15:24:32',NULL),(136,4,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',0,NULL,'2026-05-13 15:24:32','2026-05-13 15:24:32',NULL),(137,1,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',1,'2026-05-13 17:48:49','2026-05-13 15:31:49','2026-05-13 15:31:49',NULL),(138,2,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',0,NULL,'2026-05-13 15:31:49','2026-05-13 15:31:49',NULL),(139,3,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',0,NULL,'2026-05-13 15:31:49','2026-05-13 15:31:49',NULL),(140,4,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',0,NULL,'2026-05-13 15:31:49','2026-05-13 15:31:49',NULL),(141,1,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',1,'2026-05-13 17:48:49','2026-05-13 16:03:04','2026-05-13 16:03:04',NULL),(142,2,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',0,NULL,'2026-05-13 16:03:04','2026-05-13 16:03:04',NULL),(143,3,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',0,NULL,'2026-05-13 16:03:04','2026-05-13 16:03:04',NULL),(144,4,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',0,NULL,'2026-05-13 16:03:04','2026-05-13 16:03:04',NULL),(145,1,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',1,'2026-05-13 17:48:49','2026-05-13 16:10:00','2026-05-13 16:10:00',NULL),(146,2,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',0,NULL,'2026-05-13 16:10:00','2026-05-13 16:10:00',NULL),(147,3,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',0,NULL,'2026-05-13 16:10:00','2026-05-13 16:10:00',NULL),(148,4,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',0,NULL,'2026-05-13 16:10:00','2026-05-13 16:10:00',NULL),(149,1,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',1,'2026-05-13 17:48:49','2026-05-13 16:24:22','2026-05-13 16:24:22',NULL),(150,2,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',0,NULL,'2026-05-13 16:24:22','2026-05-13 16:24:22',NULL),(151,3,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',0,NULL,'2026-05-13 16:24:23','2026-05-13 16:24:23',NULL),(152,4,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',0,NULL,'2026-05-13 16:24:23','2026-05-13 16:24:23',NULL),(153,1,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',1,'2026-05-13 17:48:49','2026-05-13 16:42:37','2026-05-13 16:42:37',NULL),(154,2,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',0,NULL,'2026-05-13 16:42:37','2026-05-13 16:42:37',NULL),(155,3,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',0,NULL,'2026-05-13 16:42:38','2026-05-13 16:42:38',NULL),(156,4,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',0,NULL,'2026-05-13 16:42:38','2026-05-13 16:42:38',NULL),(157,1,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',1,'2026-05-13 17:48:49','2026-05-13 16:51:47','2026-05-13 16:51:47',NULL),(158,2,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',0,NULL,'2026-05-13 16:51:49','2026-05-13 16:51:49',NULL),(159,3,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',0,NULL,'2026-05-13 16:51:50','2026-05-13 16:51:50',NULL),(160,4,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',0,NULL,'2026-05-13 16:51:50','2026-05-13 16:51:50',NULL),(161,1,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',1,'2026-05-13 17:48:49','2026-05-13 17:48:22','2026-05-13 17:48:22',NULL),(162,2,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',0,NULL,'2026-05-13 17:48:22','2026-05-13 17:48:22',NULL),(163,3,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',0,NULL,'2026-05-13 17:48:22','2026-05-13 17:48:22',NULL),(164,4,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',0,NULL,'2026-05-13 17:48:22','2026-05-13 17:48:22',NULL),(165,1,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',1,'2026-05-13 19:37:43','2026-05-13 19:37:18','2026-05-13 19:37:43',NULL),(166,2,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',0,NULL,'2026-05-13 19:37:18','2026-05-13 19:37:18',NULL),(167,3,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',0,NULL,'2026-05-13 19:37:18','2026-05-13 19:37:18',NULL),(168,4,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',0,NULL,'2026-05-13 19:37:18','2026-05-13 19:37:18',NULL),(169,1,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',1,'2026-05-31 13:15:53','2026-05-14 04:02:05','2026-05-14 04:02:05',NULL),(170,2,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',0,NULL,'2026-05-14 04:02:05','2026-05-14 04:02:05',NULL),(171,3,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',0,NULL,'2026-05-14 04:02:05','2026-05-14 04:02:05',NULL),(172,4,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',0,NULL,'2026-05-14 04:02:05','2026-05-14 04:02:05',NULL),(173,1,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',1,'2026-05-31 13:15:53','2026-05-14 04:09:13','2026-05-14 04:09:13',NULL),(174,2,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',0,NULL,'2026-05-14 04:09:13','2026-05-14 04:09:13',NULL),(175,3,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',0,NULL,'2026-05-14 04:09:13','2026-05-14 04:09:13',NULL),(176,4,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',0,NULL,'2026-05-14 04:09:13','2026-05-14 04:09:13',NULL),(177,1,'ORDER','CREATE','CUSTOMER',1,'Nguyễn Trà Giang',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Trà Giang',1,'2026-05-31 13:15:53','2026-05-14 04:12:40','2026-05-14 04:12:40',NULL),(178,2,'ORDER','CREATE','CUSTOMER',1,'Nguyễn Trà Giang',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Trà Giang',0,NULL,'2026-05-14 04:12:40','2026-05-14 04:12:40',NULL),(179,3,'ORDER','CREATE','CUSTOMER',1,'Nguyễn Trà Giang',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Trà Giang',0,NULL,'2026-05-14 04:12:40','2026-05-14 04:12:40',NULL),(180,4,'ORDER','CREATE','CUSTOMER',1,'Nguyễn Trà Giang',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Trà Giang',0,NULL,'2026-05-14 04:12:40','2026-05-14 04:12:40',NULL),(181,1,'ORDER','CREATE','CUSTOMER',1,'Nguyễn Trà Giang',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Trà Giang',1,'2026-05-31 13:15:53','2026-05-14 04:18:57','2026-05-14 04:18:57',NULL),(182,2,'ORDER','CREATE','CUSTOMER',1,'Nguyễn Trà Giang',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Trà Giang',0,NULL,'2026-05-14 04:18:57','2026-05-14 04:18:57',NULL),(183,3,'ORDER','CREATE','CUSTOMER',1,'Nguyễn Trà Giang',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Trà Giang',0,NULL,'2026-05-14 04:18:57','2026-05-14 04:18:57',NULL),(184,4,'ORDER','CREATE','CUSTOMER',1,'Nguyễn Trà Giang',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Trà Giang',0,NULL,'2026-05-14 04:18:57','2026-05-14 04:18:57',NULL),(185,1,'ORDER','CREATE','CUSTOMER',3,'Bùi Văn Hà',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Bùi Văn Hà',1,'2026-05-31 13:15:53','2026-05-14 04:40:35','2026-05-14 04:40:35',NULL),(186,2,'ORDER','CREATE','CUSTOMER',3,'Bùi Văn Hà',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Bùi Văn Hà',0,NULL,'2026-05-14 04:40:35','2026-05-14 04:40:35',NULL),(187,3,'ORDER','CREATE','CUSTOMER',3,'Bùi Văn Hà',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Bùi Văn Hà',0,NULL,'2026-05-14 04:40:35','2026-05-14 04:40:35',NULL),(188,4,'ORDER','CREATE','CUSTOMER',3,'Bùi Văn Hà',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Bùi Văn Hà',0,NULL,'2026-05-14 04:40:35','2026-05-14 04:40:35',NULL),(189,1,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',1,'2026-05-31 13:15:53','2026-05-14 04:44:19','2026-05-14 04:44:19',NULL),(190,2,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',0,NULL,'2026-05-14 04:44:19','2026-05-14 04:44:19',NULL),(191,3,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',0,NULL,'2026-05-14 04:44:19','2026-05-14 04:44:19',NULL),(192,4,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',0,NULL,'2026-05-14 04:44:19','2026-05-14 04:44:19',NULL),(193,1,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',1,'2026-05-31 13:15:53','2026-05-14 05:11:36','2026-05-14 05:11:36',NULL),(194,2,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',0,NULL,'2026-05-14 05:11:36','2026-05-14 05:11:36',NULL),(195,3,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',0,NULL,'2026-05-14 05:11:36','2026-05-14 05:11:36',NULL),(196,4,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',0,NULL,'2026-05-14 05:11:36','2026-05-14 05:11:36',NULL),(197,1,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',1,'2026-05-31 13:15:53','2026-05-14 05:15:14','2026-05-14 05:15:14',NULL),(198,2,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',0,NULL,'2026-05-14 05:15:14','2026-05-14 05:15:14',NULL),(199,3,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',0,NULL,'2026-05-14 05:15:14','2026-05-14 05:15:14',NULL),(200,4,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',0,NULL,'2026-05-14 05:15:14','2026-05-14 05:15:14',NULL),(201,1,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',1,'2026-05-31 13:15:53','2026-05-14 05:22:44','2026-05-14 05:22:44',NULL),(202,2,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',0,NULL,'2026-05-14 05:22:44','2026-05-14 05:22:44',NULL),(203,3,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',0,NULL,'2026-05-14 05:22:44','2026-05-14 05:22:44',NULL),(204,4,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',0,NULL,'2026-05-14 05:22:44','2026-05-14 05:22:44',NULL),(205,1,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',1,'2026-05-31 13:15:53','2026-05-14 05:41:27','2026-05-14 05:41:27',NULL),(206,2,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',0,NULL,'2026-05-14 05:41:27','2026-05-14 05:41:27',NULL),(207,3,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',0,NULL,'2026-05-14 05:41:27','2026-05-14 05:41:27',NULL),(208,4,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',0,NULL,'2026-05-14 05:41:27','2026-05-14 05:41:27',NULL),(209,1,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',1,'2026-05-31 13:15:53','2026-05-14 06:11:09','2026-05-14 06:11:09',NULL),(210,2,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',0,NULL,'2026-05-14 06:11:09','2026-05-14 06:11:09',NULL),(211,3,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',0,NULL,'2026-05-14 06:11:09','2026-05-14 06:11:09',NULL),(212,4,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',0,NULL,'2026-05-14 06:11:09','2026-05-14 06:11:09',NULL),(213,1,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',1,'2026-05-31 13:15:53','2026-05-14 06:19:48','2026-05-14 06:19:48',NULL),(214,2,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',0,NULL,'2026-05-14 06:19:48','2026-05-14 06:19:48',NULL),(215,3,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',0,NULL,'2026-05-14 06:19:48','2026-05-14 06:19:48',NULL),(216,4,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',0,NULL,'2026-05-14 06:19:48','2026-05-14 06:19:48',NULL),(217,1,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',1,'2026-05-31 13:15:53','2026-05-14 06:29:35','2026-05-14 06:29:35',NULL),(218,2,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',0,NULL,'2026-05-14 06:29:35','2026-05-14 06:29:35',NULL),(219,3,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',0,NULL,'2026-05-14 06:29:35','2026-05-14 06:29:35',NULL),(220,4,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',0,NULL,'2026-05-14 06:29:36','2026-05-14 06:29:36',NULL),(221,1,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',1,'2026-05-31 13:15:53','2026-05-14 06:33:26','2026-05-14 06:33:26',NULL),(222,2,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',0,NULL,'2026-05-14 06:33:26','2026-05-14 06:33:26',NULL),(223,3,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',0,NULL,'2026-05-14 06:33:26','2026-05-14 06:33:26',NULL),(224,4,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',0,NULL,'2026-05-14 06:33:26','2026-05-14 06:33:26',NULL),(225,1,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',1,'2026-05-31 13:15:53','2026-05-14 06:48:36','2026-05-14 06:48:36',NULL),(226,2,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',0,NULL,'2026-05-14 06:48:36','2026-05-14 06:48:36',NULL),(227,3,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',0,NULL,'2026-05-14 06:48:36','2026-05-14 06:48:36',NULL),(228,4,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',0,NULL,'2026-05-14 06:48:36','2026-05-14 06:48:36',NULL),(229,1,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',1,'2026-05-31 13:15:53','2026-05-14 07:30:18','2026-05-14 07:30:18',NULL),(230,2,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',0,NULL,'2026-05-14 07:30:19','2026-05-14 07:30:19',NULL),(231,3,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',0,NULL,'2026-05-14 07:30:19','2026-05-14 07:30:19',NULL),(232,4,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',0,NULL,'2026-05-14 07:30:19','2026-05-14 07:30:19',NULL),(233,1,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',1,'2026-05-31 13:15:53','2026-05-14 12:48:06','2026-05-14 12:48:06',NULL),(234,2,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',0,NULL,'2026-05-14 12:48:06','2026-05-14 12:48:06',NULL),(235,3,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',0,NULL,'2026-05-14 12:48:06','2026-05-14 12:48:06',NULL),(236,4,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',0,NULL,'2026-05-14 12:48:07','2026-05-14 12:48:07',NULL),(237,1,'ORDER','CREATE','CUSTOMER',1,'Nguyễn Trà Giang',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Trà Giang',1,'2026-05-31 13:15:53','2026-05-14 13:00:51','2026-05-14 13:00:51',NULL),(238,2,'ORDER','CREATE','CUSTOMER',1,'Nguyễn Trà Giang',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Trà Giang',0,NULL,'2026-05-14 13:00:52','2026-05-14 13:00:52',NULL),(239,3,'ORDER','CREATE','CUSTOMER',1,'Nguyễn Trà Giang',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Trà Giang',0,NULL,'2026-05-14 13:00:52','2026-05-14 13:00:52',NULL),(240,4,'ORDER','CREATE','CUSTOMER',1,'Nguyễn Trà Giang',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Trà Giang',0,NULL,'2026-05-14 13:00:52','2026-05-14 13:00:52',NULL),(241,1,'ORDER','CREATE','CUSTOMER',1,'Nguyễn Trà Giang',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Trà Giang',1,'2026-05-31 13:15:53','2026-05-14 14:02:14','2026-05-14 14:02:14',NULL),(242,2,'ORDER','CREATE','CUSTOMER',1,'Nguyễn Trà Giang',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Trà Giang',0,NULL,'2026-05-14 14:02:14','2026-05-14 14:02:14',NULL),(243,3,'ORDER','CREATE','CUSTOMER',1,'Nguyễn Trà Giang',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Trà Giang',0,NULL,'2026-05-14 14:02:14','2026-05-14 14:02:14',NULL),(244,4,'ORDER','CREATE','CUSTOMER',1,'Nguyễn Trà Giang',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Trà Giang',0,NULL,'2026-05-14 14:02:14','2026-05-14 14:02:14',NULL),(245,1,'ORDER','CREATE','CUSTOMER',1,'Nguyễn Trà Giang',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Trà Giang',1,'2026-05-31 13:15:53','2026-05-14 14:14:30','2026-05-14 14:14:30',NULL),(246,2,'ORDER','CREATE','CUSTOMER',1,'Nguyễn Trà Giang',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Trà Giang',0,NULL,'2026-05-14 14:14:30','2026-05-14 14:14:30',NULL),(247,3,'ORDER','CREATE','CUSTOMER',1,'Nguyễn Trà Giang',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Trà Giang',0,NULL,'2026-05-14 14:14:30','2026-05-14 14:14:30',NULL),(248,4,'ORDER','CREATE','CUSTOMER',1,'Nguyễn Trà Giang',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Trà Giang',0,NULL,'2026-05-14 14:14:30','2026-05-14 14:14:30',NULL),(249,1,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',1,'2026-05-31 13:15:53','2026-05-14 14:57:21','2026-05-14 14:57:21',NULL),(250,2,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',0,NULL,'2026-05-14 14:57:21','2026-05-14 14:57:21',NULL),(251,3,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',0,NULL,'2026-05-14 14:57:21','2026-05-14 14:57:21',NULL),(252,4,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',0,NULL,'2026-05-14 14:57:21','2026-05-14 14:57:21',NULL),(253,1,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',1,'2026-05-31 13:15:53','2026-05-14 14:57:43','2026-05-14 14:57:43',NULL),(254,2,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',0,NULL,'2026-05-14 14:57:43','2026-05-14 14:57:43',NULL),(255,3,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',0,NULL,'2026-05-14 14:57:43','2026-05-14 14:57:43',NULL),(256,4,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',0,NULL,'2026-05-14 14:57:43','2026-05-14 14:57:43',NULL),(257,1,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',1,'2026-05-31 13:15:53','2026-05-14 15:08:39','2026-05-14 15:08:39',NULL),(258,2,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',0,NULL,'2026-05-14 15:08:39','2026-05-14 15:08:39',NULL),(259,3,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',0,NULL,'2026-05-14 15:08:39','2026-05-14 15:08:39',NULL),(260,4,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',0,NULL,'2026-05-14 15:08:39','2026-05-14 15:08:39',NULL),(261,1,'ORDER','CREATE','CUSTOMER',3,'Bùi Văn Hà',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Bùi Văn Hà',1,'2026-05-31 13:15:53','2026-05-15 14:07:11','2026-05-15 14:07:11',NULL),(262,2,'ORDER','CREATE','CUSTOMER',3,'Bùi Văn Hà',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Bùi Văn Hà',0,NULL,'2026-05-15 14:07:11','2026-05-15 14:07:11',NULL),(263,3,'ORDER','CREATE','CUSTOMER',3,'Bùi Văn Hà',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Bùi Văn Hà',0,NULL,'2026-05-15 14:07:11','2026-05-15 14:07:11',NULL),(264,4,'ORDER','CREATE','CUSTOMER',3,'Bùi Văn Hà',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Bùi Văn Hà',0,NULL,'2026-05-15 14:07:11','2026-05-15 14:07:11',NULL),(265,1,'ORDER','CANCEL','CUSTOMER',3,NULL,NULL,NULL,NULL,'Đơn hàng đã bị hủy','Đơn hàng ORD-791B849017 đã bị hủy bởi khách hàng',1,'2026-05-31 13:15:53','2026-05-15 14:44:09','2026-05-15 14:44:09',NULL),(266,2,'ORDER','CANCEL','CUSTOMER',3,NULL,NULL,NULL,NULL,'Đơn hàng đã bị hủy','Đơn hàng ORD-791B849017 đã bị hủy bởi khách hàng',0,NULL,'2026-05-15 14:44:09','2026-05-15 14:44:09',NULL),(267,3,'ORDER','CANCEL','CUSTOMER',3,NULL,NULL,NULL,NULL,'Đơn hàng đã bị hủy','Đơn hàng ORD-791B849017 đã bị hủy bởi khách hàng',0,NULL,'2026-05-15 14:44:09','2026-05-15 14:44:09',NULL),(268,4,'ORDER','CANCEL','CUSTOMER',3,NULL,NULL,NULL,NULL,'Đơn hàng đã bị hủy','Đơn hàng ORD-791B849017 đã bị hủy bởi khách hàng',0,NULL,'2026-05-15 14:44:09','2026-05-15 14:44:09',NULL),(269,1,'ORDER','CANCEL','CUSTOMER',3,NULL,NULL,NULL,NULL,'Đơn hàng đã bị hủy','Đơn hàng ORD-791B849017 đã bị hủy bởi khách hàng',1,'2026-05-31 13:15:53','2026-05-15 14:45:31','2026-05-15 14:45:31',NULL),(270,2,'ORDER','CANCEL','CUSTOMER',3,NULL,NULL,NULL,NULL,'Đơn hàng đã bị hủy','Đơn hàng ORD-791B849017 đã bị hủy bởi khách hàng',0,NULL,'2026-05-15 14:45:31','2026-05-15 14:45:31',NULL),(271,3,'ORDER','CANCEL','CUSTOMER',3,NULL,NULL,NULL,NULL,'Đơn hàng đã bị hủy','Đơn hàng ORD-791B849017 đã bị hủy bởi khách hàng',0,NULL,'2026-05-15 14:45:31','2026-05-15 14:45:31',NULL),(272,4,'ORDER','CANCEL','CUSTOMER',3,NULL,NULL,NULL,NULL,'Đơn hàng đã bị hủy','Đơn hàng ORD-791B849017 đã bị hủy bởi khách hàng',0,NULL,'2026-05-15 14:45:31','2026-05-15 14:45:31',NULL),(273,1,'ORDER','CREATE','CUSTOMER',3,'Bùi Văn Hà',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Bùi Văn Hà',1,'2026-05-31 13:15:53','2026-05-15 14:48:39','2026-05-15 14:48:39',NULL),(274,2,'ORDER','CREATE','CUSTOMER',3,'Bùi Văn Hà',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Bùi Văn Hà',0,NULL,'2026-05-15 14:48:39','2026-05-15 14:48:39',NULL),(275,3,'ORDER','CREATE','CUSTOMER',3,'Bùi Văn Hà',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Bùi Văn Hà',0,NULL,'2026-05-15 14:48:39','2026-05-15 14:48:39',NULL),(276,4,'ORDER','CREATE','CUSTOMER',3,'Bùi Văn Hà',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Bùi Văn Hà',0,NULL,'2026-05-15 14:48:39','2026-05-15 14:48:39',NULL),(285,1,'ORDER','CANCEL','CUSTOMER',2,NULL,NULL,NULL,NULL,'Đơn hàng đã bị hủy','Đơn hàng ORD-FC688C838C đã bị hủy bởi khách hàng',1,'2026-05-31 13:15:53','2026-05-16 05:15:13','2026-05-16 05:15:13',NULL),(286,2,'ORDER','CANCEL','CUSTOMER',2,NULL,NULL,NULL,NULL,'Đơn hàng đã bị hủy','Đơn hàng ORD-FC688C838C đã bị hủy bởi khách hàng',0,NULL,'2026-05-16 05:15:13','2026-05-16 05:15:13',NULL),(287,3,'ORDER','CANCEL','CUSTOMER',2,NULL,NULL,NULL,NULL,'Đơn hàng đã bị hủy','Đơn hàng ORD-FC688C838C đã bị hủy bởi khách hàng',0,NULL,'2026-05-16 05:15:13','2026-05-16 05:15:13',NULL),(288,4,'ORDER','CANCEL','CUSTOMER',2,NULL,NULL,NULL,NULL,'Đơn hàng đã bị hủy','Đơn hàng ORD-FC688C838C đã bị hủy bởi khách hàng',0,NULL,'2026-05-16 05:15:13','2026-05-16 05:15:13',NULL),(289,1,'ORDER','CANCEL','CUSTOMER',2,NULL,NULL,NULL,NULL,'Đơn hàng đã bị hủy','Đơn hàng ORD-FC688C838C đã bị hủy bởi khách hàng',1,'2026-05-31 13:15:53','2026-05-16 05:23:40','2026-05-16 05:23:40',NULL),(290,2,'ORDER','CANCEL','CUSTOMER',2,NULL,NULL,NULL,NULL,'Đơn hàng đã bị hủy','Đơn hàng ORD-FC688C838C đã bị hủy bởi khách hàng',0,NULL,'2026-05-16 05:23:40','2026-05-16 05:23:40',NULL),(291,3,'ORDER','CANCEL','CUSTOMER',2,NULL,NULL,NULL,NULL,'Đơn hàng đã bị hủy','Đơn hàng ORD-FC688C838C đã bị hủy bởi khách hàng',0,NULL,'2026-05-16 05:23:40','2026-05-16 05:23:40',NULL),(292,4,'ORDER','CANCEL','CUSTOMER',2,NULL,NULL,NULL,NULL,'Đơn hàng đã bị hủy','Đơn hàng ORD-FC688C838C đã bị hủy bởi khách hàng',0,NULL,'2026-05-16 05:23:40','2026-05-16 05:23:40',NULL),(301,1,'ORDER','CANCEL','CUSTOMER',2,NULL,NULL,NULL,NULL,'Đơn hàng đã bị hủy','Đơn hàng ORD-FC688C838C đã bị hủy bởi khách hàng',1,'2026-05-31 13:15:53','2026-05-16 05:44:31','2026-05-16 05:44:31',NULL),(302,2,'ORDER','CANCEL','CUSTOMER',2,NULL,NULL,NULL,NULL,'Đơn hàng đã bị hủy','Đơn hàng ORD-FC688C838C đã bị hủy bởi khách hàng',0,NULL,'2026-05-16 05:44:31','2026-05-16 05:44:31',NULL),(303,3,'ORDER','CANCEL','CUSTOMER',2,NULL,NULL,NULL,NULL,'Đơn hàng đã bị hủy','Đơn hàng ORD-FC688C838C đã bị hủy bởi khách hàng',0,NULL,'2026-05-16 05:44:31','2026-05-16 05:44:31',NULL),(304,4,'ORDER','CANCEL','CUSTOMER',2,NULL,NULL,NULL,NULL,'Đơn hàng đã bị hủy','Đơn hàng ORD-FC688C838C đã bị hủy bởi khách hàng',0,NULL,'2026-05-16 05:44:31','2026-05-16 05:44:31',NULL),(305,1,'ORDER','CREATE','CUSTOMER',3,'Bùi Văn Hà',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Bùi Văn Hà',1,'2026-05-31 13:15:53','2026-05-18 05:29:12','2026-05-18 05:29:12',NULL),(306,2,'ORDER','CREATE','CUSTOMER',3,'Bùi Văn Hà',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Bùi Văn Hà',0,NULL,'2026-05-18 05:29:12','2026-05-18 05:29:12',NULL),(307,3,'ORDER','CREATE','CUSTOMER',3,'Bùi Văn Hà',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Bùi Văn Hà',0,NULL,'2026-05-18 05:29:12','2026-05-18 05:29:12',NULL),(308,4,'ORDER','CREATE','CUSTOMER',3,'Bùi Văn Hà',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Bùi Văn Hà',0,NULL,'2026-05-18 05:29:12','2026-05-18 05:29:12',NULL),(309,1,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',1,'2026-05-31 13:15:53','2026-05-18 14:20:20','2026-05-18 14:20:20',NULL),(310,2,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',0,NULL,'2026-05-18 14:20:20','2026-05-18 14:20:20',NULL),(311,3,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',0,NULL,'2026-05-18 14:20:20','2026-05-18 14:20:20',NULL),(312,4,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',0,NULL,'2026-05-18 14:20:20','2026-05-18 14:20:20',NULL),(313,1,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',1,'2026-05-31 13:15:53','2026-05-18 14:31:55','2026-05-18 14:31:55',NULL),(314,2,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',0,NULL,'2026-05-18 14:31:55','2026-05-18 14:31:55',NULL),(315,3,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',0,NULL,'2026-05-18 14:31:55','2026-05-18 14:31:55',NULL),(316,4,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',0,NULL,'2026-05-18 14:31:55','2026-05-18 14:31:55',NULL),(317,1,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',1,'2026-05-31 13:15:53','2026-05-18 14:36:50','2026-05-18 14:36:50',NULL),(318,2,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',0,NULL,'2026-05-18 14:36:50','2026-05-18 14:36:50',NULL),(319,3,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',0,NULL,'2026-05-18 14:36:50','2026-05-18 14:36:50',NULL),(320,4,'ORDER','CREATE','CUSTOMER',2,'Nguyễn Thị Hồng Nhung',NULL,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Thị Hồng Nhung',0,NULL,'2026-05-18 14:36:51','2026-05-18 14:36:51',NULL),(321,1,'ORDER','CREATE','CUSTOMER',1,'Nguyễn Trà Giang',80,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Trà Giang',1,'2026-05-31 13:42:37','2026-05-31 13:41:49','2026-05-31 13:42:37',NULL),(322,2,'ORDER','CREATE','CUSTOMER',1,'Nguyễn Trà Giang',80,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Trà Giang',0,NULL,'2026-05-31 13:41:49','2026-05-31 13:41:49',NULL),(323,3,'ORDER','CREATE','CUSTOMER',1,'Nguyễn Trà Giang',80,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Trà Giang',0,NULL,'2026-05-31 13:41:49','2026-05-31 13:41:49',NULL),(324,4,'ORDER','CREATE','CUSTOMER',1,'Nguyễn Trà Giang',80,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Trà Giang',0,NULL,'2026-05-31 13:41:49','2026-05-31 13:41:49',NULL),(325,1,'ORDER','CREATE','CUSTOMER',3,'Bùi Văn Hà',81,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Bùi Văn Hà',1,'2026-06-04 13:54:42','2026-06-04 13:53:11','2026-06-04 13:54:42',NULL),(326,2,'ORDER','CREATE','CUSTOMER',3,'Bùi Văn Hà',81,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Bùi Văn Hà',0,NULL,'2026-06-04 13:53:11','2026-06-04 13:53:11',NULL),(327,3,'ORDER','CREATE','CUSTOMER',3,'Bùi Văn Hà',81,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Bùi Văn Hà',0,NULL,'2026-06-04 13:53:11','2026-06-04 13:53:11',NULL),(328,4,'ORDER','CREATE','CUSTOMER',3,'Bùi Văn Hà',81,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Bùi Văn Hà',0,NULL,'2026-06-04 13:53:11','2026-06-04 13:53:11',NULL),(329,1,'ORDER','CREATE','CUSTOMER',1,'Nguyễn Trà Giang',82,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Trà Giang',1,'2026-06-04 13:57:35','2026-06-04 13:57:19','2026-06-04 13:57:35',NULL),(330,2,'ORDER','CREATE','CUSTOMER',1,'Nguyễn Trà Giang',82,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Trà Giang',0,NULL,'2026-06-04 13:57:19','2026-06-04 13:57:19',NULL),(331,3,'ORDER','CREATE','CUSTOMER',1,'Nguyễn Trà Giang',82,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Trà Giang',0,NULL,'2026-06-04 13:57:19','2026-06-04 13:57:19',NULL),(332,4,'ORDER','CREATE','CUSTOMER',1,'Nguyễn Trà Giang',82,NULL,NULL,'Đơn hàng mới','Bạn có đơn hàng mới từ khách hàng Nguyễn Trà Giang',0,NULL,'2026-06-04 13:57:19','2026-06-04 13:57:19',NULL),(333,1,'EVALUATE','CREATE','CUSTOMER',1,'Nguyễn Trà Giang',NULL,NULL,17,'Đánh giá mới','Nguyễn Trà Giang đã đánh giá sản phẩm iPhone 17 Pro Max',1,'2026-06-04 14:03:37','2026-06-04 14:03:24','2026-06-04 14:03:37',NULL),(334,2,'EVALUATE','CREATE','CUSTOMER',1,'Nguyễn Trà Giang',NULL,NULL,17,'Đánh giá mới','Nguyễn Trà Giang đã đánh giá sản phẩm iPhone 17 Pro Max',0,NULL,'2026-06-04 14:03:24','2026-06-04 14:03:24',NULL),(335,3,'EVALUATE','CREATE','CUSTOMER',1,'Nguyễn Trà Giang',NULL,NULL,17,'Đánh giá mới','Nguyễn Trà Giang đã đánh giá sản phẩm iPhone 17 Pro Max',0,NULL,'2026-06-04 14:03:24','2026-06-04 14:03:24',NULL),(336,4,'EVALUATE','CREATE','CUSTOMER',1,'Nguyễn Trà Giang',NULL,NULL,17,'Đánh giá mới','Nguyễn Trà Giang đã đánh giá sản phẩm iPhone 17 Pro Max',0,NULL,'2026-06-04 14:03:24','2026-06-04 14:03:24',NULL),(337,1,'EVALUATE','CREATE','CUSTOMER',3,'Bùi Văn Hà',NULL,NULL,18,'Đánh giá mới','Bùi Văn Hà đã đánh giá sản phẩm iPhone 17 Pro Max',1,'2026-06-04 14:15:20','2026-06-04 14:14:49','2026-06-04 14:15:20',NULL),(338,2,'EVALUATE','CREATE','CUSTOMER',3,'Bùi Văn Hà',NULL,NULL,18,'Đánh giá mới','Bùi Văn Hà đã đánh giá sản phẩm iPhone 17 Pro Max',0,NULL,'2026-06-04 14:14:49','2026-06-04 14:14:49',NULL),(339,3,'EVALUATE','CREATE','CUSTOMER',3,'Bùi Văn Hà',NULL,NULL,18,'Đánh giá mới','Bùi Văn Hà đã đánh giá sản phẩm iPhone 17 Pro Max',0,NULL,'2026-06-04 14:14:49','2026-06-04 14:14:49',NULL),(340,4,'EVALUATE','CREATE','CUSTOMER',3,'Bùi Văn Hà',NULL,NULL,18,'Đánh giá mới','Bùi Văn Hà đã đánh giá sản phẩm iPhone 17 Pro Max',0,NULL,'2026-06-04 14:14:49','2026-06-04 14:14:49',NULL);
/*!40000 ALTER TABLE `notifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `order_items`
--

DROP TABLE IF EXISTS `order_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `order_items` (
  `order_item_id` int unsigned NOT NULL AUTO_INCREMENT,
  `order_id` int unsigned NOT NULL,
  `variant_id` int unsigned NOT NULL,
  `product_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `product_price` decimal(15,2) DEFAULT NULL,
  `ram_gb` int DEFAULT NULL,
  `storage_gb` int DEFAULT NULL,
  `color_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `quantity` int DEFAULT '1',
  `created_at` datetime(6) DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `image_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `product_id` int NOT NULL,
  `original_price` decimal(15,2) DEFAULT NULL,
  `product_image` varchar(1024) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`order_item_id`),
  KEY `order_id` (`order_id`),
  CONSTRAINT `order_items_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`order_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=107 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `order_items`
--

LOCK TABLES `order_items` WRITE;
/*!40000 ALTER TABLE `order_items` DISABLE KEYS */;
INSERT INTO `order_items` VALUES (100,80,13,'Samsung Galaxy S25 Ultra',23400000.00,12,256,'Đen Titan',1,'2026-05-31 13:41:48.474995','2026-05-31 13:41:48.474995','http://localhost:8080/api/files/products/b7150924-b68e-41fe-a1c7-2d400d348337.png',2,26000000.00,NULL),(101,81,1,'iPhone 17 Pro Max',35150000.00,12,256,'Cam vũ trụ',1,'2026-06-04 13:53:11.084498','2026-06-04 13:53:11.084498','http://localhost:8080/api/files/products/8eb1d294-9578-4cc9-a253-e5605dbb468f.png',1,37000000.00,NULL),(102,81,13,'Samsung Galaxy S25 Ultra',23400000.00,12,256,'Đen Titan',1,'2026-06-04 13:53:11.106917','2026-06-04 13:53:11.106917','http://localhost:8080/api/files/products/b7150924-b68e-41fe-a1c7-2d400d348337.png',2,26000000.00,NULL),(103,81,67,'Xiaomi 17 Pro Max',23750000.00,12,512,'Trắng',1,'2026-06-04 13:53:11.127140','2026-06-04 13:53:11.127140','http://localhost:8080/api/files/products/c2f1c148-b2f2-4cd2-95fb-86107cdc974a.png',6,25000000.00,NULL),(104,81,79,'OPPO Find X7 Ultra',23700000.00,12,256,'Xanh đậm',1,'2026-06-04 13:53:11.141144','2026-06-04 13:53:11.141144','http://localhost:8080/api/files/products/676dbea9-3896-4151-92ad-ab2b53c79bbe.png',7,24000000.00,NULL),(105,81,88,'vivo X300 Ultra',25650000.00,12,256,'Đen',1,'2026-06-04 13:53:11.155010','2026-06-04 13:53:11.155010','http://localhost:8080/api/files/products/2043c287-d09f-4fe5-929d-dcc518ed58d5.png',8,27000000.00,NULL),(106,82,4,'iPhone 17 Pro Max',57000000.00,12,2048,'Cam vũ trụ',1,'2026-06-04 13:57:19.369938','2026-06-04 13:57:19.369938','http://localhost:8080/api/files/products/8eb1d294-9578-4cc9-a253-e5605dbb468f.png',1,60000000.00,NULL);
/*!40000 ALTER TABLE `order_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `orders`
--

DROP TABLE IF EXISTS `orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `orders` (
  `order_id` int unsigned NOT NULL AUTO_INCREMENT,
  `order_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `customer_id` int unsigned NOT NULL,
  `receiver_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `receiver_phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `shipping_address` text COLLATE utf8mb4_unicode_ci,
  `order_status` enum('PENDING_CONFIRM','PENDING_PAYMENT_CONFIRMATION','CONFIRMED','SHIPPING','PENDING_PICKUP','PENDING_SHIPPING','DELIVERED','CANCELLED') COLLATE utf8mb4_unicode_ci DEFAULT 'PENDING_CONFIRM',
  `cancel_reason_id` int unsigned DEFAULT NULL,
  `cancel_note` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cancelled_by` enum('CUSTOMER','ADMIN','SYSTEM') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cancelled_by_admin_id` int unsigned DEFAULT NULL,
  `cancelled_by_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cancelled_at` datetime DEFAULT NULL,
  `total_amount` decimal(15,2) DEFAULT '0.00',
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `customer_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `payment_method` enum('COD','BANK_TRANSFER') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `payment_status` enum('UNPAID','WAITING_CONFIRM','PAID','FAILED') COLLATE utf8mb4_unicode_ci DEFAULT 'UNPAID',
  `payment_note` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `payment_note_author` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `payment_note_date` datetime DEFAULT NULL,
  `inventory_deducted` bit(1) DEFAULT NULL,
  `address` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `customer_address` text COLLATE utf8mb4_unicode_ci,
  `customer_email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `customer_phone` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `deleted_at` datetime(6) DEFAULT NULL,
  `payment_confirmed_at` datetime(6) DEFAULT NULL,
  `phone` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`order_id`),
  UNIQUE KEY `order_code` (`order_code`),
  KEY `customer_id` (`customer_id`),
  KEY `cancel_reason_id` (`cancel_reason_id`),
  KEY `idx_orders_payment_status` (`payment_status`),
  KEY `idx_orders_payment_method` (`payment_method`),
  KEY `idx_orders_created_at` (`created_at`),
  KEY `idx_orders_code_status` (`order_code`,`payment_status`),
  KEY `idx_orders_cancelled_at` (`cancelled_at`),
  KEY `idx_orders_cancelled_by` (`cancelled_by`),
  KEY `idx_orders_cancel_admin` (`cancelled_by_admin_id`),
  CONSTRAINT `fk_orders_cancel_admin` FOREIGN KEY (`cancelled_by_admin_id`) REFERENCES `admin_accounts` (`admin_id`) ON DELETE SET NULL,
  CONSTRAINT `orders_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customer_accounts` (`customer_id`),
  CONSTRAINT `orders_ibfk_2` FOREIGN KEY (`cancel_reason_id`) REFERENCES `reasons` (`reason_id`)
) ENGINE=InnoDB AUTO_INCREMENT=83 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `orders`
--

LOCK TABLES `orders` WRITE;
/*!40000 ALTER TABLE `orders` DISABLE KEYS */;
INSERT INTO `orders` VALUES (80,'ORD-74996B3403',1,'Nguyễn Trà Giang','0978603384','Đan Phượng, Hà Nội','SHIPPING',NULL,NULL,NULL,NULL,NULL,NULL,23400000.00,'2026-05-31 13:41:48','2026-06-04 14:01:29','Nguyễn Trà Giang','nguyentragiang2005@gmail.com','BANK_TRANSFER','PAID','Oke','Bùi Văn Hà','2026-05-31 13:43:38',_binary '',NULL,NULL,NULL,NULL,NULL,'2026-05-31 13:43:37.599903',NULL),(81,'ORD-0AC3D64143',3,'Bùi Văn Hà','0978603388','Đan Phượng, Hà Nội','DELIVERED',NULL,NULL,NULL,NULL,NULL,NULL,131650000.00,'2026-06-04 13:53:11','2026-06-04 14:01:16','Bùi Văn Hà','habui28022019@gmail.com','BANK_TRANSFER','PAID','Bill chuẩn','Bùi Văn Hà','2026-06-04 13:56:17',_binary '',NULL,NULL,NULL,NULL,NULL,'2026-06-04 13:56:16.717322',NULL),(82,'ORD-413A64DBA1',1,'Nguyễn Trà Giang','0978603384','Đan Phượng, Hà Nội','DELIVERED',NULL,NULL,NULL,NULL,NULL,NULL,57000000.00,'2026-06-04 13:57:19','2026-06-04 14:01:06','Nguyễn Trà Giang','nguyentragiang2005@gmail.com','COD','PAID',NULL,NULL,NULL,_binary '',NULL,NULL,NULL,NULL,NULL,NULL,NULL);
/*!40000 ALTER TABLE `orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `password_reset_codes`
--

DROP TABLE IF EXISTS `password_reset_codes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `password_reset_codes` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `code_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expires_at` datetime(6) NOT NULL,
  `used_at` datetime(6) DEFAULT NULL,
  `verified_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_prc_email_created` (`email`,`created_at`),
  KEY `idx_prc_expires_at` (`expires_at`),
  KEY `idx_prc_used_at` (`used_at`)
) ENGINE=InnoDB AUTO_INCREMENT=26 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `password_reset_codes`
--

LOCK TABLES `password_reset_codes` WRITE;
/*!40000 ALTER TABLE `password_reset_codes` DISABLE KEYS */;
/*!40000 ALTER TABLE `password_reset_codes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `password_reset_otp`
--

DROP TABLE IF EXISTS `password_reset_otp`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `password_reset_otp` (
  `id` int NOT NULL AUTO_INCREMENT,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `otp` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `expires_at` datetime DEFAULT NULL,
  `is_used` tinyint(1) DEFAULT '0',
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_password_reset_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `password_reset_otp`
--

LOCK TABLES `password_reset_otp` WRITE;
/*!40000 ALTER TABLE `password_reset_otp` DISABLE KEYS */;
/*!40000 ALTER TABLE `password_reset_otp` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payment_attempts`
--

DROP TABLE IF EXISTS `payment_attempts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payment_attempts` (
  `attempt_id` int NOT NULL AUTO_INCREMENT,
  `order_id` int unsigned NOT NULL,
  `payment_method` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'BANK_TRANSFER',
  `status` enum('PENDING','WAITING_CONFIRM','PROCESSING','MATCHED','REJECTED','SUCCESS','FAILED') COLLATE utf8mb4_unicode_ci DEFAULT 'PENDING',
  `qr_content` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `transfer_image_url` varchar(1024) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `transfer_note` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `customer_confirmed_at` datetime DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  `reject_reason` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `amount` decimal(15,2) DEFAULT NULL,
  `processing_by_admin_id` int unsigned DEFAULT NULL,
  `reviewed_by_admin_id` int unsigned DEFAULT NULL,
  `processing_at` datetime DEFAULT NULL,
  `is_suspicious` tinyint(1) DEFAULT '0',
  `risk_level` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `processing_by_admin_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `lock_expires_at` datetime(6) DEFAULT NULL,
  `locked_at` datetime(6) DEFAULT NULL,
  `transfer_image_hash` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`attempt_id`),
  KEY `idx_payment_attempts_order` (`order_id`),
  KEY `idx_payment_attempts_status` (`status`),
  KEY `idx_payment_attempts_created_at` (`created_at`),
  KEY `idx_payment_attempts_processing` (`processing_by_admin_id`),
  KEY `idx_attempts_lock` (`processing_by_admin_id`),
  KEY `fk_payment_attempts_review_admin` (`reviewed_by_admin_id`),
  CONSTRAINT `fk_payment_attempts_processing_admin` FOREIGN KEY (`processing_by_admin_id`) REFERENCES `admin_accounts` (`admin_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_payment_attempts_review_admin` FOREIGN KEY (`reviewed_by_admin_id`) REFERENCES `admin_accounts` (`admin_id`) ON DELETE SET NULL,
  CONSTRAINT `payment_attempts_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`order_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payment_attempts`
--

LOCK TABLES `payment_attempts` WRITE;
/*!40000 ALTER TABLE `payment_attempts` DISABLE KEYS */;
INSERT INTO `payment_attempts` VALUES (1,80,'BANK_TRANSFER','MATCHED','00020101021238570010A00000072701270006970422011309786033820208QRIBFTTA5204581453037045802VN5903MBB6005HANOI62140810ORD-74996B34036304','http://localhost:8080/api/files/payments/8862c57c-7fc2-438d-9b18-190afe8dbd3b.png','Tôi đã chuyển khoản','2026-05-31 13:42:20','2026-05-31 13:43:38',NULL,23400000.00,NULL,1,'2026-05-31 13:43:30',1,'HIGH','2026-05-31 13:42:20',NULL,NULL,NULL,NULL),(2,81,'BANK_TRANSFER','MATCHED','00020101021238570010A00000072701270006970422011309786033820208QRIBFTTA5204581453037045802VN5903MBB6005HANOI62140810ORD-0AC3D641436304','http://localhost:8080/api/files/payments/ab479c7e-34b1-4c21-9e3c-e496c8350f7a.png','Tôi đã chuyển khoản thành công','2026-06-04 13:54:15','2026-06-04 13:56:17',NULL,131650000.00,NULL,1,'2026-06-04 13:56:08',1,'HIGH','2026-06-04 13:54:14',NULL,NULL,NULL,NULL);
/*!40000 ALTER TABLE `payment_attempts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payment_logs`
--

DROP TABLE IF EXISTS `payment_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payment_logs` (
  `log_id` bigint NOT NULL AUTO_INCREMENT,
  `order_id` int unsigned DEFAULT NULL,
  `payment_id` int unsigned DEFAULT NULL,
  `payment_attempt_id` int unsigned DEFAULT NULL,
  `transaction_id` int unsigned DEFAULT NULL,
  `admin_id` int unsigned DEFAULT NULL,
  `action_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `old_status` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `new_status` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `note` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `admin_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ip_address` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`log_id`),
  KEY `idx_payment_logs_order` (`order_id`),
  KEY `idx_payment_logs_payment` (`payment_id`),
  KEY `idx_payment_logs_attempt` (`payment_attempt_id`),
  KEY `idx_payment_logs_transaction` (`transaction_id`),
  KEY `idx_payment_logs_admin` (`admin_id`),
  KEY `idx_payment_logs_action` (`action_type`),
  CONSTRAINT `fk_payment_logs_admin` FOREIGN KEY (`admin_id`) REFERENCES `admin_accounts` (`admin_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_payment_logs_transaction` FOREIGN KEY (`transaction_id`) REFERENCES `bank_transactions` (`transaction_id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=26 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payment_logs`
--

LOCK TABLES `payment_logs` WRITE;
/*!40000 ALTER TABLE `payment_logs` DISABLE KEYS */;
INSERT INTO `payment_logs` VALUES (1,80,NULL,1,NULL,NULL,'CUSTOMER_CONFIRM','PENDING','WAITING_CONFIRM','Tôi đã chuyển khoản','2026-05-31 13:42:20','KHACH_HANG',NULL),(2,80,NULL,1,NULL,1,'VIEW_BILL','WAITING_CONFIRM','WAITING_CONFIRM','Quản trị viên đã xem ảnh minh chứng','2026-05-31 13:43:27','Bùi Văn Hà',NULL),(3,80,NULL,1,NULL,1,'LOCK_PROCESS','PROCESSING','PROCESSING','Quản trị viên đã khóa để xử lý','2026-05-31 13:43:30','Bùi Văn Hà',NULL),(4,80,58,1,NULL,1,'APPROVE_BILL','PROCESSING','SUCCESS','Oke','2026-05-31 13:43:38','Bùi Văn Hà',NULL),(5,80,NULL,1,NULL,1,'VIEW_BILL','MATCHED','MATCHED','Quản trị viên đã xem ảnh minh chứng','2026-06-03 13:33:09','Bùi Văn Hà',NULL),(6,80,NULL,1,NULL,1,'VIEW_BILL','MATCHED','MATCHED','Quản trị viên đã xem ảnh minh chứng','2026-06-03 13:35:23','Bùi Văn Hà',NULL),(7,80,NULL,1,NULL,1,'VIEW_BILL','MATCHED','MATCHED','Quản trị viên đã xem ảnh minh chứng','2026-06-03 14:18:42','Bùi Văn Hà',NULL),(8,80,NULL,1,NULL,1,'VIEW_BILL','MATCHED','MATCHED','Quản trị viên đã xem ảnh minh chứng','2026-06-03 14:28:06','Bùi Văn Hà',NULL),(9,80,NULL,1,NULL,1,'VIEW_BILL','MATCHED','MATCHED','Quản trị viên đã xem ảnh minh chứng','2026-06-03 14:31:29','Bùi Văn Hà',NULL),(10,80,NULL,1,NULL,1,'VIEW_BILL','MATCHED','MATCHED','Quản trị viên đã xem ảnh minh chứng','2026-06-03 14:35:08','Bùi Văn Hà',NULL),(11,80,NULL,1,NULL,1,'VIEW_BILL','MATCHED','MATCHED','Quản trị viên đã xem ảnh minh chứng','2026-06-03 14:38:09','Bùi Văn Hà',NULL),(12,80,NULL,1,NULL,1,'VIEW_BILL','MATCHED','MATCHED','Quản trị viên đã xem ảnh minh chứng','2026-06-03 16:13:20','Bùi Văn Hà',NULL),(13,80,NULL,1,NULL,1,'VIEW_BILL','MATCHED','MATCHED','Quản trị viên đã xem ảnh minh chứng','2026-06-03 16:13:29','Bùi Văn Hà',NULL),(14,80,NULL,1,NULL,1,'VIEW_BILL','MATCHED','MATCHED','Quản trị viên đã xem ảnh minh chứng','2026-06-04 12:49:02','Bùi Văn Hà',NULL),(15,80,NULL,1,NULL,1,'VIEW_BILL','MATCHED','MATCHED','Quản trị viên đã xem ảnh minh chứng','2026-06-04 12:49:11','Bùi Văn Hà',NULL),(16,80,NULL,1,NULL,1,'VIEW_BILL','MATCHED','MATCHED','Quản trị viên đã xem ảnh minh chứng','2026-06-04 12:54:38','Bùi Văn Hà',NULL),(17,80,NULL,1,NULL,1,'VIEW_BILL','MATCHED','MATCHED','Quản trị viên đã xem ảnh minh chứng','2026-06-04 12:54:40','Bùi Văn Hà',NULL),(18,80,NULL,1,NULL,1,'VIEW_BILL','MATCHED','MATCHED','Quản trị viên đã xem ảnh minh chứng','2026-06-04 12:55:34','Bùi Văn Hà',NULL),(19,80,NULL,1,NULL,1,'VIEW_BILL','MATCHED','MATCHED','Quản trị viên đã xem ảnh minh chứng','2026-06-04 12:55:46','Bùi Văn Hà',NULL),(20,81,NULL,2,NULL,NULL,'CUSTOMER_CONFIRM','PENDING','WAITING_CONFIRM','Tôi đã chuyển khoản thành công','2026-06-04 13:54:15','KHACH_HANG',NULL),(21,81,NULL,2,NULL,1,'VIEW_BILL','WAITING_CONFIRM','WAITING_CONFIRM','Quản trị viên đã xem ảnh minh chứng','2026-06-04 13:55:55','Bùi Văn Hà',NULL),(22,81,NULL,2,NULL,1,'VIEW_BILL','WAITING_CONFIRM','WAITING_CONFIRM','Quản trị viên đã xem ảnh minh chứng','2026-06-04 13:55:59','Bùi Văn Hà',NULL),(23,81,NULL,2,NULL,1,'LOCK_PROCESS','PROCESSING','PROCESSING','Quản trị viên đã khóa để xử lý','2026-06-04 13:56:08','Bùi Văn Hà',NULL),(24,81,59,2,NULL,1,'APPROVE_BILL','PROCESSING','SUCCESS','Bill chuẩn','2026-06-04 13:56:17','Bùi Văn Hà',NULL),(25,81,NULL,2,NULL,1,'VIEW_BILL','MATCHED','MATCHED','Quản trị viên đã xem ảnh minh chứng','2026-06-04 13:56:23','Bùi Văn Hà',NULL);
/*!40000 ALTER TABLE `payment_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payments`
--

DROP TABLE IF EXISTS `payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payments` (
  `payment_id` int unsigned NOT NULL AUTO_INCREMENT,
  `order_id` int unsigned NOT NULL,
  `order_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `customer_id` int unsigned DEFAULT NULL,
  `payment_method` enum('COD','BANK_TRANSFER') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `payment_status` enum('UNPAID','WAITING_CONFIRM','PAID','FAILED') COLLATE utf8mb4_unicode_ci DEFAULT 'UNPAID',
  `confirmed_by_admin_id` int unsigned DEFAULT NULL,
  `amount` decimal(15,2) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_deleted` bit(1) DEFAULT NULL,
  `deleted_at` datetime(6) DEFAULT NULL,
  `paid_at` datetime(6) DEFAULT NULL,
  `transaction_code` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`payment_id`),
  KEY `idx_payments_order_id` (`order_id`),
  KEY `idx_payments_customer_id` (`customer_id`),
  KEY `fk_payments_confirm_admin` (`confirmed_by_admin_id`),
  CONSTRAINT `fk_payments_confirm_admin` FOREIGN KEY (`confirmed_by_admin_id`) REFERENCES `admin_accounts` (`admin_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_payments_customer` FOREIGN KEY (`customer_id`) REFERENCES `customer_accounts` (`customer_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_payments_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`order_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=60 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payments`
--

LOCK TABLES `payments` WRITE;
/*!40000 ALTER TABLE `payments` DISABLE KEYS */;
INSERT INTO `payments` VALUES (58,80,'ORD-74996B3403',1,'BANK_TRANSFER','PAID',1,23400000.00,'2026-05-31 13:43:38','2026-05-31 13:43:38',_binary '\0',NULL,'2026-05-31 13:43:37.680006',NULL),(59,81,'ORD-0AC3D64143',3,'BANK_TRANSFER','PAID',1,131650000.00,'2026-06-04 13:56:17','2026-06-04 13:56:17',_binary '\0',NULL,'2026-06-04 13:56:17.381659',NULL);
/*!40000 ALTER TABLE `payments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `price_segments`
--

DROP TABLE IF EXISTS `price_segments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `price_segments` (
  `price_segment_id` int unsigned NOT NULL AUTO_INCREMENT,
  `segment_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `min_price` decimal(12,2) NOT NULL,
  `max_price` decimal(12,2) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `deleted_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`price_segment_id`),
  UNIQUE KEY `segment_name` (`segment_name`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `price_segments`
--

LOCK TABLES `price_segments` WRITE;
/*!40000 ALTER TABLE `price_segments` DISABLE KEYS */;
INSERT INTO `price_segments` VALUES (1,'20000000-100000000',20000000.00,100000000.00,'2026-04-20 18:33:46','2026-04-20 18:33:46',NULL),(2,'10000000-20000000',10000000.00,20000000.00,'2026-04-20 18:34:01','2026-04-20 18:34:01',NULL),(3,'5000000-10000000',5000000.00,10000000.00,'2026-04-20 18:34:17','2026-04-20 18:34:17',NULL),(4,'0-5000000',0.00,5000000.00,'2026-04-20 18:34:32','2026-04-20 18:34:32',NULL);
/*!40000 ALTER TABLE `price_segments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `product_color_images`
--

DROP TABLE IF EXISTS `product_color_images`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `product_color_images` (
  `image_id` int unsigned NOT NULL AUTO_INCREMENT,
  `product_color_id` int unsigned NOT NULL,
  `image_url` varchar(1024) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sort_order` int DEFAULT '0',
  PRIMARY KEY (`image_id`),
  KEY `product_color_id` (`product_color_id`),
  CONSTRAINT `product_color_images_ibfk_1` FOREIGN KEY (`product_color_id`) REFERENCES `product_colors` (`product_color_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=51 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `product_color_images`
--

LOCK TABLES `product_color_images` WRITE;
/*!40000 ALTER TABLE `product_color_images` DISABLE KEYS */;
INSERT INTO `product_color_images` VALUES (4,1,'http://localhost:8080/api/files/products/8eb1d294-9578-4cc9-a253-e5605dbb468f.png',0),(5,2,'http://localhost:8080/api/files/products/03b82ae4-6a47-4169-9478-6fb8cae3d9af.png',0),(6,3,'http://localhost:8080/api/files/products/f0fe65f4-d3c0-42e7-b3f2-a0f641d8d762.png',0),(7,4,'http://localhost:8080/api/files/products/b7150924-b68e-41fe-a1c7-2d400d348337.png',0),(8,5,'http://localhost:8080/api/files/products/73c5d153-7407-45c1-a5ff-6e90a2493f6d.png',0),(9,6,'http://localhost:8080/api/files/products/ed5eca1c-e540-4018-8825-92f1116aa31c.png',0),(10,7,'http://localhost:8080/api/files/products/c02f9da9-30a9-4cca-a2e2-6382898e1374.png',0),(11,8,'http://localhost:8080/api/files/products/2dd93bcf-ae2b-45fb-ba9a-0028e06a6df4.png',0),(12,9,'http://localhost:8080/api/files/products/eed5caf5-8014-42f4-919e-4e467188bf5b.png',0),(13,10,'http://localhost:8080/api/files/products/fd2906c1-0151-4cf6-ae13-ea7a43940e2a.png',0),(14,11,'http://localhost:8080/api/files/products/7f20d2f6-5503-476b-b3bf-1a2b19da8441.png',0),(15,12,'http://localhost:8080/api/files/products/01a829e4-9820-44f1-ad51-93cb98a4021c.png',0),(16,13,'http://localhost:8080/api/files/products/a1deb04d-1370-4c4a-934e-35a92a08ee73.png',0),(17,14,'http://localhost:8080/api/files/products/226629b9-ec64-4f79-bf56-29f9edfb08fb.png',0),(18,15,'http://localhost:8080/api/files/products/67395cea-44ea-40e5-a731-434ead35efa2.png',0),(19,16,'http://localhost:8080/api/files/products/ff5d9941-01b3-43a2-bce6-2a758a4ad76e.png',0),(20,17,'http://localhost:8080/api/files/products/c2a459d8-963a-4edd-ab34-e830776f3f47.png',0),(21,18,'http://localhost:8080/api/files/products/076594e4-4fd9-492d-9ce5-3535f46597df.png',0),(22,19,'http://localhost:8080/api/files/products/1e59a7bf-609d-4fd3-a944-449107454de7.png',0),(23,20,'http://localhost:8080/api/files/products/a29220cb-3b55-4783-b52f-3c277a4efe23.png',0),(24,21,'http://localhost:8080/api/files/products/b5023e02-08ba-4c9d-ac88-8e331c92c48a.png',0),(25,22,'http://localhost:8080/api/files/products/c2f1c148-b2f2-4cd2-95fb-86107cdc974a.png',0),(26,23,'http://localhost:8080/api/files/products/d6ad5c8c-9412-4164-9e5c-2be91d6583ef.png',0),(27,24,'http://localhost:8080/api/files/products/e88efe2e-95f3-451f-a6cd-66cdec80641a.png',0),(28,25,'http://localhost:8080/api/files/products/15f88fa8-7286-47cf-b7c5-b7b256d228f5.png',0),(29,26,'http://localhost:8080/api/files/products/676dbea9-3896-4151-92ad-ab2b53c79bbe.png',0),(30,27,'http://localhost:8080/api/files/products/ac71af4c-fb18-43a1-8707-06da92094330.png',0),(31,28,'http://localhost:8080/api/files/products/7b1320bd-9bb3-4e34-af3b-8ed40ac3c4ec.png',0),(32,29,'http://localhost:8080/api/files/products/2043c287-d09f-4fe5-929d-dcc518ed58d5.png',0),(33,30,'http://localhost:8080/api/files/products/3fcd397f-bc4f-4e0a-9518-05b4f15b0fad.png',0),(34,31,'http://localhost:8080/api/files/products/ebddfe8d-683b-4cbd-ab7f-16501c78da7c.png',0),(35,32,'http://localhost:8080/api/files/products/cf4a1b48-f866-4af9-982b-4e808cd8e763.png',0),(36,33,'http://localhost:8080/api/files/products/83e068e7-6b7a-4008-977f-5f3b4b204111.png',0),(37,34,'http://localhost:8080/api/files/products/4ca9ca34-b68f-4dc5-ad1a-7fc41dc7c752.png',0),(38,35,'http://localhost:8080/api/files/products/8f2abff1-e4b8-4537-8888-9ce5ff21d74f.png',0),(39,36,'http://localhost:8080/api/files/products/3baa86ee-f38f-4c69-91ac-b6c1c2829f85.png',0),(40,37,'http://localhost:8080/api/files/products/74031581-8561-4cfa-9617-9d69a319b4ed.png',0),(41,38,'http://localhost:8080/api/files/products/9dab7052-594a-4e6d-a95c-81ae5862961f.png',0),(42,39,'http://localhost:8080/api/files/products/a0f00d75-aff8-4bc7-b192-44a07ea7a2d6.png',0),(43,40,'http://localhost:8080/api/files/products/04ee5e2a-17ab-4914-9e54-fa5142a718d7.png',0),(44,41,'http://localhost:8080/api/files/products/59c9141e-d742-4b06-892b-edd903550442.png',0),(45,42,'http://localhost:8080/api/files/products/7ae986dc-1386-4702-ae6f-79eb2f4262b4.png',0),(46,43,'http://localhost:8080/api/files/products/dd4af6ae-67cc-4dfa-aace-e8e9ac0256fb.png',0),(47,44,'http://localhost:8080/api/files/products/377045fe-9dc0-418c-ad36-6c47742513b7.png',0),(48,45,'http://localhost:8080/api/files/products/eab3e6a3-f172-45a7-9669-70f2ff731f0f.png',0),(49,46,'http://localhost:8080/api/files/products/d379d6d4-fb43-4d24-94d5-03e515844ba3.png',0),(50,47,'http://localhost:8080/api/files/products/46aae95d-84bb-47a9-8a67-ce73c181a6ff.png',0);
/*!40000 ALTER TABLE `product_color_images` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `product_colors`
--

DROP TABLE IF EXISTS `product_colors`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `product_colors` (
  `product_color_id` int unsigned NOT NULL AUTO_INCREMENT,
  `product_id` int unsigned NOT NULL,
  `color_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `color_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `quantity` int DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `deleted_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`product_color_id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `product_colors_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=48 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `product_colors`
--

LOCK TABLES `product_colors` WRITE;
/*!40000 ALTER TABLE `product_colors` DISABLE KEYS */;
INSERT INTO `product_colors` VALUES (1,1,'Cam vũ trụ',NULL,'2026-04-21 05:38:54',0,'2026-06-04 13:56:17.116442',NULL),(2,1,'Bạc',NULL,'2026-04-21 05:38:54',0,'2026-05-12 15:26:35.948086',NULL),(3,1,'Xanh đậm',NULL,'2026-04-21 05:38:54',NULL,'2026-04-21 05:38:53.784012',NULL),(4,2,'Đen Titan',NULL,'2026-04-21 10:00:03',0,'2026-04-23 04:44:17.658181',NULL),(5,2,'Xám Titan',NULL,'2026-04-21 10:08:34',NULL,'2026-04-21 10:08:33.504875',NULL),(6,2,'Xanh Titan',NULL,'2026-04-21 10:08:34',0,'2026-04-27 19:34:32.210455',NULL),(7,2,'Bạc Titan',NULL,'2026-04-21 10:08:34',0,'2026-04-28 10:13:50.938212',NULL),(8,2,'Xanh Jade Titan',NULL,'2026-04-21 10:08:34',NULL,'2026-04-21 10:08:33.630226',NULL),(9,2,'Đen Tuyền Titan',NULL,'2026-04-21 10:08:34',0,'2026-05-08 02:26:09.058313',NULL),(10,2,'Vàng Hồng Titan',NULL,'2026-04-21 10:08:34',NULL,'2026-04-21 10:08:33.705882',NULL),(11,3,'Trắng Cực Quang',NULL,'2026-04-21 12:23:33',0,'2026-04-23 04:40:06.932146',NULL),(12,3,'Xanh Chạng Vạng',NULL,'2026-04-21 12:23:33',0,'2026-05-12 14:06:19.487556',NULL),(13,3,'Xanh Cực Quang',NULL,'2026-04-21 12:23:33',NULL,'2026-04-21 12:23:32.933375',NULL),(14,4,'Tím Oải Hương',NULL,'2026-04-21 12:38:18',NULL,'2026-04-21 12:38:18.429080',NULL),(15,4,'Xanh Ngọc',NULL,'2026-04-21 12:38:18',0,'2026-05-13 12:34:05.786139',NULL),(16,4,'Vàng Champagne',NULL,'2026-04-21 12:38:18',NULL,'2026-04-21 12:38:18.473246',NULL),(17,4,'Đen',NULL,'2026-04-21 12:38:18',NULL,'2026-04-21 12:38:18.495237',NULL),(18,5,'Xanh Ngọc',NULL,'2026-04-21 13:00:23',NULL,'2026-04-21 13:00:22.633583',NULL),(19,5,'Xanh Đen',NULL,'2026-04-21 13:00:23',NULL,'2026-04-21 13:00:22.674576',NULL),(20,5,'Vàng Kim',NULL,'2026-04-21 13:00:23',NULL,'2026-04-21 13:00:22.704267',NULL),(21,5,'Xám',NULL,'2026-04-21 13:00:23',0,'2026-05-18 14:24:10.433688',NULL),(22,6,'Trắng',NULL,'2026-05-06 12:45:12',0,'2026-05-13 19:57:39.604106',NULL),(23,6,'Đen',NULL,'2026-05-06 12:45:13',NULL,'2026-05-06 12:45:12.531602',NULL),(24,6,'Tím',NULL,'2026-05-06 12:45:13',NULL,'2026-05-06 12:45:12.569232',NULL),(25,6,'Xanh',NULL,'2026-05-06 12:45:13',0,'2026-05-08 02:26:08.552499',NULL),(26,7,'Xanh đậm',NULL,'2026-05-06 12:55:02',0,'2026-05-14 12:50:13.912670',NULL),(27,7,'Đen',NULL,'2026-05-06 12:55:02',0,'2026-05-08 02:26:08.838798',NULL),(28,7,'Nâu',NULL,'2026-05-06 12:55:02',NULL,'2026-05-06 12:55:02.243076',NULL),(29,8,'Đen',NULL,'2026-05-06 13:07:23',0,'2026-05-08 02:26:08.934302',NULL),(30,8,'Xanh',NULL,'2026-05-06 13:07:23',0,'2026-05-12 13:15:44.711451',NULL),(31,8,'Trắng',NULL,'2026-05-06 13:07:23',0,'2026-05-08 02:26:08.745557',NULL),(32,9,'Xanh Spruce',NULL,'2026-05-06 13:21:08',0,'2026-05-07 05:10:23.639164',NULL),(33,9,'Vàng Dawn',NULL,'2026-05-06 13:21:08',NULL,'2026-05-06 13:21:07.689333',NULL),(34,9,'Đen Obsidian',NULL,'2026-05-06 13:21:08',NULL,'2026-05-06 13:21:07.721040',NULL),(35,9,'Trắng Snow',NULL,'2026-05-06 13:21:08',NULL,'2026-05-06 13:21:07.766096',NULL),(36,10,'Bay',NULL,'2026-05-06 13:33:58',0,'2026-05-11 14:48:31.486864',NULL),(37,10,'Hazel',NULL,'2026-05-06 13:33:58',NULL,'2026-05-06 13:33:58.420101',NULL),(38,10,'Porcelain',NULL,'2026-05-06 13:33:58',NULL,'2026-05-06 13:33:58.452988',NULL),(39,10,'Obsidian',NULL,'2026-05-06 13:33:58',NULL,'2026-05-06 13:33:58.485852',NULL),(40,11,'Bạc',NULL,'2026-05-06 13:47:49',0,'2026-05-14 04:20:17.309491',NULL),(41,11,'Đen',NULL,'2026-05-06 13:47:49',NULL,'2026-05-06 13:47:49.448881',NULL),(42,11,'Vàng',NULL,'2026-05-06 13:47:49',0,'2026-05-14 04:42:28.656070',NULL),(43,11,'Tím Deep Purple',NULL,'2026-05-06 13:47:50',NULL,'2026-05-06 13:47:49.521486',NULL),(44,12,'Xanh lá',NULL,'2026-05-06 14:00:16',NULL,'2026-05-06 14:00:15.832411',NULL),(45,12,'Hồng',NULL,'2026-05-06 14:00:16',0,'2026-05-13 12:25:17.480949',NULL),(46,12,'Đen',NULL,'2026-05-06 14:00:16',NULL,'2026-05-06 14:00:15.934866',NULL),(47,12,'Trắng',NULL,'2026-05-06 14:00:16',NULL,'2026-05-06 14:00:15.972958',NULL);
/*!40000 ALTER TABLE `product_colors` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `product_compatible_phones`
--

DROP TABLE IF EXISTS `product_compatible_phones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `product_compatible_phones` (
  `id` int NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) DEFAULT NULL,
  `phone_model` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `product_id` int NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `product_compatible_phones`
--

LOCK TABLES `product_compatible_phones` WRITE;
/*!40000 ALTER TABLE `product_compatible_phones` DISABLE KEYS */;
/*!40000 ALTER TABLE `product_compatible_phones` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `product_images`
--

DROP TABLE IF EXISTS `product_images`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `product_images` (
  `product_image_id` int unsigned NOT NULL AUTO_INCREMENT,
  `product_id` int unsigned NOT NULL,
  `image_url` varchar(1024) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_thumbnail` tinyint(1) DEFAULT '0',
  `sort_order` int DEFAULT '0',
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `deleted_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`product_image_id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `product_images_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `product_images`
--

LOCK TABLES `product_images` WRITE;
/*!40000 ALTER TABLE `product_images` DISABLE KEYS */;
INSERT INTO `product_images` VALUES (3,1,'http://localhost:8080/api/files/products/206c132a-1a93-4cdf-ba14-2da59e9a8aa5.png',1,0,'2026-04-21 07:13:26','2026-04-21 07:13:26.016669',NULL),(4,2,'http://localhost:8080/api/files/products/b424e3e1-3a52-4a8d-974c-d69483d9d67d.png',1,0,'2026-04-21 10:00:03','2026-04-21 10:00:03.483587',NULL),(5,3,'http://localhost:8080/api/files/products/292e06cf-82a0-4ebd-8f3c-e26afc34d55c.png',1,0,'2026-04-21 12:23:33','2026-04-21 12:23:32.954261',NULL),(6,4,'http://localhost:8080/api/files/products/d11c36f3-836c-4725-a18a-7ed9f071f370.png',1,0,'2026-04-21 12:38:19','2026-04-21 12:38:18.512692',NULL),(7,5,'http://localhost:8080/api/files/products/4b0b9b1b-7c3c-4221-9c74-3a8c1c967bce.png',1,0,'2026-04-21 13:00:23','2026-04-21 13:00:22.763857',NULL),(8,6,'http://localhost:8080/api/files/products/c2c7bf5e-ac09-4036-8578-196bc37a5f0f.png',1,0,'2026-05-06 12:45:13','2026-05-06 12:45:12.656137',NULL),(9,7,'http://localhost:8080/api/files/products/443b7288-f22b-4059-9413-b16abaaf5b7c.png',1,0,'2026-05-06 12:55:02','2026-05-06 12:55:02.281599',NULL),(10,8,'http://localhost:8080/api/files/products/36c79916-9310-44a5-8efd-742b1b54b51b.png',1,0,'2026-05-06 13:07:23','2026-05-06 13:07:23.201240',NULL),(11,9,'http://localhost:8080/api/files/products/122f0c85-47bf-4087-a9da-18d71cc52d5f.png',1,0,'2026-05-06 13:21:08','2026-05-06 13:21:07.800899',NULL),(12,10,'http://localhost:8080/api/files/products/5337feb9-63b1-4a63-9316-5fbe84eff892.png',1,0,'2026-05-06 13:33:59','2026-05-06 13:33:58.565342',NULL),(13,11,'http://localhost:8080/api/files/products/42df850c-63e5-4aa3-9db9-c3faa37237d1.png',1,0,'2026-05-06 13:47:50','2026-05-06 13:47:49.555958',NULL),(14,12,'http://localhost:8080/api/files/products/a6a7801f-6df5-446c-a018-6dc4c411b043.png',1,0,'2026-05-06 14:00:16','2026-05-06 14:00:16.017869',NULL);
/*!40000 ALTER TABLE `product_images` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `product_specs`
--

DROP TABLE IF EXISTS `product_specs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `product_specs` (
  `spec_id` int unsigned NOT NULL AUTO_INCREMENT,
  `product_id` int unsigned NOT NULL,
  `version` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `chip` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `camera_front` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `camera_rear` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `screen` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `battery` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `refresh_rate` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fast_charge` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `support_5g` tinyint(1) DEFAULT NULL,
  `nfc` tinyint(1) DEFAULT NULL,
  `operating_system` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `size` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `weight` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `material` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `water_resistance` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `charging_port` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sim` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `warranty` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`spec_id`),
  UNIQUE KEY `product_id` (`product_id`,`version`),
  CONSTRAINT `product_specs_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `product_specs`
--

LOCK TABLES `product_specs` WRITE;
/*!40000 ALTER TABLE `product_specs` DISABLE KEYS */;
INSERT INTO `product_specs` VALUES (1,1,'VN','Apple A19 Pro','18 MP','48 MP + 48 MP + 48 MP','6.9 inch OLED Super Retina XDR','5000 mAh','120 Hz','40W',1,1,'iOS 26','163.4 x 78.0 x 8.75 mm','233 g','Nhôm, Kính Ceramic Shield','IP68','USB Type-C','Dual eSIM','12','2026-04-21 05:38:54'),(2,2,'GLOBAL','Snapdragon 8 Elite for Galaxy','12 MP','200 MP + 50 MP + 50 MP + 10 MP','6.9 inch Dynamic AMOLED 2X','5000 mAh','120 Hz','45W',1,1,'Android 15','162.8 x 77.6 x 8.2 mm','218 g','Titanium, Kính Gorilla Victus 2','IP68','USB Type-C','Dual Nano SIM + eSIM','12','2026-04-21 10:00:03'),(3,3,'GLOBAL','Snapdragon 7 Gen 4','50 MP','50 MP + 50 MP + 8 MP','6.59 inch AMOLED','6500 mAh','120 Hz','80W',1,1,'Android 16 (ColorOS 16)','160.2 x 74.3 x 7.6 mm','197 g','Khung nhôm, mặt lưng kính','IP69','USB Type-C','Dual Nano SIM + eSIM','12','2026-04-21 12:23:33'),(4,4,'GLOBAL','MediaTek Dimensity 7300-Ultra','20 MP','200 MP + 8 MP + 2 MP','6.67 inch AMOLED','5110 mAh','120 Hz','45W',1,1,'Android 14 (HyperOS)','162.3 x 74.4 x 8.4 mm','~190 g','Khung nhựa, mặt lưng kính / da','IP68','USB Type-C','Dual Nano SIM','6','2026-04-21 12:38:19'),(5,5,'GLOBAL','MediaTek Dimensity 6300','13 MP','50 MP + 5 MP + 2 MP','6.7 inch Super AMOLED','5000 mAh','90 Hz','25W',1,1,'Android 14 (One UI)','164.4 x 77.9 x 7.9 mm','200 g','Khung nhựa, mặt lưng nhựa','IP54','USB Type-C','Dual Nano SIM','6','2026-04-21 13:00:23'),(6,6,'CN','Snapdragon 8 Elite Gen 5 (3nm, CPU Oryon Gen 3, GPU Adreno 840)','50MP, quay 4K, HDR10+, chống rung điện tử','3 camera 50MP (chính + góc rộng + tele 5x periscope, quay 8K)','6.9 inch LTPO AMOLED, độ phân giải 2608×1220, Dolby Vision, HDR10+','7500mAh (Si-Carbon)','120Hz (LTPO 1–120Hz)','100W có dây, 50W không dây, sạc ngược',1,1,'Android 16 (HyperOS)','162.9 x 77.6 x 8 mm','219g','Mặt lưng kính, khung nhôm, kính Dragon Crystal Glass','IP68 (kháng nước và bụi)','USB Type-C 3.2, hỗ trợ DisplayPort','2 SIM','12','2026-05-06 12:45:13'),(7,7,'GLOBAL','Snapdragon 8 Gen 3 (4nm, GPU Adreno 750)','32MP, quay 4K, HDR','4 camera 50MP (1 inch + góc rộng + 2 tele periscope, zoom quang 6x, quay 4K/8K)','6.82 inch LTPO AMOLED, độ phân giải 3168×1440 (2K), HDR10+, Dolby Vision','5000mAh','120Hz (LTPO 1–120Hz)','100W có dây, 50W không dây',1,1,'Android 16 (ColorOS)','164.3 x 76.2 x 9.5 mm','221g','Mặt lưng kính/da, khung nhôm, kính Gorilla Glass Victus 2','IP68','USB Type-C','2 Nano SIM','12','2026-05-06 12:55:02'),(8,8,'GLOBAL','Snapdragon 8 Elite Gen 5 (3nm, CPU ~4.6GHz)','50MP, quay 4K','200MP (main) + 200MP tele periscope + 50MP góc rộng (ZEISS, OIS, quay 4K 120fps)','6.82 inch LTPO AMOLED, 3168×1440 (2K), Ultra XDR, 4500 nits','6600mAh (pin silicon thế hệ mới)','144Hz (LTPO 1–144Hz)','100W có dây, 40W không dây',1,1,'Android 16 (OriginOS 6)','162.98 x 76.81 x 8.19 mm','~232–237g','Mặt lưng kính / sợi thủy tinh, khung kim loại','IP68 / IP69','USB Type-C','2 Nano SIM','12','2026-05-06 13:07:23'),(9,9,'GLOBAL','Kirin 9030 Pro','13MP AI selfie quay video 4K HDR','50MP chính + 40MP góc rộng + 48MP telephoto zoom 4x','6.75–6.8 inch LTPO OLED độ phân giải 1.5K','120Hz LTPO adaptive','5750mAh (tối đa ~6000mAh bản Pro Max)','100W sạc dây + 80W sạc không dây',1,1,'HarmonyOS 6 / EMUI 15','162.5 × 75 × 8.5 mm','220–230g','Khung kim loại + kính Kunlun Glass + mặt lưng cao cấp','IP68 + IP69','USB-C (USB 3.2)','2 nano SIM','12','2026-05-06 13:21:08'),(10,10,'GLOBAL','Google Tensor G5','42MP selfie hỗ trợ AI và quay 4K HDR','50MP chính + 48MP góc siêu rộng + 48MP telephoto zoom quang 5x','6.8 inch LTPO OLED QHD+','5200mAh','1–120Hz LTPO adaptive','45W sạc dây và 23W sạc không dây',1,1,'Android 16 với Pixel UI và AI Google Gemini','162.8 × 76.6 × 8.5 mm','221g','Khung nhôm và kính Gorilla Glass Victus 3','IP68','USB-C (USB 3.2)','1 nano SIM và eSIM','12','2026-05-06 13:33:59'),(11,11,'US','Apple A16 Bionic 6 nhân (TSMC 4nm)','12MP TrueDepth hỗ trợ Face ID và quay 4K','48MP chính + 12MP tele 3x + 12MP góc siêu rộng','6.7 inch Super Retina XDR OLED','4323mAh','1–120Hz ProMotion','27W sạc dây + 15W MagSafe',1,1,'iOS 18','160.7 × 77.6 × 7.85 mm','240g','Khung thép không gỉ + mặt lưng kính Ceramic Shield','IP68','Lightning','1 nano SIM + eSIM (tùy thị trường)','12','2026-05-06 13:47:50'),(12,12,'GLOBAL','Exynos 1580 (tiến trình 4nm, tối ưu AI và hiệu năng tầm trung cao)','12MP selfie hỗ trợ HDR 10-bit','50MP chính + 12MP góc siêu rộng + 5MP macro','6.7 inch Super AMOLED FHD+','120Hz','5000mAh','45W Super Fast Charge',1,1,'Android 15 với One UI 7','162.2 × 77.5 × 7.4 mm','198g','Khung kim loại + kính cường lực Gorilla Glass','IP67','USB-C','Nano SIM + eSIM','12','2026-05-06 14:00:16');
/*!40000 ALTER TABLE `product_specs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `product_variants`
--

DROP TABLE IF EXISTS `product_variants`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `product_variants` (
  `variant_id` int unsigned NOT NULL AUTO_INCREMENT,
  `product_color_id` int unsigned NOT NULL,
  `ram_gb` int NOT NULL,
  `storage_gb` int NOT NULL,
  `quantity` int NOT NULL DEFAULT '0',
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `discount_type` enum('NONE','AMOUNT','PERCENT') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `discount_value` decimal(15,2) DEFAULT NULL,
  `final_price` decimal(15,2) NOT NULL,
  `original_price` decimal(15,2) NOT NULL,
  PRIMARY KEY (`variant_id`),
  UNIQUE KEY `product_color_id` (`product_color_id`,`ram_gb`,`storage_gb`),
  CONSTRAINT `product_variants_ibfk_1` FOREIGN KEY (`product_color_id`) REFERENCES `product_colors` (`product_color_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=160 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `product_variants`
--

LOCK TABLES `product_variants` WRITE;
/*!40000 ALTER TABLE `product_variants` DISABLE KEYS */;
INSERT INTO `product_variants` VALUES (1,1,12,256,19,'2026-04-21 05:38:54','2026-06-04 13:56:17.116442','PERCENT',5.00,35150000.00,37000000.00),(2,1,12,512,20,'2026-04-21 05:38:54','2026-04-21 06:07:03.077527','PERCENT',5.00,40850000.00,43000000.00),(3,1,12,1024,10,'2026-04-21 05:38:54','2026-06-04 13:01:53.376720','PERCENT',5.00,47500000.00,50000000.00),(4,1,12,2048,9,'2026-04-21 05:38:54','2026-06-04 13:57:46.012700','PERCENT',5.00,57000000.00,60000000.00),(5,2,12,256,30,'2026-04-21 05:38:54','2026-04-21 06:07:03.079240','PERCENT',5.00,33250000.00,35000000.00),(6,2,12,512,30,'2026-04-21 05:38:54','2026-06-04 13:01:53.388855','PERCENT',5.00,38000000.00,40000000.00),(7,2,12,1024,15,'2026-04-21 05:38:54','2026-04-21 06:07:03.079240','PERCENT',5.00,45600000.00,48000000.00),(8,2,12,2048,10,'2026-04-21 05:38:54','2026-06-04 13:01:53.389233','PERCENT',5.00,57000000.00,60000000.00),(9,3,12,256,20,'2026-04-21 05:38:54','2026-04-21 06:07:03.079240','PERCENT',5.00,30400000.00,32000000.00),(10,3,12,512,15,'2026-04-21 05:38:54','2026-04-21 06:07:03.079240','PERCENT',5.00,36100000.00,38000000.00),(11,3,12,1024,10,'2026-04-21 05:38:54','2026-04-21 06:07:03.079240','PERCENT',5.00,42750000.00,45000000.00),(12,3,12,2048,10,'2026-04-21 05:38:54','2026-06-04 13:01:53.390269','PERCENT',5.00,54150000.00,57000000.00),(13,4,12,256,28,'2026-04-21 10:00:03','2026-06-04 13:56:17.035134','PERCENT',10.00,23400000.00,26000000.00),(14,4,12,512,20,'2026-04-21 10:00:03','2026-04-21 10:00:03.470265','PERCENT',10.00,30600000.00,34000000.00),(15,4,12,1024,20,'2026-04-21 10:00:03','2026-06-04 13:02:43.981592','PERCENT',10.00,39600000.00,44000000.00),(16,5,12,256,15,'2026-04-21 10:08:34','2026-04-21 10:08:33.538640','PERCENT',10.00,21600000.00,24000000.00),(17,5,12,512,10,'2026-04-21 10:08:34','2026-04-21 10:08:33.550944','PERCENT',10.00,27000000.00,30000000.00),(18,5,12,1024,10,'2026-04-21 10:08:34','2026-06-04 13:02:43.981592','PERCENT',10.00,34200000.00,38000000.00),(19,6,12,256,30,'2026-04-21 10:08:34','2026-04-21 10:08:33.579693','PERCENT',10.00,23400000.00,26000000.00),(20,6,12,512,20,'2026-04-21 10:08:34','2026-04-21 10:08:33.586422','PERCENT',10.00,28800000.00,32000000.00),(21,6,12,1024,10,'2026-04-21 10:08:34','2026-06-04 13:02:43.984308','PERCENT',10.00,36000000.00,40000000.00),(22,7,12,256,20,'2026-04-21 10:08:34','2026-06-04 13:02:43.984308','PERCENT',10.00,19800000.00,22000000.00),(23,7,12,512,10,'2026-04-21 10:08:34','2026-04-21 10:08:33.617214','PERCENT',10.00,25200000.00,28000000.00),(24,7,12,1024,5,'2026-04-21 10:08:34','2026-04-21 10:08:33.623675','PERCENT',10.00,32400000.00,36000000.00),(25,8,12,256,10,'2026-04-21 10:08:34','2026-04-21 10:08:33.641364','PERCENT',10.00,27000000.00,30000000.00),(26,8,12,512,5,'2026-04-21 10:08:34','2026-04-21 10:08:33.649104','PERCENT',10.00,33300000.00,37000000.00),(27,8,12,1024,5,'2026-04-21 10:08:34','2026-04-21 10:10:09.400132','PERCENT',10.00,41400000.00,46000000.00),(28,9,12,256,30,'2026-04-21 10:08:34','2026-04-21 10:08:33.682788','PERCENT',10.00,18900000.00,21000000.00),(29,9,12,512,20,'2026-04-21 10:08:34','2026-04-21 10:08:33.689128','PERCENT',10.00,25200000.00,28000000.00),(30,9,12,1024,20,'2026-04-21 10:08:34','2026-06-04 13:02:43.984308','PERCENT',10.00,31500000.00,35000000.00),(31,10,12,256,30,'2026-04-21 10:08:34','2026-04-21 10:08:33.717891','PERCENT',10.00,25200000.00,28000000.00),(32,10,12,512,30,'2026-04-21 10:08:34','2026-04-21 10:08:33.723703','PERCENT',10.00,31500000.00,35000000.00),(33,10,12,1024,20,'2026-04-21 10:08:34','2026-04-21 10:08:33.730529','PERCENT',10.00,37800000.00,42000000.00),(34,11,8,256,30,'2026-04-21 12:23:33','2026-04-21 12:23:32.898108','PERCENT',10.00,17100000.00,19000000.00),(35,11,12,256,20,'2026-04-21 12:23:33','2026-04-21 12:23:32.904252','PERCENT',10.00,18000000.00,20000000.00),(36,11,12,512,15,'2026-04-21 12:23:33','2026-06-04 13:07:07.467091','PERCENT',10.00,19800000.00,22000000.00),(37,12,8,256,30,'2026-04-21 12:23:33','2026-06-04 13:07:07.480485','PERCENT',10.00,16200000.00,18000000.00),(38,12,12,256,20,'2026-04-21 12:23:33','2026-04-21 12:23:32.924547','PERCENT',10.00,17100000.00,19000000.00),(39,12,12,512,15,'2026-04-21 12:23:33','2026-04-21 12:24:00.091258','PERCENT',10.00,18000000.00,20000000.00),(40,13,8,256,30,'2026-04-21 12:23:33','2026-04-21 12:23:32.941880','PERCENT',10.00,16200000.00,18000000.00),(41,13,12,256,20,'2026-04-21 12:23:33','2026-04-21 12:23:32.945348','PERCENT',10.00,17100000.00,19000000.00),(42,13,12,512,10,'2026-04-21 12:23:33','2026-04-21 12:23:32.949272','PERCENT',10.00,18900000.00,21000000.00),(43,14,8,256,40,'2026-04-21 12:38:18','2026-04-21 12:38:43.965081','PERCENT',10.00,7200000.00,8000000.00),(44,14,12,256,30,'2026-04-21 12:38:18','2026-04-21 12:38:43.965081','PERCENT',10.00,8100000.00,9000000.00),(45,14,12,512,10,'2026-04-21 12:38:18','2026-04-21 12:38:43.965646','PERCENT',10.00,9000000.00,10000000.00),(46,15,8,256,30,'2026-04-21 12:38:18','2026-04-21 12:38:43.965646','PERCENT',10.00,6750000.00,7500000.00),(47,15,12,256,30,'2026-04-21 12:38:18','2026-04-21 12:38:43.965646','PERCENT',10.00,7650000.00,8500000.00),(48,15,12,512,10,'2026-04-21 12:38:18','2026-06-04 13:07:26.788310','PERCENT',10.00,8550000.00,9500000.00),(49,16,8,256,30,'2026-04-21 12:38:18','2026-04-21 12:38:43.965646','PERCENT',10.00,6300000.00,7000000.00),(50,16,12,256,20,'2026-04-21 12:38:18','2026-04-21 12:38:43.965646','PERCENT',10.00,7200000.00,8000000.00),(51,16,12,512,10,'2026-04-21 12:38:18','2026-04-21 12:38:43.965646','PERCENT',10.00,8100000.00,9000000.00),(52,17,8,256,30,'2026-04-21 12:38:19','2026-04-21 12:38:43.965646','PERCENT',10.00,5850000.00,6500000.00),(53,17,12,256,30,'2026-04-21 12:38:19','2026-04-21 12:38:43.965646','PERCENT',10.00,6750000.00,7500000.00),(54,17,12,512,20,'2026-04-21 12:38:19','2026-04-21 12:38:43.966523','PERCENT',10.00,7650000.00,8500000.00),(55,18,4,128,20,'2026-04-21 13:00:23','2026-04-21 13:00:22.652937','AMOUNT',400000.00,3400000.00,3800000.00),(56,18,8,128,15,'2026-04-21 13:00:23','2026-04-21 13:00:22.661429','AMOUNT',400000.00,3800000.00,4200000.00),(57,18,8,256,10,'2026-04-21 13:00:23','2026-04-21 13:00:22.669053','AMOUNT',400000.00,4200000.00,4600000.00),(58,19,4,128,30,'2026-04-21 13:00:23','2026-04-21 13:00:22.688798','AMOUNT',400000.00,3200000.00,3600000.00),(59,19,8,128,20,'2026-04-21 13:00:23','2026-04-21 13:00:22.694633','AMOUNT',400000.00,3600000.00,4000000.00),(60,19,8,256,10,'2026-04-21 13:00:23','2026-04-21 13:00:22.700840','AMOUNT',400000.00,4000000.00,4400000.00),(61,20,4,128,20,'2026-04-21 13:00:23','2026-04-21 13:00:22.716525','AMOUNT',400000.00,3600000.00,4000000.00),(62,20,8,128,20,'2026-04-21 13:00:23','2026-04-21 13:00:22.721027','AMOUNT',400000.00,4000000.00,4400000.00),(63,20,8,256,10,'2026-04-21 13:00:23','2026-04-21 13:00:22.724833','AMOUNT',400000.00,4400000.00,4800000.00),(64,21,4,128,20,'2026-04-21 13:00:23','2026-06-04 13:07:47.226937','AMOUNT',400000.00,3000000.00,3400000.00),(65,21,8,128,10,'2026-04-21 13:00:23','2026-04-21 13:00:22.750870','AMOUNT',400000.00,3300000.00,3700000.00),(66,21,8,256,10,'2026-04-21 13:00:23','2026-06-04 13:07:47.228841','AMOUNT',400000.00,3600000.00,4000000.00),(67,22,12,512,19,'2026-05-06 12:45:12','2026-06-04 13:56:16.818919','PERCENT',5.00,23750000.00,25000000.00),(68,22,16,512,15,'2026-05-06 12:45:13','2026-05-06 12:45:12.514582','PERCENT',5.00,25650000.00,27000000.00),(69,22,16,1024,5,'2026-05-06 12:45:13','2026-05-06 12:45:12.526455','PERCENT',5.00,28500000.00,30000000.00),(70,23,12,512,30,'2026-05-06 12:45:13','2026-05-06 12:45:12.548367','PERCENT',5.00,22800000.00,24000000.00),(71,23,16,512,20,'2026-05-06 12:45:13','2026-05-06 12:45:12.555434','PERCENT',5.00,24700000.00,26000000.00),(72,23,16,1024,10,'2026-05-06 12:45:13','2026-05-06 12:45:12.563873','PERCENT',5.00,26600000.00,28000000.00),(73,24,12,512,15,'2026-05-06 12:45:13','2026-05-06 12:45:12.583859','PERCENT',5.00,24700000.00,26000000.00),(74,24,16,512,10,'2026-05-06 12:45:13','2026-05-06 12:45:12.589460','PERCENT',5.00,27550000.00,29000000.00),(75,24,16,1024,5,'2026-05-06 12:45:13','2026-05-06 12:45:12.598471','PERCENT',5.00,29450000.00,31000000.00),(76,25,12,512,10,'2026-05-06 12:45:13','2026-05-06 12:45:12.622748','PERCENT',5.00,26600000.00,28000000.00),(77,25,16,512,10,'2026-05-06 12:45:13','2026-06-04 13:08:11.954742','PERCENT',5.00,28500000.00,30000000.00),(78,25,16,1024,5,'2026-05-06 12:45:13','2026-05-06 12:45:12.642457','PERCENT',5.00,32300000.00,34000000.00),(79,26,12,256,29,'2026-05-06 12:55:02','2026-06-04 13:56:17.001032','AMOUNT',300000.00,23700000.00,24000000.00),(80,26,16,256,20,'2026-05-06 12:55:02','2026-05-06 12:55:02.180344','AMOUNT',300000.00,25700000.00,26000000.00),(81,26,16,512,10,'2026-05-06 12:55:02','2026-05-06 12:55:02.194867','AMOUNT',300000.00,27700000.00,28000000.00),(82,27,12,256,20,'2026-05-06 12:55:02','2026-05-06 12:55:02.219979','AMOUNT',300000.00,21700000.00,22000000.00),(83,27,16,256,20,'2026-05-06 12:55:02','2026-06-04 13:08:32.902246','AMOUNT',300000.00,23700000.00,24000000.00),(84,27,16,512,10,'2026-05-06 12:55:02','2026-05-06 12:55:02.235161','AMOUNT',300000.00,25700000.00,26000000.00),(85,28,12,256,20,'2026-05-06 12:55:02','2026-05-06 12:55:02.259757','AMOUNT',300000.00,23700000.00,24000000.00),(86,28,16,256,10,'2026-05-06 12:55:02','2026-05-06 12:55:02.266588','AMOUNT',300000.00,25700000.00,26000000.00),(87,28,16,512,5,'2026-05-06 12:55:02','2026-05-06 12:55:02.274840','AMOUNT',300000.00,27700000.00,28000000.00),(88,29,12,256,19,'2026-05-06 13:07:23','2026-06-04 13:56:17.588416','PERCENT',5.00,25650000.00,27000000.00),(89,29,12,512,20,'2026-05-06 13:07:23','2026-06-04 13:09:16.389937','PERCENT',5.00,27550000.00,29000000.00),(90,29,16,512,15,'2026-05-06 13:07:23','2026-06-04 13:09:16.389937','PERCENT',5.00,29450000.00,31000000.00),(91,29,16,1024,5,'2026-05-06 13:07:23','2026-05-06 13:07:23.109215','PERCENT',5.00,34200000.00,36000000.00),(92,30,12,256,20,'2026-05-06 13:07:23','2026-05-06 13:07:23.129033','PERCENT',5.00,26600000.00,28000000.00),(93,30,12,512,20,'2026-05-06 13:07:23','2026-06-04 13:09:16.389937','PERCENT',5.00,30400000.00,32000000.00),(94,30,16,512,15,'2026-05-06 13:07:23','2026-05-06 13:07:23.142389','PERCENT',5.00,32300000.00,34000000.00),(95,30,16,1024,10,'2026-05-06 13:07:23','2026-05-06 13:07:23.149756','PERCENT',5.00,36100000.00,38000000.00),(96,31,12,256,20,'2026-05-06 13:07:23','2026-05-06 13:07:23.172316','PERCENT',5.00,27550000.00,29000000.00),(97,31,12,512,20,'2026-05-06 13:07:23','2026-05-06 13:07:23.181540','PERCENT',5.00,31350000.00,33000000.00),(98,31,16,512,20,'2026-05-06 13:07:23','2026-05-06 13:07:23.185409','PERCENT',5.00,33250000.00,35000000.00),(99,31,16,1024,20,'2026-05-06 13:07:23','2026-06-04 13:09:16.392719','PERCENT',5.00,38000000.00,40000000.00),(100,32,12,256,30,'2026-05-06 13:21:08','2026-06-04 13:09:38.279108','AMOUNT',500000.00,25500000.00,26000000.00),(101,32,12,512,20,'2026-05-06 13:21:08','2026-05-06 13:21:07.670943','AMOUNT',500000.00,27500000.00,28000000.00),(102,32,16,512,20,'2026-05-06 13:21:08','2026-05-06 13:21:07.680855','AMOUNT',500000.00,29500000.00,30000000.00),(103,32,16,1024,10,'2026-05-06 13:21:08','2026-06-04 13:09:38.279670','AMOUNT',500000.00,33500000.00,34000000.00),(104,33,12,256,20,'2026-05-06 13:21:08','2026-05-06 13:21:07.700518','AMOUNT',500000.00,25500000.00,26000000.00),(105,33,12,512,20,'2026-05-06 13:21:08','2026-05-06 13:21:07.708024','AMOUNT',500000.00,27500000.00,28000000.00),(106,33,16,512,10,'2026-05-06 13:21:08','2026-05-06 13:21:07.710878','AMOUNT',500000.00,29500000.00,30000000.00),(107,33,16,1024,10,'2026-05-06 13:21:08','2026-05-06 13:21:07.714716','AMOUNT',500000.00,32500000.00,33000000.00),(108,34,12,256,15,'2026-05-06 13:21:08','2026-05-06 13:21:07.732599','AMOUNT',500000.00,23500000.00,24000000.00),(109,34,12,512,15,'2026-05-06 13:21:08','2026-05-06 13:21:07.736086','AMOUNT',500000.00,25500000.00,26000000.00),(110,34,16,512,15,'2026-05-06 13:21:08','2026-05-06 13:21:07.743949','AMOUNT',500000.00,27500000.00,28000000.00),(111,34,16,1024,15,'2026-05-06 13:21:08','2026-05-06 13:21:07.761192','AMOUNT',500000.00,30500000.00,31000000.00),(112,35,12,256,20,'2026-05-06 13:21:08','2026-05-06 13:21:07.779997','AMOUNT',500000.00,27500000.00,28000000.00),(113,35,12,512,20,'2026-05-06 13:21:08','2026-05-06 13:21:07.783891','AMOUNT',500000.00,29500000.00,30000000.00),(114,35,16,512,20,'2026-05-06 13:21:08','2026-05-06 13:21:07.788984','AMOUNT',500000.00,31500000.00,32000000.00),(115,35,16,1024,20,'2026-05-06 13:21:08','2026-05-06 13:21:07.791725','AMOUNT',500000.00,35500000.00,36000000.00),(116,36,12,256,0,'2026-05-06 13:33:58','2026-06-04 13:14:36.293037','PERCENT',8.00,22080000.00,24000000.00),(117,36,16,512,0,'2026-05-06 13:33:58','2026-06-04 13:14:36.293447','PERCENT',8.00,23920000.00,26000000.00),(118,36,16,1024,0,'2026-05-06 13:33:58','2026-06-04 13:14:36.293447','PERCENT',8.00,27600000.00,30000000.00),(119,37,12,256,0,'2026-05-06 13:33:58','2026-06-04 13:14:36.293447','PERCENT',8.00,23920000.00,26000000.00),(120,37,16,512,0,'2026-05-06 13:33:58','2026-06-04 13:14:36.293447','PERCENT',8.00,26680000.00,29000000.00),(121,37,16,1024,0,'2026-05-06 13:33:58','2026-06-04 13:14:36.293447','PERCENT',8.00,30360000.00,33000000.00),(122,38,12,256,0,'2026-05-06 13:33:58','2026-06-04 13:14:36.293447','PERCENT',8.00,25760000.00,28000000.00),(123,38,16,512,0,'2026-05-06 13:33:58','2026-06-04 13:14:36.293447','PERCENT',8.00,27600000.00,30000000.00),(124,38,16,1024,0,'2026-05-06 13:33:58','2026-06-04 13:14:36.296537','PERCENT',8.00,31280000.00,34000000.00),(125,39,12,256,0,'2026-05-06 13:33:59','2026-06-04 13:14:36.296537','PERCENT',8.00,21160000.00,23000000.00),(126,39,16,512,0,'2026-05-06 13:33:59','2026-06-04 13:14:36.296537','PERCENT',8.00,23920000.00,26000000.00),(127,39,16,1024,0,'2026-05-06 13:33:59','2026-06-04 13:14:36.296537','PERCENT',8.00,26680000.00,29000000.00),(128,40,6,128,40,'2026-05-06 13:47:49','2026-06-04 13:10:26.246394','PERCENT',15.00,11900000.00,14000000.00),(129,40,6,256,30,'2026-05-06 13:47:49','2026-05-06 13:47:49.432454','PERCENT',15.00,13600000.00,16000000.00),(130,40,6,512,20,'2026-05-06 13:47:49','2026-05-06 13:47:49.438301','PERCENT',15.00,14449999.15,16999999.00),(131,40,6,1024,10,'2026-05-06 13:47:49','2026-05-06 13:47:49.442483','PERCENT',15.00,16150000.00,19000000.00),(132,41,6,128,20,'2026-05-06 13:47:49','2026-05-06 13:47:49.458781','PERCENT',15.00,11050000.00,13000000.00),(133,41,6,256,20,'2026-05-06 13:47:49','2026-05-06 13:47:49.464179','PERCENT',15.00,11900000.00,14000000.00),(134,41,6,512,20,'2026-05-06 13:47:49','2026-05-06 13:47:49.472028','PERCENT',15.00,12750000.00,15000000.00),(135,41,6,1024,20,'2026-05-06 13:47:49','2026-05-06 13:47:49.475024','PERCENT',15.00,14450000.00,17000000.00),(136,42,6,128,20,'2026-05-06 13:47:49','2026-05-06 13:47:49.496330','PERCENT',15.00,11900000.00,14000000.00),(137,42,6,256,20,'2026-05-06 13:47:50','2026-05-06 13:47:49.503794','PERCENT',15.00,12750000.00,15000000.00),(138,42,6,512,20,'2026-05-06 13:47:50','2026-05-06 13:47:49.508799','PERCENT',15.00,13600000.00,16000000.00),(139,42,6,1024,20,'2026-05-06 13:47:50','2026-06-04 13:10:26.248235','PERCENT',15.00,17000000.00,20000000.00),(140,43,6,128,20,'2026-05-06 13:47:50','2026-05-06 13:47:49.530906','PERCENT',15.00,12750000.00,15000000.00),(141,43,6,256,20,'2026-05-06 13:47:50','2026-05-06 13:47:49.538294','PERCENT',15.00,13600000.00,16000000.00),(142,43,6,512,20,'2026-05-06 13:47:50','2026-05-06 13:47:49.541933','PERCENT',15.00,14450000.00,17000000.00),(143,43,6,1024,20,'2026-05-06 13:47:50','2026-05-06 13:47:49.548059','PERCENT',15.00,17850000.00,21000000.00),(144,44,6,128,20,'2026-05-06 14:00:16','2026-05-06 14:00:15.858540','AMOUNT',200000.00,14800000.00,15000000.00),(145,44,8,128,20,'2026-05-06 14:00:16','2026-05-06 14:00:15.870839','AMOUNT',200000.00,15800000.00,16000000.00),(146,44,8,256,20,'2026-05-06 14:00:16','2026-05-06 14:00:15.876072','AMOUNT',200000.00,17800000.00,18000000.00),(147,44,12,256,20,'2026-05-06 14:00:16','2026-05-06 14:00:15.883309','AMOUNT',200000.00,19800000.00,20000000.00),(148,45,6,128,20,'2026-05-06 14:00:16','2026-05-06 14:00:15.904752','AMOUNT',200000.00,13800000.00,14000000.00),(149,45,8,128,20,'2026-05-06 14:00:16','2026-06-04 13:10:42.027631','AMOUNT',200000.00,14800000.00,15000000.00),(150,45,8,256,20,'2026-05-06 14:00:16','2026-05-06 14:00:15.921402','AMOUNT',200000.00,15800000.00,16000000.00),(151,45,12,256,20,'2026-05-06 14:00:16','2026-05-06 14:00:15.928495','AMOUNT',200000.00,18800000.00,19000000.00),(152,46,6,128,20,'2026-05-06 14:00:16','2026-05-06 14:00:15.948529','AMOUNT',200000.00,12800000.00,13000000.00),(153,46,8,128,20,'2026-05-06 14:00:16','2026-05-06 14:00:15.955459','AMOUNT',200000.00,13800000.00,14000000.00),(154,46,8,256,20,'2026-05-06 14:00:16','2026-05-06 14:00:15.961429','AMOUNT',200000.00,14800000.00,15000000.00),(155,46,12,256,20,'2026-05-06 14:00:16','2026-05-06 14:00:15.968125','AMOUNT',200000.00,16800000.00,17000000.00),(156,47,6,128,20,'2026-05-06 14:00:16','2026-05-06 14:00:15.984782','AMOUNT',200000.00,12800000.00,13000000.00),(157,47,8,128,20,'2026-05-06 14:00:16','2026-05-06 14:00:15.991935','AMOUNT',200000.00,13800000.00,14000000.00),(158,47,8,256,20,'2026-05-06 14:00:16','2026-05-06 14:00:15.998318','AMOUNT',200000.00,14800000.00,15000000.00),(159,47,12,256,20,'2026-05-06 14:00:16','2026-05-06 14:00:16.007089','AMOUNT',200000.00,17800000.00,18000000.00);
/*!40000 ALTER TABLE `product_variants` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `products`
--

DROP TABLE IF EXISTS `products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `products` (
  `product_id` int unsigned NOT NULL AUTO_INCREMENT,
  `product_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `product_description` text COLLATE utf8mb4_unicode_ci,
  `category_id` int unsigned NOT NULL,
  `brand_id` int unsigned DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `product_type` enum('NEW','BEST_SELLER','SALE','NORMAL') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `deleted_at` datetime(6) DEFAULT NULL,
  `product_main_image` varchar(1024) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`product_id`),
  UNIQUE KEY `slug` (`slug`),
  KEY `category_id` (`category_id`),
  KEY `brand_id` (`brand_id`),
  CONSTRAINT `products_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `categories` (`category_id`),
  CONSTRAINT `products_ibfk_2` FOREIGN KEY (`brand_id`) REFERENCES `brands` (`brand_id`) ON DELETE SET NULL,
  CONSTRAINT `chk_product_type` CHECK ((`product_type` in (_utf8mb4'NEW',_utf8mb4'BEST_SELLER',_utf8mb4'SALE')))
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `products`
--

LOCK TABLES `products` WRITE;
/*!40000 ALTER TABLE `products` DISABLE KEYS */;
INSERT INTO `products` VALUES (1,'iPhone 17 Pro Max','iphone-17-pro-max','iPhone 17 Pro Max là mẫu điện thoại cao cấp nhất trong dòng sản phẩm iPhone mới của Apple, hướng đến người dùng yêu cầu hiệu năng mạnh mẽ, thiết kế sang trọng và trải nghiệm công nghệ tiên tiến. Sở hữu ngoại hình cao cấp với khung kim loại bền bỉ cùng mặt kính cường lực hiện đại, thiết bị mang lại cảm giác cầm nắm chắc chắn, tinh tế và phù hợp với nhiều phong cách sử dụng từ công việc đến giải trí. Đây là dòng flagship được Apple tối ưu toàn diện về hiệu suất, camera và thời lượng pin, đáp ứng tốt nhu cầu sử dụng trong nhiều năm.\n\nĐiểm nổi bật của iPhone 17 Pro Max nằm ở hiệu năng mạnh mẽ nhờ chip xử lý thế hệ mới, giúp thiết bị hoạt động mượt mà khi chạy đa nhiệm, chơi game đồ họa cao hoặc xử lý các tác vụ nặng như chỉnh sửa video và hình ảnh. Máy được tối ưu hóa hệ điều hành, đảm bảo tốc độ phản hồi nhanh, tiết kiệm pin và mang lại trải nghiệm ổn định trong thời gian dài. Người dùng có thể yên tâm sử dụng thiết bị cho cả công việc chuyên nghiệp lẫn giải trí hàng ngày mà không lo giật lag.\n\nNgoài hiệu năng, màn hình lớn chất lượng cao cũng là một trong những yếu tố giúp iPhone 17 Pro Max trở thành lựa chọn hàng đầu trong phân khúc cao cấp. Màn hình hiển thị sắc nét, màu sắc chân thực và độ sáng cao giúp người dùng xem phim, chơi game hay lướt web một cách thoải mái ngay cả trong môi trường ánh sáng mạnh. Tần số quét cao mang lại trải nghiệm cuộn trang mượt mà, nâng cao sự tiện lợi khi sử dụng thiết bị trong thời gian dài.\n\nHệ thống camera tiên tiến trên iPhone 17 Pro Max được thiết kế để mang lại khả năng chụp ảnh và quay video chuyên nghiệp. Người dùng có thể ghi lại những khoảnh khắc quan trọng với độ chi tiết cao, màu sắc tự nhiên và khả năng xử lý hình ảnh tốt trong nhiều điều kiện ánh sáng khác nhau. Đây là lựa chọn phù hợp cho người dùng yêu thích nhiếp ảnh, sáng tạo nội dung hoặc quay video chất lượng cao cho mạng xã hội và công việc.\n\nBên cạnh đó, thiết bị còn được trang bị pin dung lượng lớn, hỗ trợ sạc nhanh và kết nối hiện đại, giúp người dùng duy trì hoạt động cả ngày dài mà không cần sạc nhiều lần. Khả năng kết nối mạng tốc độ cao cùng các tính năng bảo mật tiên tiến giúp thiết bị đáp ứng tốt nhu cầu làm việc từ xa, học tập trực tuyến và giải trí đa phương tiện.\n\nVới sự kết hợp giữa thiết kế cao cấp, hiệu năng mạnh mẽ, camera chất lượng và độ bền cao, iPhone 17 Pro Max là lựa chọn lý tưởng cho người dùng đang tìm kiếm một chiếc điện thoại thông minh hàng đầu trong phân khúc cao cấp. Sản phẩm phù hợp với doanh nhân, người làm sáng tạo nội dung, game thủ hoặc bất kỳ ai mong muốn sở hữu một thiết bị công nghệ hiện đại, ổn định và đáng tin cậy trong thời gian dài.',1,1,1,'2026-04-21 05:38:54','2026-04-21 05:56:08','BEST_SELLER',NULL,NULL),(2,'Samsung Galaxy S25 Ultra','samsung-galaxy-s25-ultra','Samsung Galaxy S25 Ultra là flagship cao cấp nhất của Samsung, được thiết kế dành cho người dùng yêu cầu hiệu năng mạnh mẽ, camera chất lượng cao và trải nghiệm công nghệ tiên tiến. Với thiết kế sang trọng sử dụng khung titanium bền bỉ cùng màn hình lớn 6.9 inch sắc nét, thiết bị mang lại cảm giác cao cấp và phù hợp cho cả công việc lẫn giải trí.\n\nĐiểm nổi bật của Galaxy S25 Ultra nằm ở hệ thống camera 200MP chuyên nghiệp, cho khả năng chụp ảnh chi tiết cao, zoom xa và quay video chất lượng 8K. Công nghệ xử lý hình ảnh kết hợp trí tuệ nhân tạo giúp cải thiện chất lượng ảnh trong điều kiện thiếu sáng và tối ưu hóa màu sắc tự nhiên. Đây là lựa chọn lý tưởng cho người dùng yêu thích nhiếp ảnh, sáng tạo nội dung hoặc quay video chất lượng cao.\n\nNgoài camera, thiết bị còn được trang bị chip Snapdragon 8 Elite for Galaxy mạnh mẽ, giúp máy hoạt động mượt mà khi chơi game nặng, đa nhiệm hoặc xử lý tác vụ chuyên sâu. Hiệu năng ổn định cùng hệ điều hành Android mới giúp tối ưu hóa thời lượng pin và mang lại trải nghiệm sử dụng lâu dài.\n\nGalaxy S25 Ultra cũng nổi bật với pin dung lượng lớn 5000mAh, hỗ trợ sạc nhanh và kết nối 5G tốc độ cao, đáp ứng tốt nhu cầu sử dụng liên tục trong cả ngày dài. Khả năng chống nước và chống bụi chuẩn IP68 giúp thiết bị bền bỉ trong nhiều môi trường sử dụng khác nhau.\n\nVới thiết kế cao cấp, hiệu năng mạnh mẽ, camera vượt trội và nhiều tính năng thông minh, Samsung Galaxy S25 Ultra là lựa chọn hoàn hảo cho người dùng đang tìm kiếm một chiếc điện thoại Android flagship cao cấp, đáp ứng tốt nhu cầu làm việc, giải trí và sáng tạo nội dung trong thời gian dài.',1,2,1,'2026-04-21 10:00:03','2026-04-21 10:00:03','SALE',NULL,NULL),(3,'Oppo Reno 15 5G','oppo-reno-15-5g','OPPO Reno 15 5G là mẫu điện thoại tầm trung nổi bật của OPPO, hướng đến người dùng trẻ yêu thích thiết kế đẹp, camera chất lượng và thời lượng pin bền bỉ. Sở hữu ngoại hình mỏng nhẹ với mặt lưng kính hiện đại cùng màn hình AMOLED 6.59 inch sắc nét, thiết bị mang lại trải nghiệm hiển thị mượt mà và phù hợp cho cả làm việc lẫn giải trí hàng ngày.\n\nĐiểm nổi bật của OPPO Reno 15 5G nằm ở hiệu năng ổn định nhờ chip Snapdragon 7 Gen 4, cho khả năng xử lý nhanh, đa nhiệm mượt và đáp ứng tốt nhu cầu sử dụng phổ thông như lướt web, xem video, chơi game và sử dụng ứng dụng mạng xã hội. Máy được tối ưu hệ điều hành giúp tiết kiệm pin và duy trì hiệu suất ổn định trong thời gian dài.\n\nNgoài hiệu năng, thiết bị còn được trang bị camera 50MP chất lượng cao, hỗ trợ chụp ảnh rõ nét, quay video sắc nét và xử lý tốt trong nhiều điều kiện ánh sáng khác nhau. Camera trước độ phân giải lớn giúp chụp selfie đẹp và phù hợp cho người dùng thường xuyên sử dụng mạng xã hội hoặc quay video.\n\nBên cạnh đó, pin dung lượng lớn 6500mAh kết hợp công nghệ sạc nhanh 80W giúp người dùng sử dụng cả ngày dài mà không lo gián đoạn. Khả năng kết nối 5G tốc độ cao cùng nhiều tính năng thông minh giúp thiết bị đáp ứng tốt nhu cầu học tập, làm việc và giải trí trong thời đại số.\n\nVới thiết kế hiện đại, cấu hình mạnh trong tầm giá và thời lượng pin ấn tượng, OPPO Reno 15 5G là lựa chọn phù hợp cho người dùng đang tìm kiếm một chiếc điện thoại tầm trung bền bỉ, hiệu năng ổn định và giá thành hợp lý trong năm 2026.',2,4,1,'2026-04-21 12:23:33','2026-04-21 12:23:33','SALE',NULL,NULL),(4,'Xiaomi Redmi Note 14 Pro 5G','xiaomi-redmi-note-14-pro-5g','Xiaomi Redmi Note 14 Pro 5G là mẫu điện thoại tầm trung nổi bật của Xiaomi, được thiết kế dành cho người dùng cần hiệu năng ổn định, camera độ phân giải cao và thời lượng pin bền bỉ trong tầm giá hợp lý. Với thiết kế hiện đại, màn hình AMOLED lớn 6.67 inch sắc nét và tần số quét 120Hz mượt mà, thiết bị mang lại trải nghiệm giải trí, học tập và làm việc hiệu quả trong nhiều tình huống sử dụng hàng ngày.\n\nĐiểm nổi bật của Redmi Note 14 Pro 5G nằm ở camera chính 200MP, cho khả năng chụp ảnh chi tiết cao và xử lý tốt trong điều kiện thiếu sáng. Công nghệ chống rung quang học giúp hình ảnh rõ nét và video ổn định hơn, phù hợp cho người dùng yêu thích chụp ảnh hoặc quay video bằng điện thoại. Đây là một trong những smartphone có độ phân giải camera cao nhất trong phân khúc tầm trung hiện nay.\n\nNgoài camera, thiết bị còn được trang bị chip Dimensity 7300-Ultra mạnh mẽ, giúp máy hoạt động mượt mà khi chơi game, xem video hoặc sử dụng nhiều ứng dụng cùng lúc. Bộ xử lý này được sản xuất trên tiến trình 4nm, giúp tối ưu hiệu năng và tiết kiệm năng lượng, mang lại trải nghiệm ổn định trong thời gian dài sử dụng.\n\nBên cạnh đó, pin dung lượng 5110mAh kết hợp công nghệ sạc nhanh 45W giúp người dùng sử dụng thiết bị trong cả ngày mà không lo hết pin. Khả năng chống nước và bụi chuẩn IP68 giúp tăng độ bền và an toàn khi sử dụng trong nhiều môi trường khác nhau.\n\nVới mức giá hợp lý, cấu hình mạnh trong tầm giá và nhiều tính năng hiện đại, Xiaomi Redmi Note 14 Pro 5G là lựa chọn phù hợp cho học sinh, sinh viên, nhân viên văn phòng hoặc người dùng đang tìm kiếm một chiếc điện thoại tầm trung có hiệu năng tốt, camera chất lượng và thời lượng pin ổn định trong năm 2026.',3,3,1,'2026-04-21 12:38:18','2026-04-21 12:38:18','SALE',NULL,NULL),(5,'Samsung Galaxy A16 5G','samsung-galaxy-a16-5g','Samsung Galaxy A16 5G là mẫu điện thoại giá rẻ nổi bật trong dòng Galaxy A của Samsung, hướng đến người dùng cần một thiết bị bền bỉ, màn hình lớn và hỗ trợ kết nối 5G trong tầm giá hợp lý. Với thiết kế hiện đại, màn hình Super AMOLED 6.7 inch sắc nét và thời lượng pin dài, thiết bị đáp ứng tốt nhu cầu học tập, làm việc và giải trí hàng ngày.\n\nĐiểm nổi bật của Galaxy A16 5G nằm ở hiệu năng ổn định nhờ bộ vi xử lý 8 nhân cùng hệ điều hành Android mới, giúp máy hoạt động mượt mà khi sử dụng các ứng dụng phổ biến như Facebook, TikTok, YouTube hoặc chơi game nhẹ. Ngoài ra, Samsung cam kết cung cấp tới 6 năm cập nhật phần mềm, giúp thiết bị duy trì hiệu suất và bảo mật trong thời gian dài — một lợi thế hiếm thấy trong phân khúc giá rẻ.\n\nThiết bị còn được trang bị camera chính 50MP, cho khả năng chụp ảnh rõ nét và quay video ổn định trong nhiều điều kiện ánh sáng khác nhau. Camera trước 13MP phù hợp cho nhu cầu selfie, gọi video hoặc học tập trực tuyến. Bên cạnh đó, dung lượng pin 5000mAh giúp người dùng sử dụng cả ngày mà không cần sạc nhiều lần, phù hợp với học sinh, sinh viên hoặc người dùng phổ thông.\n\nVới mức giá dễ tiếp cận, cấu hình ổn định và hỗ trợ kết nối 5G hiện đại, Samsung Galaxy A16 5G là lựa chọn phù hợp cho người dùng đang tìm kiếm một chiếc điện thoại giá rẻ dưới 6 triệu, đáp ứng tốt nhu cầu sử dụng cơ bản trong năm 2026.',4,2,1,'2026-04-21 13:00:23','2026-04-21 13:00:23','SALE',NULL,NULL),(6,'Xiaomi 17 Pro Max','xiaomi-17-pro-max','Xiaomi 17 Pro Max là flagship cao cấp nổi bật với thiết kế sang trọng cùng khung nhôm và mặt kính cao cấp, mang lại cảm giác cầm nắm chắc chắn và hiện đại. Máy sở hữu màn hình LTPO AMOLED 6.9 inch siêu sáng lên tới 3500 nits, hỗ trợ 120Hz cho trải nghiệm mượt mà, hiển thị sắc nét và sống động trong mọi điều kiện ánh sáng. Đặc biệt, thiết bị còn được trang bị màn hình phụ phía sau, tăng tính tiện dụng và khác biệt so với các smartphone truyền thống.\n\nVề hiệu năng, Xiaomi 17 Pro Max được trang bị vi xử lý Snapdragon 8 Elite Gen 5 tiến trình 3nm, mang lại sức mạnh vượt trội cho mọi tác vụ từ chơi game nặng đến xử lý đa nhiệm chuyên sâu. Kết hợp với RAM lên tới 16GB và bộ nhớ UFS 4.1 tốc độ cao, thiết bị đảm bảo khả năng vận hành nhanh, ổn định và tối ưu cho người dùng cao cấp. Hệ thống camera Leica 50MP hỗ trợ quay video 8K cùng nhiều công nghệ chống rung và HDR giúp ghi lại hình ảnh sắc nét, chuyên nghiệp.\n\nĐiểm nhấn lớn nhất của Xiaomi 17 Pro Max chính là viên pin dung lượng khủng 7500mAh, mang lại thời lượng sử dụng cực dài, đáp ứng tốt nhu cầu cả ngày dài hoặc hơn. Máy hỗ trợ sạc nhanh 100W và sạc không dây 50W, giúp rút ngắn thời gian nạp năng lượng đáng kể. Với đầy đủ các công nghệ hiện đại như 5G, NFC, Wi-Fi 7 và hệ điều hành Android 16, đây là lựa chọn hàng đầu cho người dùng cần một chiếc smartphone mạnh mẽ, pin trâu và đa năng trong phân khúc flagship.',1,3,1,'2026-05-06 12:45:12','2026-05-06 12:45:12','NEW',NULL,NULL),(7,'OPPO Find X7 Ultra','oppo-find-x7-pro','OPPO Find X7 Ultra là flagship cao cấp hàng đầu với thiết kế sang trọng, cụm camera tròn đặc trưng và vật liệu cao cấp như kính hoặc da kết hợp khung nhôm chắc chắn. Máy sở hữu màn hình LTPO AMOLED 6.82 inch độ phân giải 2K, hỗ trợ HDR10+, Dolby Vision và độ sáng lên tới 4500 nits, mang lại trải nghiệm hiển thị cực kỳ sắc nét, sống động và rõ ràng ngay cả dưới ánh nắng gắt.\n\nVề hiệu năng, OPPO Find X7 Ultra được trang bị chip Snapdragon 8 Gen 3 mạnh mẽ, kết hợp RAM lên tới 16GB và bộ nhớ UFS 4.0 tốc độ cao, đáp ứng mượt mà mọi tác vụ từ chơi game nặng đến xử lý đa nhiệm chuyên sâu. Hệ thống 4 camera 50MP hợp tác cùng Hasselblad, bao gồm cảm biến 1 inch và hai ống kính tele tiềm vọng, mang lại khả năng chụp ảnh và zoom hàng đầu trong thế giới smartphone.\n\nKhông chỉ mạnh mẽ, thiết bị còn sở hữu pin 5000mAh cùng công nghệ sạc nhanh 100W và sạc không dây 50W, giúp rút ngắn thời gian nạp năng lượng đáng kể. Với đầy đủ công nghệ hiện đại như 5G, NFC, Wi-Fi 7 và hệ điều hành ColorOS tối ưu, OPPO Find X7 Ultra là lựa chọn lý tưởng cho người dùng cần một chiếc smartphone cao cấp, camera đỉnh và hiệu năng vượt trội.',1,4,1,'2026-05-06 12:55:02','2026-05-06 12:55:02','NEW',NULL,NULL),(8,'vivo X300 Ultra','vivo-x300-ultra','vivo X300 Ultra là flagship cao cấp nhất của vivo năm 2026, nổi bật với thiết kế sang trọng và cụm camera lớn mang phong cách máy ảnh chuyên nghiệp. Máy sở hữu màn hình LTPO AMOLED 6.82 inch độ phân giải 2K, hỗ trợ tần số quét 144Hz và độ sáng lên tới 4500 nits, mang lại trải nghiệm hiển thị cực kỳ sắc nét, mượt mà và hiển thị tốt ngoài trời.\n\nVề hiệu năng, thiết bị được trang bị Snapdragon 8 Elite Gen 5 tiến trình 3nm mạnh mẽ, kết hợp RAM lên tới 16GB và bộ nhớ UFS 4.1, giúp xử lý mọi tác vụ từ gaming nặng đến đa nhiệm chuyên sâu một cách mượt mà. Điểm nổi bật lớn nhất là hệ thống camera ZEISS với cảm biến chính 200MP và tele 200MP, hỗ trợ quay video 4K 120fps và zoom xa chuyên nghiệp, đưa khả năng nhiếp ảnh smartphone lên tầm mới.\n\nKhông chỉ mạnh về hiệu năng, vivo X300 Ultra còn sở hữu viên pin 6600mAh dung lượng lớn cùng sạc nhanh 100W và sạc không dây 40W, đáp ứng nhu cầu sử dụng dài lâu. Với đầy đủ công nghệ như 5G, NFC, chống nước IP68/IP69 và hệ điều hành Android 16, đây là lựa chọn hàng đầu cho người dùng cần một chiếc smartphone cao cấp toàn diện về camera, hiệu năng và pin.',1,5,1,'2026-05-06 13:07:23','2026-05-06 13:07:23','BEST_SELLER',NULL,NULL),(9,'Huawei Mate 80 Pro','huawei-mate-80-pro','Huawei Mate 80 Pro là mẫu smartphone flagship cao cấp nhất của Huawei năm 2026, nổi bật với chip Kirin 9030 mạnh mẽ, camera AI 50MP và màn hình LTPO OLED 120Hz siêu mượt. Đây là thiết bị hướng đến hiệu năng đỉnh cao, chụp ảnh chuyên nghiệp và trải nghiệm giải trí cao cấp.\n\nSở hữu hệ thống camera XMAGE thế hệ mới với khả năng zoom quang 4x và chụp thiếu sáng vượt trội, Huawei Mate 80 Pro mang đến chất lượng hình ảnh cạnh tranh trực tiếp với các flagship hàng đầu. Kết hợp pin 5750mAh và sạc nhanh 100W, thiết bị đảm bảo thời gian sử dụng dài và tốc độ sạc cực nhanh.\n\nVới thiết kế sang trọng, khả năng chống nước IP68/IP69 và hệ điều hành HarmonyOS tối ưu, Huawei Mate 80 Pro là lựa chọn lý tưởng cho người dùng yêu thích công nghệ cao cấp, hiệu năng mạnh và hệ sinh thái Huawei.',1,6,1,'2026-05-06 13:21:08','2026-05-06 13:21:08','SALE',NULL,NULL),(10,'Google Pixel 10 Pro XL','google-pixel-10-pro-xl','Google Pixel 10 Pro XL là mẫu smartphone flagship cao cấp nhất của Google, nổi bật với chip Tensor G5 tối ưu cho AI và hiệu năng thông minh. Thiết bị được thiết kế hướng đến trải nghiệm Android thuần mượt mà, tích hợp sâu Google Gemini giúp xử lý tác vụ nhanh, hỗ trợ chụp ảnh, dịch thuật và tối ưu hệ thống theo thời gian thực.\n\nĐiểm mạnh lớn nhất của Pixel 10 Pro XL nằm ở hệ thống camera AI thế hệ mới, bao gồm camera chính 50MP, telephoto zoom quang 5x và camera góc siêu rộng 48MP. Nhờ thuật toán xử lý hình ảnh của Google, thiết bị cho chất lượng ảnh vượt trội trong mọi điều kiện ánh sáng, đặc biệt là chụp đêm và chân dung.\n\nNgoài ra, Pixel 10 Pro XL sở hữu màn hình LTPO OLED QHD+ 120Hz siêu mượt, pin 5200mAh và sạc nhanh 45W, đáp ứng tốt nhu cầu sử dụng cao cấp. Đây là lựa chọn lý tưởng cho người dùng yêu thích hệ sinh thái Google, đề cao AI thông minh, camera chất lượng cao và trải nghiệm Android ổn định, lâu dài.',1,7,1,'2026-05-06 13:33:58','2026-05-06 13:33:58','SALE',NULL,NULL),(11,'iPhone 14 Pro Max','iphone-14-pro-max','iPhone 14 Pro Max là mẫu flagship cao cấp của Apple, sử dụng chip A16 Bionic mang lại hiệu năng mạnh mẽ và khả năng tối ưu năng lượng vượt trội. Thiết bị chạy hệ điều hành iOS với độ ổn định cao, hỗ trợ lâu dài và tích hợp sâu trong hệ sinh thái Apple.\n\nĐiểm nổi bật của iPhone 14 Pro Max nằm ở cụm camera 48MP thế hệ mới kết hợp công nghệ Photonic Engine, cho chất lượng ảnh sắc nét trong cả điều kiện thiếu sáng. Máy hỗ trợ quay video 4K Dolby Vision, phù hợp cho cả quay phim chuyên nghiệp và sáng tạo nội dung.\n\nNgoài ra, iPhone 14 Pro Max sở hữu màn hình 6.7 inch Super Retina XDR với công nghệ ProMotion 120Hz cho trải nghiệm mượt mà. Thiết kế khung thép không gỉ cao cấp, khả năng chống nước IP68 và pin dung lượng lớn giúp thiết bị trở thành lựa chọn hàng đầu trong phân khúc flagship cao cấp.',2,1,1,'2026-05-06 13:47:49','2026-05-06 13:47:49','SALE',NULL,NULL),(12,'Samsung Galaxy A56 5G','samsung-galaxy-a56-5g','Samsung Galaxy A56 5G là mẫu smartphone cận cao cấp nổi bật của Samsung, được trang bị chip Exynos 1580 mang lại hiệu năng ổn định, tiết kiệm pin và hỗ trợ xử lý AI tốt hơn. Đây là lựa chọn lý tưởng cho người dùng cần một chiếc điện thoại mạnh mẽ trong tầm giá hợp lý.\n\nThiết bị sở hữu màn hình Super AMOLED 6.7 inch 120Hz sắc nét, mang lại trải nghiệm mượt mà khi chơi game, xem phim và lướt web. Hệ thống camera 50MP cho chất lượng ảnh chi tiết, kết hợp camera góc rộng giúp chụp linh hoạt trong nhiều điều kiện khác nhau.\n\nNgoài ra, Galaxy A56 5G còn có pin 5000mAh bền bỉ, sạc nhanh 45W và khả năng chống nước IP67. Đây là một trong những smartphone cận cao cấp đáng mua nhất hiện nay, phù hợp cho học tập, giải trí và sử dụng lâu dài trong hệ sinh thái Samsung.',2,2,1,'2026-05-06 14:00:16','2026-05-06 14:00:16','SALE',NULL,NULL);
/*!40000 ALTER TABLE `products` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `reasons`
--

DROP TABLE IF EXISTS `reasons`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reasons` (
  `reason_id` int unsigned NOT NULL AUTO_INCREMENT,
  `reason_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `reason_type` enum('ORDER_CANCEL','RETURN','REFUND') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `allow_input` tinyint(1) DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`reason_id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `reasons`
--

LOCK TABLES `reasons` WRITE;
/*!40000 ALTER TABLE `reasons` DISABLE KEYS */;
INSERT INTO `reasons` VALUES (1,'Tôi đặt nhầm sản phẩm','ORDER_CANCEL',0,1,'2026-05-15 13:41:10'),(2,'Tôi muốn đổi sang sản phẩm khác','ORDER_CANCEL',0,1,'2026-05-15 13:41:10'),(3,'Tôi không còn nhu cầu mua nữa','ORDER_CANCEL',0,1,'2026-05-15 13:41:10'),(4,'Tôi tìm được giá tốt hơn','ORDER_CANCEL',0,1,'2026-05-15 13:41:10'),(5,'Thanh toán gặp lỗi','ORDER_CANCEL',0,1,'2026-05-15 13:41:10'),(6,'Thời gian giao hàng quá lâu','ORDER_CANCEL',0,1,'2026-05-15 13:41:10'),(7,'Tôi muốn thay đổi địa chỉ nhận hàng','ORDER_CANCEL',0,1,'2026-05-15 13:41:10'),(8,'Lý do khác','ORDER_CANCEL',1,1,'2026-05-15 13:41:10');
/*!40000 ALTER TABLE `reasons` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `role_id` int unsigned NOT NULL AUTO_INCREMENT,
  `role_name` enum('ADMIN','STAFF') COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`role_id`),
  UNIQUE KEY `role_name` (`role_name`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roles`
--

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
INSERT INTO `roles` VALUES (1,'ADMIN','2026-04-20 14:30:42','2026-04-20 14:30:41.630927'),(2,'STAFF','2026-04-20 14:30:42','2026-04-20 14:30:42.345580');
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `settings`
--

DROP TABLE IF EXISTS `settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `settings` (
  `setting_id` int unsigned NOT NULL AUTO_INCREMENT,
  `maintenance_start` datetime DEFAULT NULL,
  `maintenance_end` datetime DEFAULT NULL,
  `is_maintenance` tinyint(1) DEFAULT '0',
  `updated_at` datetime DEFAULT NULL,
  `payment_approve_threshold` decimal(15,2) DEFAULT '5000000.00',
  PRIMARY KEY (`setting_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `settings`
--

LOCK TABLES `settings` WRITE;
/*!40000 ALTER TABLE `settings` DISABLE KEYS */;
INSERT INTO `settings` VALUES (1,NULL,NULL,0,'2026-04-24 04:31:55',5000000.00),(2,'2026-04-28 17:07:53','2026-04-28 17:08:23',0,'2026-04-28 17:08:23',5000000.00);
/*!40000 ALTER TABLE `settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `usage_logs`
--

DROP TABLE IF EXISTS `usage_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `usage_logs` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `action` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `cost_usd` decimal(12,6) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  `guest_session_id` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ip_hash` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `metadata` longtext COLLATE utf8mb4_unicode_ci,
  `request_tokens_est` int DEFAULT NULL,
  `response_tokens` int DEFAULT NULL,
  `status` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `usage_logs`
--

LOCK TABLES `usage_logs` WRITE;
/*!40000 ALTER TABLE `usage_logs` DISABLE KEYS */;
INSERT INTO `usage_logs` VALUES (1,'chat_request',0.000159,'2026-05-10 06:35:10.807131','guest-1778394293512-b89hcea5','e0f1','{\"model\":\"llama-3.3-70b-versatile\",\"sessionId\":2}',112,58,'ok',NULL);
/*!40000 ALTER TABLE `usage_logs` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-06-08 13:58:15
