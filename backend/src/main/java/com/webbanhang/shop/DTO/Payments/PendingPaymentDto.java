package com.webbanhang.shop.DTO.Payments;

import java.math.BigDecimal;
import java.time.Instant;

public record PendingPaymentDto(
    Integer paymentId,
    Integer orderId,
    String orderCode,
    Integer customerId,
    String paymentMethod,
    String paymentStatus,
    BigDecimal amount,
    Instant createdAt,
    String transferNote
) {
}
