package com.webbanhang.shop.DTO.Products;

import com.webbanhang.shop.Model.Products.ProductVariant;

import java.math.BigDecimal;

public record ProductVariantDto(
        Integer variantId,
        Integer ramGb,
        Integer storageGb,
        Integer quantity,
        BigDecimal originalPrice,
        String discountType,
        BigDecimal discountValue,
        BigDecimal finalPrice
) {
    public static ProductVariantDto fromEntity(ProductVariant v) {
        return new ProductVariantDto(
                v.getVariantId(),
                v.getRamGb(),
                v.getStorageGb(),
                v.getQuantity(),
                v.getOriginalPrice(),
                v.getDiscountType() != null ? v.getDiscountType().name() : null,
                v.getDiscountValue(),
                v.getFinalPrice()
        );
    }
}
