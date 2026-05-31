package com.webbanhang.shop.DTO.Auth;

public record ForgotPasswordResetRequest(
        String usernameOrEmail,
        String email,
        String code,
        String newPassword
) {
}
