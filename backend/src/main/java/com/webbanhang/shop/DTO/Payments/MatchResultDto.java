package com.webbanhang.shop.DTO.Payments;

public record MatchResultDto(
        Integer transactionId,
        Integer orderId,
        String orderCode,
        String action
) {
}
