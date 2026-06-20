package com.webbanhang.shop.Model.Refunds;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "refunds")
@Getter
@Setter
public class Refund {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "refund_id")
    private Integer refundId;

    @Column(name = "refund_code", length = 50, unique = true)
    private String refundCode;

    // Foreign Keys
    @Column(name = "order_id", nullable = false)
    private Integer orderId;

    @Column(name = "customer_id", nullable = false)
    private Integer customerId;

    @Column(name = "payment_id")
    private Integer paymentId;  // Note: payments table has order_id FK, not other way around

    // Status
    @Enumerated(EnumType.STRING)
    @Column(name = "refund_status", nullable = false)
    private RefundStatus refundStatus = RefundStatus.PENDING_INFO;

    // Amounts
    @Column(name = "refund_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal refundAmount;

    @Column(name = "order_total_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal orderTotalAmount;

    @Column(name = "is_full_refund")
    private Boolean isFullRefund = true;

    // Refund method
    @Enumerated(EnumType.STRING)
    @Column(name = "refund_method", nullable = false)
    private RefundMethod refundMethod = RefundMethod.BANK_TRANSFER;

    // Bank account
    @Column(name = "customer_bank_name", length = 100)
    private String customerBankName;

    @Column(name = "customer_bank_code", length = 20)
    private String customerBankCode;

    @Column(name = "customer_account_number", length = 50)
    private String customerAccountNumber;

    @Column(name = "customer_account_holder")
    private String customerAccountHolder;

    // Receipt
    @Column(name = "receipt_image_key")
    private String receiptImageKey;

    @Column(name = "receipt_uploaded_at")
    private LocalDateTime receiptUploadedAt;

    @Column(name = "receipt_uploaded_by_admin_id")
    private Integer receiptUploadedByAdminId;

    // Reasons
    @Column(name = "refund_reason", length = 500)
    private String refundReason;

    @Column(name = "reject_reason", length = 500)
    private String rejectReason;

    // Admin actions - APPROVED
    @Column(name = "approved_by_admin_id")
    private Integer approvedByAdminId;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @Column(name = "approved_by_admin_name")
    private String approvedByAdminName;

    // Admin actions - PROCESSED
    @Column(name = "processed_by_admin_id")
    private Integer processedByAdminId;

    @Column(name = "processed_at")
    private LocalDateTime processedAt;

    @Column(name = "processed_by_admin_name")
    private String processedByAdminName;

    // Admin actions - COMPLETED
    @Column(name = "completed_by_admin_id")
    private Integer completedByAdminId;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "completed_by_admin_name")
    private String completedByAdminName;

    // Admin actions - REJECTED
    @Column(name = "rejected_by_admin_id")
    private Integer rejectedByAdminId;

    @Column(name = "rejected_at")
    private LocalDateTime rejectedAt;

    @Column(name = "rejected_by_admin_name")
    private String rejectedByAdminName;

    // Admin actions - FAILED
    @Column(name = "failed_at")
    private LocalDateTime failedAt;

    @Column(name = "failed_by_admin_id")
    private Integer failedByAdminId;

    @Column(name = "failed_by_admin_name")
    private String failedByAdminName;

    @Column(name = "failed_reason", length = 500)
    private String failedReason;

    // Admin actions - ON_HOLD
    @Column(name = "on_hold_at")
    private LocalDateTime onHoldAt;

    @Column(name = "on_hold_by_admin_id")
    private Integer onHoldByAdminId;

    @Column(name = "on_hold_by_admin_name")
    private String onHoldByAdminName;

    @Column(name = "on_hold_reason", length = 500)
    private String onHoldReason;

    // Optimistic locking
    @Version
    @Column(name = "version", nullable = false)
    private Integer version = 0;

    // Idempotency
    @Column(name = "idempotency_key", length = 64, unique = true)
    private String idempotencyKey;

    // Policies
    @Column(name = "refund_deadline")
    private LocalDateTime refundDeadline;

    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    // Security
    @Column(name = "request_ip_address", length = 45)
    private String requestIpAddress;

    @Column(name = "request_user_agent", columnDefinition = "TEXT")
    private String requestUserAgent;

    // Soft delete - SHOULD FIX #5
    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @Column(name = "deleted_by_admin_id")
    private Integer deletedByAdminId;

    @Column(name = "deleted_reason")
    private String deletedReason;

    // Timestamps
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
