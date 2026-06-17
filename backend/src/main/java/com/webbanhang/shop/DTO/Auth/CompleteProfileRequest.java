package com.webbanhang.shop.DTO.Auth;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CompleteProfileRequest {
    private String googleId;
    private String email;
    private String name;
    private String phone;
    private String address;
    private String avatarUrl;
}
