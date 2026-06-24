package com.webbanhang.shop;

import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.jdbc.core.JdbcTemplate;

@SpringBootApplication
@EnableScheduling
@EnableAsync
public class ShopApplication {

	public static void main(String[] args) {
		SpringApplication.run(ShopApplication.class, args);
	}

    @Bean
    public static ApplicationRunner fixEnumColumns(JdbcTemplate jdbcTemplate) {
        return args -> {
            try {
                jdbcTemplate.execute("ALTER TABLE customer_notifications MODIFY COLUMN actor_type ENUM('CUSTOMER', 'SYSTEM', 'ADMIN') DEFAULT 'SYSTEM';");
                System.out.println("[STARTUP] customer_notifications.actor_type ENUM updated successfully.");
            } catch (Exception e) {
                System.err.println("[STARTUP] Failed to alter customer_notifications: " + e.getMessage());
            }
            try {
                jdbcTemplate.execute("ALTER TABLE notifications MODIFY COLUMN actor_type ENUM('CUSTOMER', 'SYSTEM', 'ADMIN') DEFAULT 'CUSTOMER';");
                System.out.println("[STARTUP] notifications.actor_type ENUM updated successfully.");
            } catch (Exception e) {
                System.err.println("[STARTUP] Failed to alter notifications: " + e.getMessage());
            }

            // Cập nhật ENUM cho bảng orders
            try {
                jdbcTemplate.execute("ALTER TABLE orders MODIFY COLUMN payment_status ENUM('UNPAID','WAITING_CONFIRM','PAID','FAILED') DEFAULT 'UNPAID';");
                jdbcTemplate.execute("ALTER TABLE orders MODIFY COLUMN order_status ENUM('PENDING_CONFIRM','PENDING_PAYMENT_CONFIRMATION','CONFIRMED','SHIPPING','PENDING_PICKUP','PENDING_SHIPPING','DELIVERED','CANCELLED') DEFAULT 'PENDING_CONFIRM';");
                jdbcTemplate.execute("ALTER TABLE orders MODIFY COLUMN payment_method ENUM('COD','BANK_TRANSFER');");
                System.out.println("[STARTUP] orders ENUM columns updated successfully.");
            } catch (Exception e) {
                System.err.println("[STARTUP] Failed to alter orders ENUM: " + e.getMessage());
            }

            // Cập nhật ENUM cho bảng payments
            try {
                jdbcTemplate.execute("ALTER TABLE payments MODIFY COLUMN payment_status ENUM('UNPAID','WAITING_CONFIRM','PAID','FAILED') DEFAULT 'UNPAID';");
                jdbcTemplate.execute("ALTER TABLE payments MODIFY COLUMN payment_method ENUM('COD','BANK_TRANSFER');");
                System.out.println("[STARTUP] payments ENUM updated successfully.");
            } catch (Exception e) {
                System.err.println("[STARTUP] Failed to alter payments ENUM: " + e.getMessage());
            }

            // Cập nhật ENUM cho bảng payment_attempts
            try {
                jdbcTemplate.execute("ALTER TABLE payment_attempts MODIFY COLUMN status ENUM('PENDING','WAITING_CONFIRM','PROCESSING','MATCHED','REJECTED','SUCCESS','FAILED') DEFAULT 'PENDING';");
                try {
                    jdbcTemplate.execute("ALTER TABLE payment_attempts ADD COLUMN processing_by_admin_name VARCHAR(255);");
                } catch (Exception ignore) {}
                System.out.println("[STARTUP] payment_attempts ENUM updated successfully.");
            } catch (Exception e) {
                System.err.println("[STARTUP] Failed to alter payment_attempts ENUM: " + e.getMessage());
            }

            // Cập nhật ENUM cho bảng bank_transactions
            try {
                jdbcTemplate.execute("ALTER TABLE bank_transactions MODIFY COLUMN reconcile_status ENUM('PENDING','MATCHED','REJECTED','DELETED') DEFAULT 'PENDING';");
                System.out.println("[STARTUP] bank_transactions ENUM updated successfully.");
            } catch (Exception e) {
                System.err.println("[STARTUP] Failed to alter bank_transactions ENUM: " + e.getMessage());
            }

            // Cập nhật bảng payment_logs
            try {
                jdbcTemplate.execute("ALTER TABLE payment_logs ADD COLUMN admin_name VARCHAR(255);");
                System.out.println("[STARTUP] payment_logs.admin_name added successfully.");
            } catch (Exception ignore) {}
            // Xóa thông báo cũ có trạng thái tiếng Anh
            try {
                int deleted = jdbcTemplate.update(
                    "DELETE FROM customer_notifications WHERE message LIKE '%CONFIRMED%' OR message LIKE '%SHIPPING%' OR message LIKE '%DELIVERED%' OR message LIKE '%CANCELLED%' OR message LIKE '%PENDING_CONFIRM%' OR message LIKE '%PENDING_PICKUP%' OR message LIKE '%PENDING_SHIPPING%'"
                );
                System.out.println("[STARTUP] Deleted " + deleted + " old English-status customer notifications.");
            } catch (Exception e) {
                System.err.println("[STARTUP] Failed to clean old notifications: " + e.getMessage());
            }



            // Migration: Cập nhật tên Admin cho các bản ghi cũ
            try {
                jdbcTemplate.update("UPDATE payment_logs SET admin_name = 'Quản trị viên hệ thống' WHERE admin_id = 1 AND (admin_name IS NULL OR admin_name = '')");
                jdbcTemplate.update("UPDATE payment_attempts SET processing_by_admin_name = 'Quản trị viên hệ thống' WHERE processing_by_admin_id = 1 AND (processing_by_admin_name IS NULL OR processing_by_admin_name = '')");
                jdbcTemplate.update("UPDATE payment_logs SET admin_name = 'SYSTEM' WHERE admin_id = 0 AND (admin_name IS NULL OR admin_name = '')");
                System.out.println("[STARTUP] Data migration for admin names completed.");
            } catch (Exception e) {
                System.err.println("[STARTUP] Failed to migrate admin names: " + e.getMessage());
            }

            // Bảng OTP quên mật khẩu (production dùng ddl-auto=none nên phải tạo thủ công)
            try {
                jdbcTemplate.execute("""
                    CREATE TABLE IF NOT EXISTS password_reset_codes (
                        id BIGINT AUTO_INCREMENT PRIMARY KEY,
                        email VARCHAR(255) NOT NULL,
                        code_hash VARCHAR(255) NOT NULL,
                        created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                        expires_at TIMESTAMP(6) NOT NULL,
                        verified_at TIMESTAMP(6) NULL,
                        used_at TIMESTAMP(6) NULL,
                        INDEX idx_prc_email_created (email, created_at),
                        INDEX idx_prc_expires_at (expires_at),
                        INDEX idx_prc_used_at (used_at)
                    )
                    """);
                System.out.println("[STARTUP] password_reset_codes table ensured.");
            } catch (Exception e) {
                System.err.println("[STARTUP] Failed to ensure password_reset_codes table: " + e.getMessage());
            }
        };
    }

}
