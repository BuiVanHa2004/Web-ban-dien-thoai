package com.webbanhang.shop.Model.Products;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "product_variants")
@Getter
@Setter
public class ProductVariant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "variant_id")
    private Integer variantId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_color_id", nullable = false)
    private ProductColor productColor;

    @Column(name = "ram_gb", nullable = false)
    private Integer ramGb;

    @Column(name = "storage_gb", nullable = false)
    private Integer storageGb;

    @Column(name = "quantity", nullable = false)
    private Integer quantity = 0; // ❌ DEPRECATED: Use totalStock instead

    // New inventory management columns
    @Column(name = "total_stock", nullable = false)
    private Integer totalStock = 0;

    @Column(name = "reserved_stock", nullable = false)
    private Integer reservedStock = 0;

    @Column(name = "sold_stock", nullable = false)
    private Integer soldStock = 0;
    
    /**
     * ⚠️ DEPRECATED: Use reservedStock instead
     * Kept for backward compatibility only
     */
    @Deprecated
    @Column(name = "reserved_quantity", nullable = false)
    private Integer reservedQuantity = 0;

    @jakarta.persistence.Version
    @Column(name = "version", nullable = false)
    private Integer version = 0;
    
    /**
     * ✅ COMPUTED FIELD: Available stock for sale
     * This should NEVER be stored in database
     * 
     * Formula: available_stock = total_stock - reserved_stock (NOT subtracting sold_stock)
     * 
     * Logic:
     * - total_stock: Tổng hàng trong kho vật lý
     * - reserved_stock: Hàng đang được giữ cho đơn hàng chờ xử lý
     * - sold_stock: Hàng đã bán (chỉ để thống kê, KHÔNG ảnh hưởng available)
     * 
     * Khi RESERVE: reserved_stock tăng → available giảm
     * Khi CONFIRM SALE: reserved_stock giảm, sold_stock tăng → available không đổi
     * Khi RELEASE: reserved_stock giảm → available tăng
     * 
     * @return Available quantity that can be reserved for new orders
     */
    @jakarta.persistence.Transient
    public Integer getAvailableStock() {
        // ✅ CORRECT: available = total - reserved (sold_stock là số liệu thống kê)
        return Math.max(0, totalStock - reservedStock);
    }

    @Column(name = "original_price", nullable = false, precision = 15, scale = 2)
    private BigDecimal originalPrice;

    @Enumerated(EnumType.STRING)
    @Column(name = "discount_type")
    private DiscountType discountType = DiscountType.NONE;

    @Column(name = "discount_value", precision = 15, scale = 2)
    private BigDecimal discountValue = BigDecimal.ZERO;

    @Column(name = "final_price", nullable = false, precision = 15, scale = 2)
    private BigDecimal finalPrice;

    @Column(name = "created_at")
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    @PrePersist
    protected void onCreate() {
        Instant now = Instant.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = Instant.now();
    }
}
