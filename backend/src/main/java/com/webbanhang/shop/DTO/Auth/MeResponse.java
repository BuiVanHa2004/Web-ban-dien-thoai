package com.webbanhang.shop.DTO.Auth;

public record MeResponse(
        Integer userId,
        String userType,
        String role,
        String name,
        String email,
        String username,
        String authProvider,
        Boolean hasPassword,
        String googleId
) {
}
