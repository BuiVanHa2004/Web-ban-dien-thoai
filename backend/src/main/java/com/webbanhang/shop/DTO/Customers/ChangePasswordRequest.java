package com.webbanhang.shop.DTO.Customers;

public record ChangePasswordRequest(
        String currentPassword,
        String newPassword
) {
}
