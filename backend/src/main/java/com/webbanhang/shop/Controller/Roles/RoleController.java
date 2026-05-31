package com.webbanhang.shop.Controller.Roles;

import com.webbanhang.shop.DTO.Roles.RoleDto;
import com.webbanhang.shop.Service.Roles.RoleService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/roles")
public class RoleController {

    private final RoleService roleService;

    public RoleController(RoleService roleService) {
        this.roleService = roleService;
    }

    @GetMapping
    public List<RoleDto> getAll() {
        return roleService.findAll().stream().map(RoleDto::fromEntity).toList();
    }
}
