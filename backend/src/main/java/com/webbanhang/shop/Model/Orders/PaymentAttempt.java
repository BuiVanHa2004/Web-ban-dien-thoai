package com.webbanhang.shop.Model.Orders;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "payment_attempts")
@Getter
@Setter
public class PaymentAttempt {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "attempt_id")
    private Integer attemptId;

    @Column(name = "order_id", nullable = false)
    private Integer orderId;

    @Column(name = "payment_method", length = 20)
    private String paymentMethod = "BANK_TRANSFER";


    @Column(name = "status", length = 20)
    private String status = "PENDING";

    @Column(name = "qr_content", length = 255)
    private String qrContent;

    @Column(name = "transfer_image_url", length = 1024)
    private String transferImageUrl;

    @Column(name = "transfer_note", length = 100)
    private String transferNote;

    @Column(name = "customer_confirmed_at")
    private LocalDateTime customerConfirmedAt;

    @Column(name = "amount", precision = 15, scale = 2)
    private BigDecimal amount;

    @Column(name = "transfer_image_hash", length = 255)
    private String transferImageHash;

    @Column(name = "processing_by_admin_id")
    private Integer processingByAdminId;

    @Column(name = "processing_by_admin_name", length = 255)
    private String processingByAdminName;

    @Column(name = "processing_at")
    private LocalDateTime processingAt;

    @Column(name = "lock_expires_at")
    private LocalDateTime lockExpiresAt;

    @Column(name = "is_suspicious")
    private Boolean isSuspicious = false;

    @Column(name = "risk_level", length = 20)
    private String riskLevel = "LOW"; // LOW, MEDIUM, HIGH

    @Column(name = "locked_at")
    private LocalDateTime lockedAt;

    @Column(name = "reviewed_by_admin_id")
    private Integer reviewedByAdminId;

    @Column(name = "reviewed_by_admin_name", length = 255)
    private String reviewedByAdminName;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @Column(name = "reject_reason", length = 500)
    private String rejectReason;

    @Column(name = "archived_at")
    private LocalDateTime archivedAt;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
