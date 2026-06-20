package com.webbanhang.shop.DTO.Refund;

import com.webbanhang.shop.Model.Refunds.RefundMethod;
import com.webbanhang.shop.Model.Refunds.RefundStatus;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
public class RefundResponse {

    private Integer refundId;
    private String refundCode;
    private Integer orderId;
    private Integer customerId;
    private Integer paymentId;

    private RefundStatus refundStatus;
    private BigDecimal refundAmount;
    private BigDecimal orderTotalAmount;
    private Boolean isFullRefund;

    private RefundMethod refundMethod;
    private String customerBankName;
    private String customerBankCode;
    private String customerAccountNumber;
    private String customerAccountHolder;

    private String receiptImageKey;
    private LocalDateTime receiptUploadedAt;

    private String refundReason;
    private String rejectReason;

    // Admin actions
    private Integer approvedByAdminId;
    private LocalDateTime approvedAt;
    private String approvedByAdminName;

    private Integer processedByAdminId;
    private LocalDateTime processedAt;
    private String processedByAdminName;

    private Integer completedByAdminId;
    private LocalDateTime completedAt;
    private String completedByAdminName;

    private Integer rejectedByAdminId;
    private LocalDateTime rejectedAt;
    private String rejectedByAdminName;

    private LocalDateTime failedAt;
    private Integer failedByAdminId;
    private String failedByAdminName;
    private String failedReason;

    private LocalDateTime onHoldAt;
    private Integer onHoldByAdminId;
    private String onHoldByAdminName;
    private String onHoldReason;

    private LocalDateTime refundDeadline;
    private LocalDateTime expiresAt;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
