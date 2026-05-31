package com.webbanhang.shop.DTO.Orders;

public record EvaluateProductStatDto(
        Integer productId,
        String productName,
        Long reviewCount,
        Long totalStars,
        String productImageUrl
) {
}
