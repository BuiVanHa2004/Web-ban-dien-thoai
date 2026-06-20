package com.webbanhang.shop.DTO.Payments;

import com.webbanhang.shop.Model.Orders.PaymentAttempt;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record PaymentAttemptDto(
        Integer attemptId,
        Integer orderId,
        String paymentMethod,
        String status,
        String qrContent,
        BigDecimal amount,
        String transferImageUrl,
        String transferNote,
        LocalDateTime customerConfirmedAt,
        LocalDateTime createdAt,
        Integer reviewedByAdminId,
        String reviewedByAdminName,
        LocalDateTime reviewedAt,
        String rejectReason,
        String riskLevel,
        Boolean isSuspicious
) {
    public static PaymentAttemptDto fromEntity(PaymentAttempt attempt) {
        return new PaymentAttemptDto(
                attempt.getAttemptId(),
                attempt.getOrderId(),
                attempt.getPaymentMethod(),
                attempt.getStatus(),
                attempt.getQrContent(),
                attempt.getAmount(),
                attempt.getTransferImageUrl(),
                attempt.getTransferNote(),
                attempt.getCustomerConfirmedAt(),
                attempt.getCreatedAt(),
                attempt.getReviewedByAdminId(),
                attempt.getReviewedByAdminName(),
                attempt.getReviewedAt(),
                attempt.getRejectReason(),
                attempt.getRiskLevel(),
                attempt.getIsSuspicious()
        );
    }
}
