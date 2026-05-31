package com.webbanhang.shop.DTO.Customers;

public record CustomerAccountUpsertRequest(
        String fullName,
        String username,
        String password,
        String email,
        String phone,
        String address
) {
}
