package com.webbanhang.shop.DTO.Orders;

public record UpsertCustomerEvaluateRequest(
        Integer customerId,
        Integer productId,
        Integer rating,
        String content
) {
}
