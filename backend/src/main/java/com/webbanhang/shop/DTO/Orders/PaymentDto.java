package com.webbanhang.shop.DTO.Orders;

import com.webbanhang.shop.Model.Orders.Payment;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDateTime;

public record PaymentDto(
        Integer paymentId,
        Integer orderId,
        String orderCode,
        Integer customerId,
        String customerName,
        String paymentMethod,
        String paymentStatus,
        BigDecimal amount,
        String transactionCode,
        LocalDateTime paidAt,
        LocalDateTime deletedAt,
        Boolean isDeleted,
        Instant createdAt,
        Instant updatedAt
) {
    public static PaymentDto fromEntity(Payment p, String customerName) {
        return new PaymentDto(
                p.getPaymentId(),
                p.getOrderId(),
                p.getOrderCode(),
                p.getCustomerId(),
                customerName,
                p.getPaymentMethod(),
                p.getPaymentStatus() != null ? p.getPaymentStatus().name() : null,
                p.getAmount(),
                p.getTransactionCode(),
                p.getPaidAt(),
                p.getDeletedAt(),
                p.getIsDeleted(),
                p.getCreatedAt(),
                p.getUpdatedAt()
        );
    }
}
