package com.webbanhang.shop.Model.Carts;

import com.webbanhang.shop.Model.Products.Product;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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

@Entity
@Table(name = "cart_items")
@Getter
@Setter
public class CartItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "cart_item_id")
    private Integer cartItemId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cart_id", nullable = false)
    private Cart cart;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(name = "product_color_id")
    private Integer productColorId;

    @Column(name = "variant_id")
    private Integer productVariantId;

    @Column(name = "quantity", nullable = false)
    private Integer quantity = 1;

    @PrePersist
    protected void onCreate() {
        if (this.quantity == null || this.quantity < 1) this.quantity = 1;
    }

    @PreUpdate
    protected void onUpdate() {
        if (this.quantity == null || this.quantity < 1) this.quantity = 1;
    }
}

