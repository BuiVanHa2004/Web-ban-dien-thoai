package com.webbanhang.shop.Controller.Settings;

import com.webbanhang.shop.DTO.Settings.MaintenanceSettingDto;
import com.webbanhang.shop.DTO.Settings.UpdateMaintenanceRequest;
import com.webbanhang.shop.Security.JwtService;
import com.webbanhang.shop.Service.Settings.SettingService;
import io.jsonwebtoken.Claims;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/admin/settings")
public class AdminSettingController {

    private final SettingService settingService;
    private final JwtService jwtService;

    public AdminSettingController(SettingService settingService, JwtService jwtService) {
        this.settingService = settingService;
        this.jwtService = jwtService;
    }

    private void requireAdmin(String authHeader) {
        if (authHeader == null || authHeader.isBlank() || !authHeader.startsWith("Bearer ")) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Thiếu token đăng nhập.");
        }
        String token = authHeader.substring("Bearer ".length()).trim();
        Claims claims;
        try {
            claims = jwtService.parseClaims(token);
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token không hợp lệ.");
        }

        String userType = String.valueOf(claims.get("userType"));
        String role = String.valueOf(claims.get("role"));

        if (!"ADMIN".equalsIgnoreCase(userType)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Chỉ admin mới được phép.");
        }

        if (!"ADMIN".equalsIgnoreCase(role)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Chỉ quyền ADMIN mới được phép.");
        }
    }

    @PutMapping("/maintenance")
    public MaintenanceSettingDto updateMaintenance(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestBody UpdateMaintenanceRequest req
    ) {
        requireAdmin(authorization);
        if (req == null || req.isMaintenance() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Thiếu isMaintenance");
        }
        return MaintenanceSettingDto.fromEntity(settingService.updateMaintenance(req.isMaintenance()));
    }
}
