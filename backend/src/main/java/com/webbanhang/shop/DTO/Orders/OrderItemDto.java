package com.webbanhang.shop.DTO.Orders;

import com.webbanhang.shop.Model.Orders.OrderItem;

import java.math.BigDecimal;

public record OrderItemDto(
        Integer orderItemId,
        Integer productId,
        Integer variantId,
        String productName,
        BigDecimal productPrice,
        BigDecimal originalPrice,
        Integer ramGb,
        Integer storageGb,
        String colorName,
        Integer quantity,
        String imageUrl
) {
    public static OrderItemDto fromEntity(OrderItem it) {
        return new OrderItemDto(
                it.getOrderItemId(),
                it.getProductId(),
                it.getVariantId(),
                it.getProductName(),
                it.getProductPrice(),
                it.getOriginalPrice(),
                it.getRamGb(),
                it.getStorageGb(),
                it.getColorName(),
                it.getQuantity(),
                it.getImageUrl()
        );
    }
}
