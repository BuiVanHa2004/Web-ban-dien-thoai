package com.webbanhang.shop.DTO.Brands;

import java.util.List;

public record BrandCreateUpdateDto(
        String brandName,
        String slug,
        String brandDescription,
        List<String> brandImages
) {
    public BrandCreateUpdateDto {
        if (brandImages == null) {
            brandImages = List.of();
        }
    }
}
