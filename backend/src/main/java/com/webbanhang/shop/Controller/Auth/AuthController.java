package com.webbanhang.shop.Controller.Auth;

import com.webbanhang.shop.DTO.Auth.AuthResponse;
import com.webbanhang.shop.DTO.Auth.ForgotPasswordRequest;
import com.webbanhang.shop.DTO.Auth.ForgotPasswordResetRequest;
import com.webbanhang.shop.DTO.Auth.ForgotPasswordVerifyRequest;
import com.webbanhang.shop.DTO.Auth.GoogleAuthRequest;
import com.webbanhang.shop.DTO.Auth.GoogleAuthResponse;
import com.webbanhang.shop.DTO.Auth.LinkGoogleRequest;
import com.webbanhang.shop.DTO.Auth.LoginRequest;
import com.webbanhang.shop.DTO.Auth.MeResponse;
import com.webbanhang.shop.DTO.Auth.RegisterRequest;
import com.webbanhang.shop.Service.Auth.AuthService;
import com.webbanhang.shop.Service.Auth.PasswordResetService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import com.webbanhang.shop.Repository.Admins.AdminAccountRepository;
import com.webbanhang.shop.Repository.Customers.CustomerAccountRepository;
import org.springframework.security.core.Authentication;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final PasswordResetService passwordResetService;
    private final CustomerAccountRepository customerAccountRepository;
    private final AdminAccountRepository adminAccountRepository;

    public AuthController(
            AuthService authService,
            PasswordResetService passwordResetService,
            CustomerAccountRepository customerAccountRepository,
            AdminAccountRepository adminAccountRepository
    ) {
        this.authService = authService;
        this.passwordResetService = passwordResetService;
        this.customerAccountRepository = customerAccountRepository;
        this.adminAccountRepository = adminAccountRepository;
    }

    @GetMapping("/me")
    public MeResponse me(Authentication authentication) {
        if (authentication == null || authentication.getName() == null || authentication.getName().isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Chưa đăng nhập.");
        }

        String subject = authentication.getName();
        try {
            if (subject.startsWith("customer:")) {
                int id = Integer.parseInt(subject.substring("customer:".length()));
                var customer = customerAccountRepository.findById(id).orElse(null);
                if (customer == null || customer.getDeletedAt() != null || (customer.getIsActive() != null && !customer.getIsActive())) {
                    throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Phiên đăng nhập không hợp lệ.");
                }
                String provider = customer.getAuthProvider() != null ? customer.getAuthProvider().name() : (customer.getGoogleId() != null ? "GOOGLE" : "LOCAL");
                boolean hasPassword = customer.getPassword() != null && !customer.getPassword().isBlank();
                return new MeResponse(
                        customer.getCustomerId(),
                        "CUSTOMER",
                        "CUSTOMER",
                        customer.getFullName(),
                        customer.getEmail(),
                        customer.getUsername(),
                        customer.getAvatarUrl(),
                        provider,
                        hasPassword,
                        customer.getGoogleId()
                );
            }
            if (subject.startsWith("admin:")) {
                int id = Integer.parseInt(subject.substring("admin:".length()));
                var admin = adminAccountRepository.findById(id).orElse(null);
                if (admin == null || admin.getDeletedAt() != null) {
                    throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Phiên đăng nhập không hợp lệ.");
                }
                String role = admin.getRole() != null && admin.getRole().getRoleName() != null
                        ? admin.getRole().getRoleName().name()
                        : "ADMIN";
                return new MeResponse(
                        admin.getAccountId(),
                        "ADMIN",
                        role,
                        admin.getFullName(),
                        admin.getEmail(),
                        admin.getUsername(),
                        admin.getAvatarUrl(),
                        "LOCAL",
                        true,
                        null
                );
            }
        } catch (ResponseStatusException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Phiên đăng nhập không hợp lệ.");
        }

        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Phiên đăng nhập không hợp lệ.");
    }

    @PostMapping("/login")
    public AuthResponse login(@RequestBody LoginRequest req) {
        return authService.login(req);
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@RequestBody RegisterRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.register(req));
    }

    @PostMapping("/google")
    public GoogleAuthResponse google(@RequestBody GoogleAuthRequest req) {
        return authService.googleAuth(req);
    }

    @PostMapping("/link-google")
    public GoogleAuthResponse linkGoogle(@RequestBody LinkGoogleRequest req) {
        return authService.linkGoogle(req);
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, String>> forgotPassword(@RequestBody ForgotPasswordRequest req) {
        String key = req.usernameOrEmail() != null && !req.usernameOrEmail().isBlank()
                ? req.usernameOrEmail()
                : req.email();

        if (key == null || key.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Vui lòng nhập email."));
        }

        try {
            passwordResetService.requestReset(key);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }

        // Luôn trả về thành công để tránh lộ thông tin tài khoản
        return ResponseEntity.ok(Map.of("message", "Nếu email tồn tại, mã xác thực sẽ được gửi trong vài phút."));
    }

    @PostMapping("/forgot-password/verify")
    public Map<String, String> verifyForgotPasswordCode(@RequestBody ForgotPasswordVerifyRequest req) {
        String key = req.usernameOrEmail() != null && !req.usernameOrEmail().isBlank()
                ? req.usernameOrEmail()
                : req.email();

        if (key == null || key.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Vui lòng nhập email.");
        }

        try {
            passwordResetService.verifyCode(key, req.code());
            return Map.of("message", "Mã xác thực hợp lệ");
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, ex.getMessage());
        }
    }

    @PostMapping("/forgot-password/reset")
    public Map<String, String> resetForgotPassword(@RequestBody ForgotPasswordResetRequest req) {
        String key = req.usernameOrEmail() != null && !req.usernameOrEmail().isBlank()
                ? req.usernameOrEmail()
                : req.email();

        if (key == null || key.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Vui lòng nhập email.");
        }

        try {
            passwordResetService.resetPassword(key, req.code(), req.newPassword());
            return Map.of("message", "Đặt lại mật khẩu thành công");
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, ex.getMessage());
        }
    }

    @PutMapping("/avatar")
    public Map<String, String> updateAvatar(@RequestBody Map<String, String> request, Authentication authentication) {
        if (authentication == null || authentication.getName() == null || authentication.getName().isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Chưa đăng nhập.");
        }

        String avatarUrl = request.get("avatarUrl");
        if (avatarUrl == null || avatarUrl.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Vui lòng cung cấp URL avatar.");
        }

        String subject = authentication.getName();
        try {
            if (subject.startsWith("customer:")) {
                int id = Integer.parseInt(subject.substring("customer:".length()));
                var customer = customerAccountRepository.findById(id).orElse(null);
                if (customer == null || customer.getDeletedAt() != null || (customer.getIsActive() != null && !customer.getIsActive())) {
                    throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Phiên đăng nhập không hợp lệ.");
                }
                customer.setAvatarUrl(avatarUrl);
                customerAccountRepository.save(customer);
                return Map.of("message", "Cập nhật avatar thành công", "avatarUrl", avatarUrl);
            }
            if (subject.startsWith("admin:")) {
                int id = Integer.parseInt(subject.substring("admin:".length()));
                var admin = adminAccountRepository.findById(id).orElse(null);
                if (admin == null || admin.getDeletedAt() != null) {
                    throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Phiên đăng nhập không hợp lệ.");
                }
                admin.setAvatarUrl(avatarUrl);
                adminAccountRepository.save(admin);
                return Map.of("message", "Cập nhật avatar thành công", "avatarUrl", avatarUrl);
            }
        } catch (ResponseStatusException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Lỗi cập nhật avatar.");
        }

        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Phiên đăng nhập không hợp lệ.");
    }
}
