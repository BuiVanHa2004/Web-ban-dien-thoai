package com.webbanhang.shop.DTO.Orders;

import com.fasterxml.jackson.annotation.JsonAlias;
 import jakarta.validation.constraints.Min;
 import jakarta.validation.constraints.NotNull;

public record CreateOrderItemRequest(
        @JsonAlias({"productId", "product_id"})
        Integer productId,
        @JsonAlias({"variantId", "variant_id", "productVariantId", "product_variant_id"})
        @NotNull Integer variantId,
        @JsonAlias({"colorName", "color_name"})
        String colorName,
        @Min(1) Integer quantity,
        @JsonAlias({"imageUrl", "image_url"})
        String imageUrl
) {
}
