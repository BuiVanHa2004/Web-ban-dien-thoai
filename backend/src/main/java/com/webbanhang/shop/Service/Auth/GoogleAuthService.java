package com.webbanhang.shop.Service.Auth;

import com.webbanhang.shop.DTO.Auth.CompleteProfileRequest;
import com.webbanhang.shop.DTO.Auth.GoogleLoginRequest;
import com.webbanhang.shop.DTO.Auth.GoogleLoginResponse;
import com.webbanhang.shop.Model.Admins.AdminAccount;
import com.webbanhang.shop.Model.Customers.AuthProvider;
import com.webbanhang.shop.Model.Customers.CustomerAccount;
import com.webbanhang.shop.Model.Roles.RoleName;
import com.webbanhang.shop.Repository.Admins.AdminAccountRepository;
import com.webbanhang.shop.Repository.Customers.CustomerAccountRepository;
import com.webbanhang.shop.Security.JwtService;
import com.webbanhang.shop.Security.JwtTokenDetails;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@Service
public class GoogleAuthService {

    private final CustomerAccountRepository customerAccountRepository;
    private final AdminAccountRepository adminAccountRepository;
    private final JwtService jwtService;

    public GoogleAuthService(
            CustomerAccountRepository customerAccountRepository,
            AdminAccountRepository adminAccountRepository,
            JwtService jwtService
    ) {
        this.customerAccountRepository = customerAccountRepository;
        this.adminAccountRepository = adminAccountRepository;
        this.jwtService = jwtService;
    }

    /**
     * Handle Google Login - Main entry point
     */
    @Transactional
    public GoogleLoginResponse handleGoogleLogin(GoogleLoginRequest request) {
        String email = request.getEmail();
        
        // 1. Check if email exists in CustomerAccount
        Optional<CustomerAccount> customerOpt = customerAccountRepository.findByEmail(email);
        if (customerOpt.isPresent()) {
            return handleExistingCustomer(customerOpt.get(), request);
        }
        
        // 2. Check if email exists in AdminAccount
        Optional<AdminAccount> adminOpt = adminAccountRepository.findByEmailAndDeletedAtIsNull(email);
        if (adminOpt.isPresent()) {
            return handleExistingAdmin(adminOpt.get(), request);
        }
        
        // 3. Email doesn't exist - require profile completion
        return GoogleLoginResponse.builder()
                .requiresProfileCompletion(true)
                .redirectUrl("/complete-profile")
                .tempGoogleId(request.getGoogleId())
                .email(request.getEmail())
                .name(request.getName())
                .message("Vui lòng hoàn thành thông tin để tiếp tục")
                .build();
    }

    /**
     * Handle existing customer - link Google account if needed
     */
    private GoogleLoginResponse handleExistingCustomer(CustomerAccount customer, GoogleLoginRequest request) {
        // Link Google ID if not already linked
        if (customer.getGoogleId() == null || customer.getGoogleId().isEmpty()) {
            customer.setGoogleId(request.getGoogleId());
            customer.setAuthProvider(AuthProvider.GOOGLE);
            if (request.getAvatarUrl() != null && !request.getAvatarUrl().isEmpty()) {
                customer.setAvatarUrl(request.getAvatarUrl());
            }
            customerAccountRepository.save(customer);
        }
        
        // Check if account is active
        if (customer.getDeletedAt() != null) {
            throw new IllegalStateException("Tài khoản đã bị xóa");
        }
        if (customer.getIsActive() != null && !customer.getIsActive()) {
            throw new IllegalStateException("Tài khoản đã bị khóa");
        }
        
        // Generate JWT token
        Map<String, Object> claims = new HashMap<>();
        claims.put("userId", customer.getCustomerId());
        claims.put("role", "CUSTOMER");
        claims.put("email", customer.getEmail());
        
        JwtTokenDetails tokenDetails = jwtService.generateToken(customer.getEmail(), claims);
        
        return GoogleLoginResponse.builder()
                .requiresProfileCompletion(false)
                .redirectUrl("/home")
                .token(tokenDetails.token())
                .userId(customer.getCustomerId())
                .role("CUSTOMER")
                .message("Đăng nhập thành công")
                .build();
    }

    /**
     * Handle existing admin/staff - link Google account if needed
     */
    private GoogleLoginResponse handleExistingAdmin(AdminAccount admin, GoogleLoginRequest request) {
        // Note: AdminAccount doesn't have googleId yet, need to add it to entity first
        // For now, just authenticate
        
        if (admin.getDeletedAt() != null) {
            throw new IllegalStateException("Tài khoản đã bị xóa");
        }
        
        // Determine role
        RoleName roleName = admin.getRole() != null ? admin.getRole().getRoleName() : RoleName.STAFF;
        String roleStr = roleName.name();
        String redirectUrl = roleName == RoleName.ADMIN ? "/admin" : "/admin"; // Both go to admin panel
        
        // Generate JWT token
        Map<String, Object> claims = new HashMap<>();
        claims.put("userId", admin.getAccountId());
        claims.put("role", roleStr);
        claims.put("email", admin.getEmail());
        
        JwtTokenDetails tokenDetails = jwtService.generateToken(admin.getEmail(), claims);
        
        return GoogleLoginResponse.builder()
                .requiresProfileCompletion(false)
                .redirectUrl(redirectUrl)
                .token(tokenDetails.token())
                .userId(admin.getAccountId())
                .role(roleStr)
                .message("Đăng nhập thành công")
                .build();
    }

    /**
     * Complete profile for new Google user
     */
    @Transactional
    public GoogleLoginResponse completeProfile(CompleteProfileRequest request) {
        // 1. Validate phone doesn't exist
        if (isPhoneExists(request.getPhone())) {
            throw new IllegalArgumentException("Số điện thoại đã tồn tại trong hệ thống");
        }
        
        // 2. Double check email doesn't exist (safety check)
        if (customerAccountRepository.findByEmail(request.getEmail()).isPresent() ||
            adminAccountRepository.findByEmailAndDeletedAtIsNull(request.getEmail()).isPresent()) {
            throw new IllegalArgumentException("Email đã tồn tại trong hệ thống");
        }
        
        // 3. Create new customer account
        CustomerAccount newCustomer = new CustomerAccount();
        newCustomer.setFullName(request.getName());
        newCustomer.setEmail(request.getEmail());
        newCustomer.setGoogleId(request.getGoogleId());
        newCustomer.setAuthProvider(AuthProvider.GOOGLE);
        newCustomer.setPhone(request.getPhone());
        newCustomer.setAddress(request.getAddress());
        newCustomer.setAvatarUrl(request.getAvatarUrl());
        newCustomer.setIsActive(true);
        newCustomer.setUsername(generateUsername(request.getEmail()));
        newCustomer.setPassword(""); // No password for Google users
        
        CustomerAccount saved = customerAccountRepository.save(newCustomer);
        
        // 4. Generate JWT token
        Map<String, Object> claims = new HashMap<>();
        claims.put("userId", saved.getCustomerId());
        claims.put("role", "CUSTOMER");
        claims.put("email", saved.getEmail());
        
        JwtTokenDetails tokenDetails = jwtService.generateToken(saved.getEmail(), claims);
        
        return GoogleLoginResponse.builder()
                .requiresProfileCompletion(false)
                .redirectUrl("/home")
                .token(tokenDetails.token())
                .userId(saved.getCustomerId())
                .role("CUSTOMER")
                .message("Tạo tài khoản thành công")
                .build();
    }

    /**
     * Check if phone exists in ANY account table
     */
    public boolean isPhoneExists(String phone) {
        if (phone == null || phone.trim().isEmpty()) {
            return false;
        }
        
        String normalizedPhone = phone.trim();
        
        // Check in CustomerAccount
        boolean existsInCustomer = customerAccountRepository.existsByPhone(normalizedPhone);
        if (existsInCustomer) {
            return true;
        }
        
        // Check in AdminAccount
        boolean existsInAdmin = adminAccountRepository.existsByPhone(normalizedPhone);
        return existsInAdmin;
    }

    /**
     * Generate unique username from email
     */
    private String generateUsername(String email) {
        String baseUsername = email.split("@")[0];
        String username = baseUsername;
        int counter = 1;
        
        while (customerAccountRepository.existsByUsername(username)) {
            username = baseUsername + counter;
            counter++;
        }
        
        return username;
    }
}
