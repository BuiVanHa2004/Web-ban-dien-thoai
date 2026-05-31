package com.webbanhang.shop.DTO.Auth;

public record LinkGoogleRequest(
        String idToken,
        String password
) {
}
