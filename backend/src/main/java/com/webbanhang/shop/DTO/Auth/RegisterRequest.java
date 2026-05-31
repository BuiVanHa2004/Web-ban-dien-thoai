package com.webbanhang.shop.DTO.Auth;

public record RegisterRequest(
        String fullName,
        String username,
        String password,
        String email,
        String phone,
        String address
) {
}
