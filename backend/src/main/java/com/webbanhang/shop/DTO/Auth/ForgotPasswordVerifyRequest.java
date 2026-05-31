package com.webbanhang.shop.DTO.Auth;

public record ForgotPasswordVerifyRequest(
        String usernameOrEmail,
        String email,
        String code
) {
}
