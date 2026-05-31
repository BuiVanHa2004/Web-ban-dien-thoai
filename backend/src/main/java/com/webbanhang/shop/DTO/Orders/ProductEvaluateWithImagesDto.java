package com.webbanhang.shop.DTO.Orders;

import com.webbanhang.shop.Model.Orders.Evaluate;
import com.webbanhang.shop.Model.Orders.EvaluateImage;
import com.webbanhang.shop.Model.Orders.EvaluateReply;
import com.webbanhang.shop.Model.Orders.OrderItem;

import java.time.Instant;
import java.util.List;

public record ProductEvaluateWithImagesDto(
        Integer evaluateId,
        Integer productId,
        String customerName,
        Integer rating,
        String content,
        Instant createdAt,
        List<EvaluateImageDto> images,
        String adminReply,
        Instant adminRepliedAt,
        String productName,
        String colorName,
        Integer ramGb,
        Integer storageGb,
        Integer quantity
) {
    public static ProductEvaluateWithImagesDto fromEntity(Evaluate evaluate, List<EvaluateImage> images) {
        return fromEntity(evaluate, images, null, null);
    }

    public static ProductEvaluateWithImagesDto fromEntity(Evaluate evaluate, List<EvaluateImage> images, EvaluateReply reply) {
        return fromEntity(evaluate, images, reply, null);
    }

    public static ProductEvaluateWithImagesDto fromEntity(Evaluate evaluate, List<EvaluateImage> images, EvaluateReply reply, OrderItem orderItem) {
        Integer productId = evaluate.getProduct() != null ? evaluate.getProduct().getProductId() : null;
        String customerName = evaluate.getCustomer() != null ? evaluate.getCustomer().getFullName() : null;
        List<EvaluateImageDto> imageDtos = images != null
                ? images.stream().map(EvaluateImageDto::fromEntity).toList()
                : List.of();
        String adminReply = reply != null ? reply.getReplyContent() : null;
        Instant adminRepliedAt = reply != null ? reply.getCreatedAt() : null;
        
        // Order item details
        String productName = orderItem != null ? orderItem.getProductName() : null;
        String colorName = orderItem != null ? orderItem.getColorName() : null;
        Integer ramGb = orderItem != null ? orderItem.getRamGb() : null;
        Integer storageGb = orderItem != null ? orderItem.getStorageGb() : null;
        Integer quantity = orderItem != null ? orderItem.getQuantity() : null;
        
        return new ProductEvaluateWithImagesDto(
                evaluate.getEvaluateId(),
                productId,
                customerName,
                evaluate.getRating(),
                evaluate.getContent(),
                evaluate.getCreatedAt(),
                imageDtos,
                adminReply,
                adminRepliedAt,
                productName,
                colorName,
                ramGb,
                storageGb,
                quantity
        );
    }
}
