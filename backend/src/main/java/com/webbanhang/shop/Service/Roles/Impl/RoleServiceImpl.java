package com.webbanhang.shop.Service.Roles.Impl;

import com.webbanhang.shop.Model.Roles.Role;
import com.webbanhang.shop.Repository.Roles.RoleRepository;
import com.webbanhang.shop.Service.Roles.RoleService;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class RoleServiceImpl implements RoleService {

    private final RoleRepository roleRepository;

    public RoleServiceImpl(RoleRepository roleRepository) {
        this.roleRepository = roleRepository;
    }

    @Override
    public List<Role> findAll() {
        return roleRepository.findAll();
    }
}
