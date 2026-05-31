package com.webbanhang.shop.DTO.Products;

import java.util.List;

public record ProductUpsertRequest(
        String productName,
        String slug,
        Integer categoryId,
        Integer brandId,
        String productType,
        String productDescribe,
        List<String> productImages,
        List<ProductColorUpsertRequest> productColors,
        ProductSpecUpsertRequest productSpec
) {
}
