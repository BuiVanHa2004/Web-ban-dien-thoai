package com.webbanhang.shop.Service.Auth;

import com.webbanhang.shop.DTO.Auth.*;

public interface AuthService {
    AuthResponse login(LoginRequest request);

    AuthResponse register(RegisterRequest request);

    GoogleAuthResponse googleAuth(GoogleAuthRequest request);

    GoogleAuthResponse linkGoogle(LinkGoogleRequest request);
}
