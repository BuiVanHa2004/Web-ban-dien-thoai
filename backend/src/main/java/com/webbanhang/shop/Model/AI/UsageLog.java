package com.webbanhang.shop.Model.AI;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "usage_logs")
@Getter
@Setter
public class UsageLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id")
    private Integer userId;

    @Column(name = "guest_session_id", length = 128)
    private String guestSessionId;

    @Column(name = "ip_hash", length = 128, nullable = false)
    private String ipHash;

    @Column(name = "action", length = 50, nullable = false)
    private String action;

    @Column(name = "request_tokens_est")
    private Integer requestTokensEst;

    @Column(name = "response_tokens")
    private Integer responseTokens;

    @Column(name = "cost_usd", precision = 12, scale = 6)
    private BigDecimal costUsd;

    @Column(name = "status", length = 30, nullable = false)
    private String status;

    @Lob
    @Column(name = "metadata", columnDefinition = "LONGTEXT")
    private String metadata;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = Instant.now();
    }
}
