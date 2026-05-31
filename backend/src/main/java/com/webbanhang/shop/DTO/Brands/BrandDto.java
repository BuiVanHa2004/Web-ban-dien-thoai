package com.webbanhang.shop.DTO.Brands;

import com.webbanhang.shop.Model.Brands.Brand;
import com.webbanhang.shop.Model.Brands.BrandImage;

import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;

public record BrandDto(
        Integer brandId,
        String brandName,
        String slug,
        String brandDescription,
        List<String> brandImages,
        Instant createdAt,
        Instant updatedAt,
        Instant deletedAt
) {
    public static BrandDto fromEntity(Brand brand) {
        List<String> imageUrls = brand.getBrandImages() != null
                ? brand.getBrandImages().stream()
                    .sorted((a, b) -> Integer.compare(a.getSortOrder(), b.getSortOrder()))
                    .map(BrandImage::getImageUrl)
                    .collect(Collectors.toList())
                : List.of();
        
        return new BrandDto(
                brand.getBrandId(),
                brand.getBrandName(),
                brand.getSlug(),
                brand.getBrandDescription(),
                imageUrls,
                brand.getCreatedAt(),
                brand.getUpdatedAt(),
                brand.getDeletedAt()
        );
    }
}
