package com.webbanhang.shop.DTO.Auth;

public record ForgotPasswordRequest(
        String email,
        String usernameOrEmail
) {
}
