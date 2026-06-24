package com.webbanhang.shop.DTO.Products;

import com.webbanhang.shop.Model.Products.ProductVariant;

import java.math.BigDecimal;

public record ProductVariantDto(
        Integer variantId,
        Integer ramGb,
        Integer storageGb,
        Integer quantity,
        Integer availableStock,
        Integer reservedStock,
        Integer soldStock,
        BigDecimal originalPrice,
        String discountType,
        BigDecimal discountValue,
        BigDecimal finalPrice
) {
    public static ProductVariantDto fromEntity(ProductVariant v) {
        // ✅ FIXED: Calculate available stock correctly
        // Formula: available = total - reserved (NOT subtracting sold)
        // sold_stock is for statistics only, doesn't affect availability
        int totalStock = v.getTotalStock() != null ? v.getTotalStock() : 0;
        int reserved = v.getReservedStock() != null ? v.getReservedStock() : 0;
        int sold = v.getSoldStock() != null ? v.getSoldStock() : 0;
        
        // ✅ CORRECT FORMULA: available = total - reserved
        int available = Math.max(0, totalStock - reserved);
        
        return new ProductVariantDto(
                v.getVariantId(),
                v.getRamGb(),
                v.getStorageGb(),
                v.getQuantity(), // ❌ DEPRECATED: Keep for backward compatibility only
                available, // ✅ Real available stock for display
                reserved,
                sold,
                v.getOriginalPrice(),
                v.getDiscountType() != null ? v.getDiscountType().name() : null,
                v.getDiscountValue(),
                v.getFinalPrice()
        );
    }
}
