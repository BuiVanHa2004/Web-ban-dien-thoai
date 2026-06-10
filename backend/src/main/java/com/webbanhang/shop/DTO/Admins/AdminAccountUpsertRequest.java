package com.webbanhang.shop.DTO.Admins;

public record AdminAccountUpsertRequest(
        String fullName,
        String username,
        String password,
        Integer roleId,
        String email,
        String phone,
        String address,
        String avatarUrl
) {
}
