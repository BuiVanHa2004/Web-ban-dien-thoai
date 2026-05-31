package com.webbanhang.shop.Model.Orders;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "bank_transactions")
@Getter
@Setter
public class BankTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "transaction_id")
    private Integer transactionId;

    @Column(name = "transaction_code", length = 100)
    private String transactionCode;

    @Column(name = "account_number", length = 50)
    private String accountNumber;

    @Column(name = "bank_name", length = 100)
    private String bankName;

    @Column(name = "amount", precision = 15, scale = 2, nullable = false)
    private BigDecimal amount;

    @Column(name = "transfer_content", length = 255)
    private String transferContent;

    @Column(name = "transfer_time")
    private LocalDateTime transferTime;

    @Column(name = "raw_data", columnDefinition = "TEXT")
    private String rawData;

    @Column(name = "is_matched")
    private Boolean isMatched = false;

    @Column(name = "matched_order_id")
    private Integer matchedOrderId;

    @Column(name = "matched_by_admin_id")
    private Integer matchedByAdminId;

    @Column(name = "payment_attempt_id")
    private Integer paymentAttemptId;

    @Column(name = "reconcile_status", length = 20)
    private String reconcileStatus = "PENDING"; // PENDING, MATCHED, REJECTED

    @Column(name = "rejected_reason", length = 500)
    private String rejectedReason;


    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (isMatched == null) {
            isMatched = false;
        }
    }
}
