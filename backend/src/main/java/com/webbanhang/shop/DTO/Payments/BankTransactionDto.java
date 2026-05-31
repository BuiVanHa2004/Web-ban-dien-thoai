package com.webbanhang.shop.DTO.Payments;

import com.webbanhang.shop.Model.Orders.BankTransaction;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record BankTransactionDto(
        Integer transactionId,
        String transactionCode,
        String accountNumber,
        String bankName,
        BigDecimal amount,
        String transferContent,
        LocalDateTime transferTime,
        String rawData,
        Boolean isMatched,
        Integer matchedOrderId,
        String matchedOrderCode,
        Integer matchedByAdminId,
        String matchedByAdminName,
        LocalDateTime createdAt,
        LocalDateTime deletedAt,
        String reconcileStatus
) {
    public static BankTransactionDto fromEntity(BankTransaction tx) {
        return fromEntity(tx, null, null);
    }

    public static BankTransactionDto fromEntity(BankTransaction tx, String adminName, String orderCode) {
        return new BankTransactionDto(
                tx.getTransactionId(),
                tx.getTransactionCode(),
                tx.getAccountNumber(),
                tx.getBankName(),
                tx.getAmount(),
                tx.getTransferContent(),
                tx.getTransferTime(),
                tx.getRawData(),
                tx.getIsMatched(),
                tx.getMatchedOrderId(),
                orderCode,
                tx.getMatchedByAdminId(),
                adminName,
                tx.getCreatedAt(),
                tx.getDeletedAt(),
                tx.getReconcileStatus()
        );
    }
}
