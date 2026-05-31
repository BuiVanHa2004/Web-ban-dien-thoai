package com.webbanhang.shop.DTO.Admins;

public record ChangePasswordRequest(
        String oldPassword,
        String newPassword
) {
}
