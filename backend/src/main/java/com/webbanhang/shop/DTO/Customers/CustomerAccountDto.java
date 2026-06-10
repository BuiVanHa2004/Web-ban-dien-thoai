package com.webbanhang.shop.DTO.Customers;

import com.webbanhang.shop.Model.Customers.CustomerAccount;

import java.time.Instant;

public record CustomerAccountDto(
        Integer customerId,
        String fullName,
        String username,
        String password,
        String email,
        String googleId,
        String phone,
        String address,
        String avatarUrl,
        Instant createdAt,
        Instant updatedAt,
        Instant deletedAt
) {
    public static CustomerAccountDto fromEntity(CustomerAccount c) {
        return new CustomerAccountDto(
                c.getCustomerId(),
                c.getFullName(),
                c.getUsername(),
                c.getPassword(),
                c.getEmail(),
                c.getGoogleId(),
                c.getPhone(),
                c.getAddress(),
                c.getAvatarUrl(),
                c.getCreatedAt(),
                c.getUpdatedAt(),
                c.getDeletedAt()
        );
    }
}
