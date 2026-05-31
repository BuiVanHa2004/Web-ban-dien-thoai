package com.webbanhang.shop.DTO.Auth;

public record AuthResponse(
        String token,
        Integer userId,
        String name,
        String email,
        String role,
        String userType,
        String authProvider,
        Boolean hasPassword,
        String issuedAt,
        String expiresAt
) {
}
