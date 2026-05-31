package com.webbanhang.shop.Model.Auth;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.Index;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(
        name = "password_reset_codes",
        indexes = {
                @Index(name = "idx_prc_email_created", columnList = "email,created_at"),
                @Index(name = "idx_prc_expires_at", columnList = "expires_at"),
                @Index(name = "idx_prc_used_at", columnList = "used_at")
        }
)
@Getter
@Setter
public class PasswordResetCode {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "email", length = 255, nullable = false)
    private String email;

    @Column(name = "code_hash", length = 255, nullable = false)
    private String codeHash;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "verified_at")
    private Instant verifiedAt;

    @Column(name = "used_at")
    private Instant usedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = Instant.now();
    }
}
