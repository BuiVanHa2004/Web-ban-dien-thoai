package com.webbanhang.shop.DTO.Carts;

import java.math.BigDecimal;

public record CartItemDto(
        Integer productId,
        String productName,
        BigDecimal price,              // Giá sau khi giảm (final_price)
        BigDecimal originalPrice,      // Giá gốc (original_price)
        String discountType,           // Loại giảm giá: PERCENTAGE, FIXED, NONE
        BigDecimal discountValue,      // Giá trị giảm (15 cho 15%, hoặc số tiền)
        Integer quantity,
        Integer productColorId,
        Integer productVariantId,
        Integer ramGb,
        Integer storageGb,
        String colorName,
        String imageUrl
) {
}

