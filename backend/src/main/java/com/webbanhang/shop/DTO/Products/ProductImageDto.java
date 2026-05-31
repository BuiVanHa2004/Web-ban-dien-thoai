package com.webbanhang.shop.DTO.Products;

import com.webbanhang.shop.Model.Products.ProductImage;

import java.time.Instant;

public record ProductImageDto(
        Integer productImageId,
        String imageUrl,
        Boolean isThumbnail,
        Integer sortOrder,
        Instant createdAt
) {
    public static ProductImageDto fromEntity(ProductImage img) {
        if (img == null) return null;
        return new ProductImageDto(
                img.getProductImageId(),
                img.getImageUrl(),
                img.getIsThumbnail(),
                img.getSortOrder(),
                img.getCreatedAt()
        );
    }
}
