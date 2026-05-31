package com.webbanhang.shop.DTO.Roles;

import com.webbanhang.shop.Model.Roles.Role;

import java.time.Instant;

public record RoleDto(
        Integer roleId,
        String roleName,
        Instant createdAt
) {
    public static RoleDto fromEntity(Role r) {
        return new RoleDto(
                r.getRoleId(),
                r.getRoleName() != null ? r.getRoleName().name() : null,
                r.getCreatedAt()
        );
    }
}
