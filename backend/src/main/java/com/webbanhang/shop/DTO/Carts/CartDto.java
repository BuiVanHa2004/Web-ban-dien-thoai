package com.webbanhang.shop.DTO.Carts;

import java.util.List;

public record CartDto(
        Integer customerId,
        List<CartItemDto> items,
        Integer totalQuantity
) {
}

