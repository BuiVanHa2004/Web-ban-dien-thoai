package com.webbanhang.shop.DTO.Categories;

import java.math.BigDecimal;
import java.util.List;

public record CategoryUpsertRequest(
        String categoryName,
        String slug,
        String categoryDescription,
        List<String> categoryImages,
        BigDecimal priceSegmentMin,
        BigDecimal priceSegmentMax
) {
}
