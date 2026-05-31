package com.webbanhang.shop.DTO.Products;

import java.util.List;

public record ProductColorUpsertRequest(
        Integer productColorId,
        String colorName,
        String colorCode,
        List<String> images,
        List<ProductVariantUpsertRequest> variants
) {
}
