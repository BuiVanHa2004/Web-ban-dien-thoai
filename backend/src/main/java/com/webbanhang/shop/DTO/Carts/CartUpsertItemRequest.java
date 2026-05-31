package com.webbanhang.shop.DTO.Carts;

 import jakarta.validation.constraints.Min;
 import jakarta.validation.constraints.NotNull;

public record CartUpsertItemRequest(
        @NotNull @Min(1) Integer productId,
        Integer productColorId,
        Integer productVariantId,
        @Min(1) Integer quantity
) {
}

