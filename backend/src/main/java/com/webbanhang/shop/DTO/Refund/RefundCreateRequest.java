package com.webbanhang.shop.DTO.Refund;

import com.webbanhang.shop.Model.Refunds.RefundMethod;
import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
public class RefundCreateRequest {

    @NotNull(message = "Order ID is required")
    private Integer orderId;

    @NotNull(message = "Refund amount is required")
    @DecimalMin(value = "0.01", message = "Refund amount must be greater than 0")
    private BigDecimal refundAmount;

    @NotNull(message = "Is full refund flag is required")
    private Boolean isFullRefund;

    @NotNull(message = "Refund method is required")
    private RefundMethod refundMethod;

    @Size(max = 500, message = "Refund reason must not exceed 500 characters")
    private String refundReason;

    // Bank account (conditional - required if method = BANK_TRANSFER)
    @Size(max = 100, message = "Bank name must not exceed 100 characters")
    private String customerBankName;

    @Size(max = 20, message = "Bank code must not exceed 20 characters")
    private String customerBankCode;

    @Pattern(regexp = "^[0-9]{8,20}$", message = "Account number must be 8-20 digits")
    private String customerAccountNumber;

    @Size(max = 255, message = "Account holder must not exceed 255 characters")
    private String customerAccountHolder;

    // Idempotency
    @Size(max = 64, message = "Idempotency key must not exceed 64 characters")
    private String idempotencyKey;

    // Security
    private String requestIpAddress;
    private String requestUserAgent;
}
