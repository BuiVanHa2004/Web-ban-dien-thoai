package com.webbanhang.shop.Model.Orders;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Entity
@Table(name = "order_items")
@Getter
@Setter
public class OrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "order_item_id")
    private Integer orderItemId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    @Column(name = "product_id", nullable = false)
    private Integer productId;

    @Column(name = "variant_id", nullable = false)
    private Integer variantId;

    @Column(name = "product_name", length = 255)
    private String productName;  // ✅ SNAPSHOT: Product name at order time

    @Column(name = "product_price", precision = 15, scale = 2)
    private BigDecimal productPrice;  // ✅ SNAPSHOT: Final price (after discount) at order time

    @Column(name = "original_price", precision = 15, scale = 2)
    private BigDecimal originalPrice;  // ✅ SNAPSHOT: Original price before discount

    @Column(name = "ram_gb")
    private Integer ramGb;  // ✅ SNAPSHOT: RAM specification

    @Column(name = "storage_gb")
    private Integer storageGb;  // ✅ SNAPSHOT: Storage specification

    @Column(name = "color_name", length = 100)
    private String colorName;  // ✅ SNAPSHOT: Color name

    @Column(name = "quantity")
    private Integer quantity = 1;  // ✅ SNAPSHOT: Quantity ordered

    @Column(name = "product_image", length = 1024)
    private String productImage;  // ✅ SNAPSHOT: Product image URL (legacy)

    @Column(name = "image_url", length = 500)
    private String imageUrl;  // ✅ SNAPSHOT: Image URL at order time

    @Column(name = "created_at")
    private java.time.LocalDateTime createdAt;

    @Column(name = "updated_at")
    private java.time.LocalDateTime updatedAt;

    @jakarta.persistence.PrePersist
    protected void onCreate() {
        this.createdAt = java.time.LocalDateTime.now();
        this.updatedAt = java.time.LocalDateTime.now();
    }

    @jakarta.persistence.PreUpdate
    protected void onUpdate() {
        this.updatedAt = java.time.LocalDateTime.now();
    }
}

