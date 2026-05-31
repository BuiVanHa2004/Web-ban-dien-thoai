package com.webbanhang.shop.Config;

import com.webbanhang.shop.Model.Roles.Role;
import com.webbanhang.shop.Model.Roles.RoleName;
import com.webbanhang.shop.Repository.Roles.RoleRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class RoleSeeder implements CommandLineRunner {

    private final RoleRepository roleRepository;

    public RoleSeeder(RoleRepository roleRepository) {
        this.roleRepository = roleRepository;
    }

    @Override
    public void run(String... args) {
        ensureRole(RoleName.ADMIN);
        ensureRole(RoleName.STAFF);
    }

    private void ensureRole(RoleName roleName) {
        roleRepository.findByRoleName(roleName).orElseGet(() -> {
            Role role = new Role();
            role.setRoleName(roleName);
            return roleRepository.save(role);
        });
    }
}
