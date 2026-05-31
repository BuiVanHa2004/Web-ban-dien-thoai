package com.webbanhang.shop.DTO.Products;

import com.webbanhang.shop.Model.Products.ProductColor;

import java.util.List;

public record ProductColorDto(
        Integer productColorId,
        String colorName,
        String colorCode,
        List<String> images,
        List<ProductVariantDto> variants
) {
    public static ProductColorDto fromEntity(ProductColor c) {
        return new ProductColorDto(
                c.getProductColorId(),
                c.getColorName(),
                c.getColorCode(),
                c.getColorImages() == null ? List.of() : c.getColorImages().stream().map(i -> i.getImageUrl()).toList(),
                c.getVariants() == null ? List.of() : c.getVariants().stream().map(ProductVariantDto::fromEntity).toList()
        );
    }
}
