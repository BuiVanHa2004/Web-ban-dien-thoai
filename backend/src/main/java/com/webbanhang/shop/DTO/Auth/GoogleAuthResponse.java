package com.webbanhang.shop.DTO.Auth;

public record GoogleAuthResponse(
        String status,
        String message,
        AuthResponse auth,
        String email,
        String fullName,
        String username,
        Boolean requiresProfileCompletion
) {
}
