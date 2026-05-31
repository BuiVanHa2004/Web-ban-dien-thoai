package com.webbanhang.shop.DTO.Carts;

import java.math.BigDecimal;

public record CartItemDto(
        Integer productId,
        String productName,
        BigDecimal price,
        Integer quantity,
        Integer productColorId,
        Integer productVariantId,
        Integer ramGb,
        Integer storageGb,
        String colorName,
        String imageUrl
) {
}

