package com.webbanhang.shop.Model.Inventory;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Inventory Transaction - Production-grade inventory audit trail
 * Tracks ALL inventory changes with full before/after state
 */
@Entity
@Table(name = "inventory_transactions")
@Getter
@Setter
public class InventoryTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "transaction_id")
    private Long transactionId;

    @Column(name = "variant_id", nullable = false)
    private Integer variantId;

    @Enumerated(EnumType.STRING)
    @Column(name = "transaction_type", nullable = false)
    private TransactionType transactionType;

    @Column(name = "quantity", nullable = false)
    private Integer quantity;

    // Before state
    @Column(name = "before_total_stock", nullable = false)
    private Integer beforeTotalStock;

    @Column(name = "before_reserved_stock", nullable = false)
    private Integer beforeReservedStock;

    @Column(name = "before_sold_stock", nullable = false)
    private Integer beforeSoldStock;

    // After state
    @Column(name = "after_total_stock", nullable = false)
    private Integer afterTotalStock;

    @Column(name = "after_reserved_stock", nullable = false)
    private Integer afterReservedStock;

    @Column(name = "after_sold_stock", nullable = false)
    private Integer afterSoldStock;

    // Reference
    @Column(name = "reference_type", length = 50)
    private String referenceType; // ORDER, PURCHASE_ORDER, MANUAL_ADJUSTMENT

    @Column(name = "reference_id", length = 100)
    private String referenceId;

    @Column(name = "order_code", length = 50)
    private String orderCode;

    // Audit
    @Column(name = "reason", columnDefinition = "TEXT")
    private String reason;

    @Column(name = "created_by", length = 100)
    private String createdBy = "SYSTEM";

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
    }

    public enum TransactionType {
        IMPORT,              // Nhập hàng mới
        RESERVE,             // Giữ hàng khi tạo đơn
        RELEASE,             // Hủy giữ hàng
        SALE,                // Xác nhận bán (reserved -> sold)
        RETURN,              // Hoàn hàng
        STOCK_ADJUSTMENT     // Điều chỉnh kho (admin sửa số lượng)
    }
}
