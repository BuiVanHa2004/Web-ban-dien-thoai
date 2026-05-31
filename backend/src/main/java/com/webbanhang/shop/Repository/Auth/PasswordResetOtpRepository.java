package com.webbanhang.shop.Repository.Auth;

import com.webbanhang.shop.Model.Auth.PasswordResetOtp;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PasswordResetOtpRepository extends JpaRepository<PasswordResetOtp, Integer> {
    Optional<PasswordResetOtp> findByEmailAndOtpAndIsUsedFalse(String email, String otp);
    Optional<PasswordResetOtp> findTopByEmailOrderByCreatedAtDesc(String email);
}
