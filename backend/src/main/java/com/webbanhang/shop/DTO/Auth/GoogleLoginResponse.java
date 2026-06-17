package com.webbanhang.shop.DTO.Auth;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GoogleLoginResponse {
    private boolean requiresProfileCompletion;
    private String redirectUrl;
    private String token; // JWT token nếu đã hoàn thành
    private String message;
    private Integer userId;
    private String role; // ADMIN, STAFF, CUSTOMER
    private String tempGoogleId; // Để frontend gửi lại khi complete profile
    private String email;
    private String name;
}
