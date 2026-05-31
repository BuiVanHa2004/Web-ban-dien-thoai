package com.webbanhang.shop.DTO.Orders;

import com.webbanhang.shop.Model.Orders.EvaluateImage;

import java.time.Instant;

public record EvaluateImageDto(
        Integer evaluateImageId,
        String imageUrl,
        Instant createdAt
) {
    public static EvaluateImageDto fromEntity(EvaluateImage image) {
        if (image == null) return null;
        return new EvaluateImageDto(
                image.getEvaluateImageId(),
                image.getImageUrl(),
                image.getCreatedAt()
        );
    }
}
