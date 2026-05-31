package com.webbanhang.shop.DTO.Orders;

import com.webbanhang.shop.Model.Orders.Evaluate;
import com.webbanhang.shop.Model.Orders.EvaluateReply;
import com.webbanhang.shop.Model.Orders.OrderItem;

import java.time.Instant;

public record EvaluateDetailDto(
        Integer id,
        Integer productId,
        String customerName,
        String customerEmail,
        Integer rating,
        String content,
        Instant createdAt,
        String adminReply,
        Instant adminRepliedAt,
        String productName,
        String colorName,
        Integer ramGb,
        Integer storageGb,
        Integer quantity
) {
    public static EvaluateDetailDto fromEntity(Evaluate e, EvaluateReply reply) {
        return fromEntity(e, reply, null);
    }

    public static EvaluateDetailDto fromEntity(Evaluate e, EvaluateReply reply, OrderItem orderItem) {
        String customerName = e.getCustomer() != null ? e.getCustomer().getFullName() : null;
        String customerEmail = e.getCustomer() != null ? e.getCustomer().getEmail() : null;
        Integer productId = e.getProduct() != null ? e.getProduct().getProductId() : null;

        String adminReply = null;
        Instant adminRepliedAt = null;
        if (reply != null) {
            adminReply = reply.getReplyContent();
            adminRepliedAt = reply.getCreatedAt();
        }

        // Order item details
        String productName = orderItem != null ? orderItem.getProductName() : null;
        String colorName = orderItem != null ? orderItem.getColorName() : null;
        Integer ramGb = orderItem != null ? orderItem.getRamGb() : null;
        Integer storageGb = orderItem != null ? orderItem.getStorageGb() : null;
        Integer quantity = orderItem != null ? orderItem.getQuantity() : null;

        return new EvaluateDetailDto(
                e.getEvaluateId(),
                productId,
                customerName,
                customerEmail,
                e.getRating(),
                e.getContent(),
                e.getCreatedAt(),
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
