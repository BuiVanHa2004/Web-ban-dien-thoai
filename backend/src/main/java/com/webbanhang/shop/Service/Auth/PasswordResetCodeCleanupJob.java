package com.webbanhang.shop.Service.Auth;

import com.webbanhang.shop.Repository.Auth.PasswordResetCodeRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;

import org.springframework.transaction.annotation.Transactional;

@Component
public class PasswordResetCodeCleanupJob {

    private final PasswordResetCodeRepository passwordResetCodeRepository;

    public PasswordResetCodeCleanupJob(PasswordResetCodeRepository passwordResetCodeRepository) {
        this.passwordResetCodeRepository = passwordResetCodeRepository;
    }

    @Scheduled(fixedDelayString = "${password-reset.cleanup.fixed-delay-ms:3600000}")
    @Transactional
    public void cleanup() {
        Instant now = Instant.now();

        // Remove expired codes
        passwordResetCodeRepository.deleteByExpiresAtBefore(now);

        // Remove used codes after retention window
        Instant usedCutoff = now.minus(Duration.ofDays(7));
        passwordResetCodeRepository.deleteByUsedAtBefore(usedCutoff);
    }
}
