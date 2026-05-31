package com.webbanhang.shop.DTO.Payments;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record AdminCreateBankTransactionRequest(
        String transactionCode,
        String accountNumber,
        String bankName,
        BigDecimal amount,
        String transferContent,
        LocalDateTime transferTime,
        String rawData
) {
}
