DROP DATABASE IF EXISTS myphone;

CREATE DATABASE myphone
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE myphone;


-- VAI TRÒ
CREATE TABLE `roles` (
  `role_id` int unsigned NOT NULL AUTO_INCREMENT,
  `role_name` enum('ADMIN','STAFF') COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`role_id`),
  UNIQUE KEY `role_name` (`role_name`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- TÀI KHOẢN ADMIN/NHÂN VIÊN
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
  PRIMARY KEY (`admin_id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`),
  KEY `role_id` (`role_id`),
  CONSTRAINT `admin_accounts_ibfk_1` FOREIGN KEY (`role_id`) REFERENCES `roles` (`role_id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- CÀI ĐẶT BẢO TRÌ HỆ THỐNG VÀ HẠN MỨC PHÊ DUYỆT
CREATE TABLE `settings` (
  `setting_id` int unsigned NOT NULL AUTO_INCREMENT,
  `maintenance_start` datetime DEFAULT NULL,
  `maintenance_end` datetime DEFAULT NULL,
  `is_maintenance` tinyint(1) DEFAULT '0',
  `payment_approve_threshold` decimal(15,2) DEFAULT '5000000.00',
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`setting_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- THÔNG TIN TÀI KHOẢN NGÂN HÀNG NHẬN CHUYỂN KHOẢN
CREATE TABLE `bank_settings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `bank_bin` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT '970422',
  `account_number` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `account_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- BANNER
CREATE TABLE `banners` (
  `banner_id` int unsigned NOT NULL AUTO_INCREMENT,
  `position` enum('SLIDER','TOP','MIDDLE','BOTTOM') COLLATE utf8mb4_unicode_ci DEFAULT 'SLIDER',
  `is_active` tinyint(1) DEFAULT '1',
  `start_date` datetime DEFAULT NULL,
  `end_date` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`banner_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ẢNH BANNER
CREATE TABLE `banner_images` (
  `banner_image_id` int unsigned NOT NULL AUTO_INCREMENT,
  `banner_id` int unsigned NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `subtitle` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `image_url` varchar(1024) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sort_order` int DEFAULT '0',
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`banner_image_id`),
  KEY `banner_id` (`banner_id`),
  CONSTRAINT `banner_images_ibfk_1` FOREIGN KEY (`banner_id`) REFERENCES `banners` (`banner_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- THƯƠNG HIỆU
CREATE TABLE `brands` (
  `brand_id` int unsigned NOT NULL AUTO_INCREMENT,
  `brand_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `brand_description` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`brand_id`),
  UNIQUE KEY `brand_name` (`brand_name`),
  UNIQUE KEY `slug` (`slug`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ẢNH THƯƠNG HIỆU
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


-- DANH MỤC
CREATE TABLE `categories` (
  `category_id` int unsigned NOT NULL AUTO_INCREMENT,
  `category_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `category_description` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`category_id`),
  UNIQUE KEY `category_name` (`category_name`),
  UNIQUE KEY `slug` (`slug`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ẢNH DANH MỤC
CREATE TABLE `category_images` (
  `category_image_id` int unsigned NOT NULL AUTO_INCREMENT,
  `category_id` int unsigned NOT NULL,
  `image_url` varchar(1024) COLLATE utf8mb4_unicode_ci NOT NULL,
  `image_type` enum('THUMBNAIL','BANNER','ICON','SLIDER') COLLATE utf8mb4_unicode_ci DEFAULT 'THUMBNAIL',
  `sort_order` int DEFAULT '0',
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`category_image_id`),
  KEY `category_id` (`category_id`),
  CONSTRAINT `category_images_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `categories` (`category_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- TẦM GIÁ
CREATE TABLE `price_segments` (
  `price_segment_id` int unsigned NOT NULL AUTO_INCREMENT,
  `segment_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `min_price` decimal(12,2) NOT NULL,
  `max_price` decimal(12,2) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`price_segment_id`),
  UNIQUE KEY `segment_name` (`segment_name`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- TẦM GIÁ DANH MỤC
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


-- SẢN PHẨM
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
  `product_type` enum('NEW','BEST_SELLER','SALE','NORMAL') COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`product_id`),
  UNIQUE KEY `slug` (`slug`),
  KEY `category_id` (`category_id`),
  KEY `brand_id` (`brand_id`),
  CONSTRAINT `products_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `categories` (`category_id`),
  CONSTRAINT `products_ibfk_2` FOREIGN KEY (`brand_id`) REFERENCES `brands` (`brand_id`) ON DELETE SET NULL,
  CONSTRAINT `chk_product_type` CHECK ((`product_type` in (_utf8mb4'NEW',_utf8mb4'BEST_SELLER',_utf8mb4'SALE')))
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ẢNH SẢN PHẨM
CREATE TABLE `product_images` (
  `product_image_id` int unsigned NOT NULL AUTO_INCREMENT,
  `product_id` int unsigned NOT NULL,
  `image_url` varchar(1024) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_thumbnail` tinyint(1) DEFAULT '0',
  `sort_order` int DEFAULT '0',
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`product_image_id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `product_images_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- THÔNG SỐ SẢN PHẨM
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


-- MÀU SẢN PHẨM
CREATE TABLE `product_colors` (
  `product_color_id` int unsigned NOT NULL AUTO_INCREMENT,
  `product_id` int unsigned NOT NULL,
  `color_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `color_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `quantity` int DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`product_color_id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `product_colors_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=48 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ẢNH THEO MÀU SẢN PHẨM
CREATE TABLE `product_color_images` (
  `image_id` int unsigned NOT NULL AUTO_INCREMENT,
  `product_color_id` int unsigned NOT NULL,
  `image_url` varchar(1024) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sort_order` int DEFAULT '0',
  PRIMARY KEY (`image_id`),
  KEY `product_color_id` (`product_color_id`),
  CONSTRAINT `product_color_images_ibfk_1` FOREIGN KEY (`product_color_id`) REFERENCES `product_colors` (`product_color_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=51 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- BIẾN THỂ SẢN PHẨM
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


-- TÀI KHOẢN KHÁCH HÀNG
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
  PRIMARY KEY (`customer_id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `google_id` (`google_id`),
  KEY `idx_customer_email` (`email`),
  KEY `idx_customer_username` (`username`),
  KEY `idx_customer_google_id` (`google_id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- GIỎ HÀNG
CREATE TABLE `carts` (
  `cart_id` int unsigned NOT NULL AUTO_INCREMENT,
  `customer_id` int unsigned NOT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`cart_id`),
  UNIQUE KEY `customer_id` (`customer_id`),
  CONSTRAINT `carts_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customer_accounts` (`customer_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- SẢN PHẨM TRONG GIỎ HÀNG
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
) ENGINE=InnoDB AUTO_INCREMENT=41 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- LÝ DO HỦY ĐƠN HÀNG
CREATE TABLE `reasons` (
  `reason_id` int unsigned NOT NULL AUTO_INCREMENT,
  `reason_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `reason_type` enum('ORDER_CANCEL','RETURN','REFUND') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'ORDER_CANCEL',
  `allow_input` tinyint(1) DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`reason_id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
INSERT INTO `reasons` (`reason_name`, `reason_type`, `allow_input`, `is_active`, `created_at`) VALUES
  ('Tôi đặt nhầm sản phẩm',              'ORDER_CANCEL', 0, 1, NOW()),
  ('Tôi muốn đổi sang sản phẩm khác',    'ORDER_CANCEL', 0, 1, NOW()),
  ('Tôi không còn nhu cầu mua nữa',      'ORDER_CANCEL', 0, 1, NOW()),
  ('Tôi tìm được giá tốt hơn',           'ORDER_CANCEL', 0, 1, NOW()),
  ('Thanh toán gặp lỗi',                 'ORDER_CANCEL', 0, 1, NOW()),
  ('Thời gian giao hàng quá lâu',        'ORDER_CANCEL', 0, 1, NOW()),
  ('Tôi muốn thay đổi địa chỉ nhận hàng','ORDER_CANCEL', 0, 1, NOW()),
  ('Lý do khác',                         'ORDER_CANCEL', 1, 1, NOW());


-- ĐƠN HÀNG
CREATE TABLE `orders` (
  `order_id` int unsigned NOT NULL AUTO_INCREMENT,
  `order_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `customer_id` int unsigned NOT NULL,
  `receiver_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `receiver_phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `shipping_address` text COLLATE utf8mb4_unicode_ci,
  `order_status` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cancel_reason_id` int unsigned DEFAULT NULL,
  `cancel_note` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cancelled_by` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cancelled_by_admin_id` int unsigned DEFAULT NULL,
  `cancelled_by_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cancelled_at` datetime DEFAULT NULL,
  `total_amount` decimal(15,2) DEFAULT '0.00',
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `customer_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `payment_method` enum('COD','BANK_TRANSFER') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `payment_status` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `payment_note` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `payment_note_author` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `payment_note_date` datetime DEFAULT NULL,
  `inventory_deducted` bit(1) DEFAULT NULL,
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
) ENGINE=InnoDB AUTO_INCREMENT=76 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- CHI TIẾT SẢN PHẨM TRONG ĐƠN HÀNG
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
  PRIMARY KEY (`order_item_id`),
  KEY `order_id` (`order_id`),
  CONSTRAINT `order_items_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`order_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=95 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- LƯU CÁC LẦN KHÁCH UP BILL CHUYỂN KHOẢN
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
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- LƯU GIAO DỊCH NGÂN HÀNG THỰC TẾ
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
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- THANH TOÁN
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
  PRIMARY KEY (`payment_id`),
  KEY `idx_payments_order_id` (`order_id`),
  KEY `idx_payments_customer_id` (`customer_id`),
  KEY `fk_payments_confirm_admin` (`confirmed_by_admin_id`),
  CONSTRAINT `fk_payments_confirm_admin` FOREIGN KEY (`confirmed_by_admin_id`) REFERENCES `admin_accounts` (`admin_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_payments_customer` FOREIGN KEY (`customer_id`) REFERENCES `customer_accounts` (`customer_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_payments_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`order_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=55 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- LOG TOÀN BỘ THAO TÁC THANH TOÁN
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
  PRIMARY KEY (`log_id`),
  KEY `idx_payment_logs_order` (`order_id`),
  KEY `idx_payment_logs_payment` (`payment_id`),
  KEY `idx_payment_logs_attempt` (`payment_attempt_id`),
  KEY `idx_payment_logs_transaction` (`transaction_id`),
  KEY `idx_payment_logs_admin` (`admin_id`),
  KEY `idx_payment_logs_action` (`action_type`),
  CONSTRAINT `fk_payment_logs_admin` FOREIGN KEY (`admin_id`) REFERENCES `admin_accounts` (`admin_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_payment_logs_transaction` FOREIGN KEY (`transaction_id`) REFERENCES `bank_transactions` (`transaction_id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=59 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ĐÁNH GIÁ
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
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ẢNH ĐÁNH GIÁ
CREATE TABLE `evaluate_images` (
  `evaluate_image_id` int unsigned NOT NULL AUTO_INCREMENT,
  `evaluate_id` int unsigned NOT NULL,
  `image_url` varchar(1024) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`evaluate_image_id`),
  KEY `idx_evaluate_images_evaluate_id` (`evaluate_id`),
  CONSTRAINT `evaluate_images_ibfk_1` FOREIGN KEY (`evaluate_id`) REFERENCES `evaluates` (`evaluate_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- PHẢN HỒI ĐÁNH GIÁ
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
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- LIÊN HỆ
CREATE TABLE `contacts` (
  `contact_id` int unsigned NOT NULL AUTO_INCREMENT,
  `full_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `subject` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `message` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime DEFAULT NULL,
  `customer_id` int DEFAULT NULL,
  PRIMARY KEY (`contact_id`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ẢNH LIÊN HỆ
CREATE TABLE `contact_images` (
  `contact_image_id` int unsigned NOT NULL AUTO_INCREMENT,
  `contact_id` int unsigned NOT NULL,
  `image_url` varchar(1024) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`contact_image_id`),
  KEY `contact_id` (`contact_id`),
  CONSTRAINT `contact_images_ibfk_1` FOREIGN KEY (`contact_id`) REFERENCES `contacts` (`contact_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- PHẢN HỒI LIÊN HỆ
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


-- ẢNH PHẢN HỒI LIÊN HỆ
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


-- THÔNG BÁO ADMIN
CREATE TABLE `notifications` (
  `notification_id` int unsigned NOT NULL AUTO_INCREMENT,
  `admin_id` int unsigned NOT NULL,
  `type` enum('ORDER','CONTACT','EVALUATE') COLLATE utf8mb4_unicode_ci NOT NULL,
  `action` enum('CREATE','CANCEL','CONFIRM','SHIPPING','DELIVERED','REVIEW','REPLY') COLLATE utf8mb4_unicode_ci NOT NULL,
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
) ENGINE=InnoDB AUTO_INCREMENT=305 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- THÔNG BÁO KHÁCH HÀNG
CREATE TABLE `customer_notifications` (
  `notification_id` int NOT NULL AUTO_INCREMENT,
  `action` enum('CREATE','CANCEL','CONFIRM','SHIPPING','DELIVERED','REVIEW','REPLY') COLLATE utf8mb4_unicode_ci NOT NULL,
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
  PRIMARY KEY (`notification_id`)
) ENGINE=InnoDB AUTO_INCREMENT=89 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- TIN TỨC
CREATE TABLE `news` (
  `news_id` int unsigned NOT NULL AUTO_INCREMENT,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`news_id`),
  UNIQUE KEY `slug` (`slug`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;ci;


-- ẢNH TIN TỨC
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


-- PHIÊN CHAT AI
CREATE TABLE `chat_sessions` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `guest_session_id` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` bit(1) NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- TIN NHẮN TRONG PHIÊN CHAT TOKEN
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
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- LOG SỬ DỤNG AI CHỐNG SPAM
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
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- QUÊN MẬT KHẨU
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
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;unicode_ci;


-- OTP RESET PASSWORD
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
