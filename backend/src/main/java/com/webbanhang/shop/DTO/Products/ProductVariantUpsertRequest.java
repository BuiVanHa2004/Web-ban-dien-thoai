package com.webbanhang.shop.DTO.Products;

import java.math.BigDecimal;

public record ProductVariantUpsertRequest(
        Integer variantId,
        Integer ramGb,
        Integer storageGb,
        Integer quantity,
        BigDecimal originalPrice,
        String discountType,
        BigDecimal discountValue,
        BigDecimal finalPrice
) {
}
