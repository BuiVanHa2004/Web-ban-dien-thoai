package com.webbanhang.shop.DTO.Auth;

public record LoginRequest(
        String usernameOrEmail,
        String password
) {
}
