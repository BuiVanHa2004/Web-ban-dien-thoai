package com.webbanhang.shop.Controller.Auth;

import com.webbanhang.shop.DTO.Auth.CompleteProfileRequest;
import com.webbanhang.shop.DTO.Auth.GoogleLoginRequest;
import com.webbanhang.shop.DTO.Auth.GoogleLoginResponse;
import com.webbanhang.shop.Service.Auth.GoogleAuthService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth/google")
public class GoogleAuthController {

    private final GoogleAuthService googleAuthService;

    public GoogleAuthController(GoogleAuthService googleAuthService) {
        this.googleAuthService = googleAuthService;
    }

    /**
     * Google Login Endpoint
     * POST /api/auth/google/login
     * 
     * Accepts Google user info and returns:
     * - JWT token + redirect URL if user exists
     * - requiresProfileCompletion=true if new user
     */
    @PostMapping("/login")
    public ResponseEntity<GoogleLoginResponse> googleLogin(@RequestBody GoogleLoginRequest request) {
        try {
            // Validate request
            if (request.getEmail() == null || request.getEmail().isEmpty()) {
                return ResponseEntity.badRequest().body(
                    GoogleLoginResponse.builder()
                        .message("Email is required")
                        .build()
                );
            }
            
            if (request.getGoogleId() == null || request.getGoogleId().isEmpty()) {
                return ResponseEntity.badRequest().body(
                    GoogleLoginResponse.builder()
                        .message("Google ID is required")
                        .build()
                );
            }
            
            GoogleLoginResponse response = googleAuthService.handleGoogleLogin(request);
            return ResponseEntity.ok(response);
            
        } catch (IllegalStateException e) {
            return ResponseEntity.status(403).body(
                GoogleLoginResponse.builder()
                    .message(e.getMessage())
                    .build()
            );
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(
                GoogleLoginResponse.builder()
                    .message("Có lỗi xảy ra: " + e.getMessage())
                    .build()
            );
        }
    }

    /**
     * Complete Profile Endpoint
     * POST /api/auth/google/complete-profile
     * 
     * Creates new CUSTOMER account with phone and address
     */
    @PostMapping("/complete-profile")
    public ResponseEntity<GoogleLoginResponse> completeProfile(@RequestBody CompleteProfileRequest request) {
        try {
            // Validate request
            if (request.getEmail() == null || request.getEmail().isEmpty()) {
                return ResponseEntity.badRequest().body(
                    GoogleLoginResponse.builder()
                        .message("Email is required")
                        .build()
                );
            }
            
            if (request.getGoogleId() == null || request.getGoogleId().isEmpty()) {
                return ResponseEntity.badRequest().body(
                    GoogleLoginResponse.builder()
                        .message("Google ID is required")
                        .build()
                );
            }
            
            if (request.getPhone() == null || request.getPhone().trim().isEmpty()) {
                return ResponseEntity.badRequest().body(
                    GoogleLoginResponse.builder()
                        .message("Số điện thoại là bắt buộc")
                        .build()
                );
            }
            
            if (request.getAddress() == null || request.getAddress().trim().isEmpty()) {
                return ResponseEntity.badRequest().body(
                    GoogleLoginResponse.builder()
                        .message("Địa chỉ là bắt buộc")
                        .build()
                );
            }
            
            GoogleLoginResponse response = googleAuthService.completeProfile(request);
            return ResponseEntity.ok(response);
            
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(
                GoogleLoginResponse.builder()
                    .message(e.getMessage())
                    .build()
            );
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(
                GoogleLoginResponse.builder()
                    .message("Có lỗi xảy ra: " + e.getMessage())
                    .build()
            );
        }
    }

    /**
     * Check Phone Availability
     * GET /api/auth/google/check-phone?phone=0123456789
     * 
     * Returns whether phone is available
     */
    @GetMapping("/check-phone")
    public ResponseEntity<Map<String, Object>> checkPhone(@RequestParam String phone) {
        try {
            boolean exists = googleAuthService.isPhoneExists(phone);
            return ResponseEntity.ok(Map.of(
                "exists", exists,
                "available", !exists,
                "message", exists ? "Số điện thoại đã tồn tại" : "Số điện thoại khả dụng"
            ));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of(
                "error", true,
                "message", e.getMessage()
            ));
        }
    }
}
