package com.webbanhang.shop.Repository.Auth;

import com.webbanhang.shop.Model.Auth.PasswordResetCode;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.Optional;

public interface PasswordResetCodeRepository extends JpaRepository<PasswordResetCode, Long> {

    Optional<PasswordResetCode> findFirstByEmailAndUsedAtIsNullAndExpiresAtAfterOrderByCreatedAtDesc(
            String email,
            Instant now
    );

    Optional<PasswordResetCode> findFirstByEmailOrderByCreatedAtDesc(String email);

    long countByEmailAndCreatedAtAfter(String email, Instant after);

    long deleteByExpiresAtBefore(Instant now);

    long deleteByUsedAtBefore(Instant cutoff);
}
