package com.webbanhang.shop.Model.Inventory;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Audit log cho mọi thay đổi về inventory
 */
@Entity
@Table(name = "order_stock_logs")
@Getter
@Setter
public class OrderStockLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "log_id")
    private Integer logId;

    @Column(name = "order_id", nullable = true)
    private Integer orderId;

    @Column(name = "order_code", length = 50)
    private String orderCode;

    @Column(name = "variant_id", nullable = false)
    private Integer variantId;

    @Column(name = "quantity", nullable = false)
    private Integer quantity;

    @Enumerated(EnumType.STRING)
    @Column(name = "action", nullable = false, length = 20)
    private StockAction action;

    @Column(name = "previous_total")
    private Integer previousTotal;

    @Column(name = "previous_reserved")
    private Integer previousReserved;

    @Column(name = "previous_sold")
    private Integer previousSold;

    @Column(name = "new_total")
    private Integer newTotal;

    @Column(name = "new_reserved")
    private Integer newReserved;

    @Column(name = "new_sold")
    private Integer newSold;

    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    public enum StockAction {
        RESERVE,    // Reserve stock khi tạo order
        RELEASE,    // Release stock khi hủy order (chưa trừ kho)
        CONFIRM,    // Confirm sale khi thanh toán/giao hàng (trừ kho thực sự)
        RESTORE,    // Restore stock khi hủy order sau khi đã trừ kho (hoàn hàng)
        ADJUST      // Manual adjustment by admin
    }
}
