package com.webbanhang.shop.DTO.Orders;

import com.webbanhang.shop.Model.Orders.Evaluate;
import com.webbanhang.shop.Model.Orders.EvaluateImage;
import com.webbanhang.shop.Model.Orders.EvaluateReply;

import java.time.Instant;
import java.util.List;

public record CustomerEvaluateDto(
        Integer evaluateId,
        Integer orderItemId,
        Integer productId,
        Integer customerId,
        Integer rating,
        String content,
        Instant createdAt,
        List<EvaluateImageDto> images,
        String adminReply,
        Instant adminRepliedAt
) {
    public static CustomerEvaluateDto fromEntity(Evaluate evaluate) {
        return fromEntity(evaluate, List.of(), null);
    }

    public static CustomerEvaluateDto fromEntity(Evaluate evaluate, List<EvaluateImage> images) {
        return fromEntity(evaluate, images, null);
    }

    public static CustomerEvaluateDto fromEntity(Evaluate evaluate, List<EvaluateImage> images, EvaluateReply reply) {
        Integer productId = evaluate.getProduct() != null ? evaluate.getProduct().getProductId() : null;
        Integer customerId = evaluate.getCustomer() != null ? evaluate.getCustomer().getCustomerId() : null;
        List<EvaluateImageDto> imageDtos = images != null
                ? images.stream().map(EvaluateImageDto::fromEntity).toList()
                : List.of();
        String adminReply = reply != null ? reply.getReplyContent() : null;
        Instant adminRepliedAt = reply != null ? reply.getCreatedAt() : null;
        return new CustomerEvaluateDto(
                evaluate.getEvaluateId(),
                evaluate.getOrderItemId(),
                productId,
                customerId,
                evaluate.getRating(),
                evaluate.getContent(),
                evaluate.getCreatedAt(),
                imageDtos,
                adminReply,
                adminRepliedAt
        );
    }
}
