package com.webbanhang.shop.Controller.Admins;

import com.webbanhang.shop.DTO.Admins.AdminAccountDto;
import com.webbanhang.shop.DTO.Admins.AdminAccountUpsertRequest;
import com.webbanhang.shop.DTO.Admins.ChangePasswordRequest;
import com.webbanhang.shop.Security.JwtService;
import io.jsonwebtoken.Claims;
import com.webbanhang.shop.Service.Admins.AdminAccountService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin-accounts")
public class AdminAccountController {

    private final AdminAccountService adminAccountService;
    private final JwtService jwtService;

    public AdminAccountController(AdminAccountService adminAccountService, JwtService jwtService) {
        this.adminAccountService = adminAccountService;
        this.jwtService = jwtService;
    }

    private Integer requireAdminOrStaffId(String authHeader) {
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
        Object userType = claims.get("userType");
        Object role = claims.get("role");
        Object userId = claims.get("userId");

        String userTypeStr = userType == null ? "" : String.valueOf(userType);
        String roleStr = role == null ? "" : String.valueOf(role);
        if (!"ADMIN".equalsIgnoreCase(userTypeStr)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Chỉ admin/nhân viên mới được phép.");
        }
        if (!("ADMIN".equalsIgnoreCase(roleStr) || "STAFF".equalsIgnoreCase(roleStr))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Chỉ quyền ADMIN/STAFF mới được phép.");
        }
        Integer id;
        try {
            id = userId instanceof Number ? ((Number) userId).intValue() : Integer.valueOf(String.valueOf(userId));
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token thiếu userId.");
        }
        if (id == null || id <= 0) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token thiếu userId.");
        return id;
    }

    @GetMapping
    public List<AdminAccountDto> getAll() {
        return adminAccountService.findAllActive().stream().map(AdminAccountDto::fromEntity).toList();
    }

    @GetMapping("/trash")
    public List<AdminAccountDto> getTrash() {
        return adminAccountService.findAllTrashed().stream().map(AdminAccountDto::fromEntity).toList();
    }

    @GetMapping("/{id:\\d+}")
    public ResponseEntity<AdminAccountDto> getById(@PathVariable Integer id) {
        return adminAccountService.findById(id)
                .map(AdminAccountDto::fromEntity)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<AdminAccountDto> create(@RequestBody AdminAccountUpsertRequest req) {
        var created = adminAccountService.create(req);
        return ResponseEntity.status(HttpStatus.CREATED).body(AdminAccountDto.fromEntity(created));
    }

    @PutMapping("/{id:\\d+}")
    public ResponseEntity<AdminAccountDto> update(@PathVariable Integer id, @RequestBody AdminAccountUpsertRequest req) {
        return adminAccountService.update(id, req)
                .map(AdminAccountDto::fromEntity)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    // Debug endpoint to test avatar URL
    @GetMapping("/{id:\\d+}/avatar")
    public ResponseEntity<Map<String, String>> getAvatar(@PathVariable Integer id) {
        return adminAccountService.findById(id)
                .map(admin -> {
                    String avatarUrl = admin.getAvatarUrl();
                    return ResponseEntity.ok(Map.of(
                            "accountId", String.valueOf(admin.getAccountId()),
                            "fullName", admin.getFullName() != null ? admin.getFullName() : "",
                            "avatarUrl", avatarUrl != null ? avatarUrl : "",
                            "hasAvatar", String.valueOf(avatarUrl != null && !avatarUrl.isBlank())
                    ));
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping("/{id:\\d+}/change-password")
    public ResponseEntity<AdminAccountDto> changePassword(
            @PathVariable Integer id,
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestBody ChangePasswordRequest req
    ) {
        Integer requesterId = requireAdminOrStaffId(authorization);
        if (!id.equals(requesterId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không có quyền đổi mật khẩu tài khoản khác.");
        }
        if (req == null || req.oldPassword() == null || req.newPassword() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Thiếu dữ liệu đổi mật khẩu.");
        }
        try {
            return adminAccountService.changePassword(id, req.oldPassword(), req.newPassword())
                    .map(AdminAccountDto::fromEntity)
                    .map(ResponseEntity::ok)
                    .orElseGet(() -> ResponseEntity.notFound().build());
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        }
    }

    @PatchMapping("/{id:\\d+}/restore")
    public ResponseEntity<Void> restore(@PathVariable Integer id) {
        boolean ok = adminAccountService.restore(id);
        if (!ok) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id:\\d+}")
    public ResponseEntity<Void> delete(@PathVariable Integer id) {
        boolean ok = adminAccountService.softDelete(id);
        if (!ok) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id:\\d+}/force")
    public ResponseEntity<Void> deleteForever(@PathVariable Integer id) {
        boolean ok = adminAccountService.deleteForever(id);
        if (!ok) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.noContent().build();
    }
}
