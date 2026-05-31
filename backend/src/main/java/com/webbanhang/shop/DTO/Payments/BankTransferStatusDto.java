package com.webbanhang.shop.DTO.Payments;

public record BankTransferStatusDto(
        Integer orderId,
        String orderCode,
        String orderStatus,
        String paymentStatus,
        String paymentMethod,
        PaymentAttemptDto latestAttempt,
        BankTransactionDto matchedTransaction
) {
}
