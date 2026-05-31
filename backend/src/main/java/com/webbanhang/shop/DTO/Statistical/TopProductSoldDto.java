package com.webbanhang.shop.DTO.Statistical;

public record TopProductSoldDto(
        Integer productId,
        String productName,
        Long quantitySold
) {
}
