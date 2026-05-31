package com.webbanhang.shop.Model.Orders;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "payment_logs")
@Getter
@Setter
public class PaymentLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "log_id")
    private Long logId;

    @Column(name = "order_id")
    private Integer orderId;

    @Column(name = "payment_id")
    private Integer paymentId;

    @Column(name = "payment_attempt_id")
    private Integer paymentAttemptId;

    @Column(name = "transaction_id")
    private Integer transactionId;

    @Column(name = "admin_id")
    private Integer adminId;

    @Column(name = "admin_name", length = 255)
    private String adminName;

    @Column(name = "action_type", nullable = false, length = 50)
    private String actionType;

    @Column(name = "old_status", length = 50)
    private String oldStatus;

    @Column(name = "new_status", length = 50)
    private String newStatus;

    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    @Column(name = "ip_address", length = 100)
    private String ipAddress;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
