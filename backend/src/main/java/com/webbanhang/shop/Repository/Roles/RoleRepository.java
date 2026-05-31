package com.webbanhang.shop.Repository.Roles;

import com.webbanhang.shop.Model.Roles.Role;
import com.webbanhang.shop.Model.Roles.RoleName;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface RoleRepository extends JpaRepository<Role, Integer> {
    Optional<Role> findByRoleName(RoleName roleName);
}
