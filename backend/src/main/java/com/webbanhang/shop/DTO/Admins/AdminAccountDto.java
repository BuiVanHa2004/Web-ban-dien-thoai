package com.webbanhang.shop.DTO.Admins;

import com.webbanhang.shop.Model.Admins.AdminAccount;

import java.time.Instant;

public record AdminAccountDto(
        Integer accountId,
        String fullName,
        String username,
        String password,
        Integer roleId,
        String roleName,
        String email,
        String phone,
        String address,
        String avatarUrl,
        Instant createdAt,
        Instant updatedAt,
        Instant deletedAt
) {
    public static AdminAccountDto fromEntity(AdminAccount a) {
        return new AdminAccountDto(
                a.getAccountId(),
                a.getFullName(),
                a.getUsername(),
                a.getPassword(),
                a.getRole() != null ? a.getRole().getRoleId() : null,
                a.getRole() != null && a.getRole().getRoleName() != null ? a.getRole().getRoleName().name() : null,
                a.getEmail(),
                a.getPhone(),
                a.getAddress(),
                a.getAvatarUrl(),
                a.getCreatedAt(),
                a.getUpdatedAt(),
                a.getDeletedAt()
        );
    }
}
