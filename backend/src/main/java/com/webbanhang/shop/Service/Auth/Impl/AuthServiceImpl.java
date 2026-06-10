package com.webbanhang.shop.Service.Auth.Impl;

import com.webbanhang.shop.DTO.Auth.*;
import com.webbanhang.shop.Exception.BadRequestException;
import com.webbanhang.shop.Exception.UnauthorizedException;
import com.webbanhang.shop.Model.Admins.AdminAccount;
import com.webbanhang.shop.Model.Customers.AuthProvider;
import com.webbanhang.shop.Model.Customers.CustomerAccount;
import com.webbanhang.shop.Repository.Admins.AdminAccountRepository;
import com.webbanhang.shop.Repository.Customers.CustomerAccountRepository;
import com.webbanhang.shop.Security.JwtService;
import com.webbanhang.shop.Security.JwtTokenDetails;
import com.webbanhang.shop.Service.Auth.AuthService;
import com.webbanhang.shop.Service.Auth.GoogleTokenVerifier;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

@Service
public class AuthServiceImpl implements AuthService {

    private final CustomerAccountRepository customerAccountRepository;
    private final AdminAccountRepository adminAccountRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final GoogleTokenVerifier googleTokenVerifier;

    public AuthServiceImpl(
            CustomerAccountRepository customerAccountRepository,
            AdminAccountRepository adminAccountRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            GoogleTokenVerifier googleTokenVerifier
    ) {
        this.customerAccountRepository = customerAccountRepository;
        this.adminAccountRepository = adminAccountRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.googleTokenVerifier = googleTokenVerifier;
    }

    @Override
    public AuthResponse login(LoginRequest req) {
        if (req.usernameOrEmail() == null || req.usernameOrEmail().isBlank()) {
            throw new BadRequestException("Vui lòng nhập tên đăng nhập hoặc email.");
        }
        if (req.password() == null || req.password().isBlank()) {
            throw new BadRequestException("Vui lòng nhập mật khẩu.");
        }

        String key = req.usernameOrEmail().trim();
        String keyLower = key.toLowerCase(Locale.ROOT);

        AdminAccount admin = adminAccountRepository.findByUsernameAndDeletedAtIsNull(key)
                .or(() -> adminAccountRepository.findByEmailAndDeletedAtIsNull(keyLower))
                .orElse(null);

        if (admin != null && passwordMatches(req.password(), admin.getPassword())) {
            String role = admin.getRole() != null && admin.getRole().getRoleName() != null
                    ? admin.getRole().getRoleName().name()
                    : "ADMIN";
            JwtTokenDetails token = issueToken(
                    "admin:" + admin.getAccountId(),
                    Map.of("userType", "ADMIN", "role", role, "userId", admin.getAccountId())
            );
            return toAuthResponse(token, admin.getAccountId(), admin.getFullName(), admin.getEmail(), admin.getAvatarUrl(), role, "ADMIN", "LOCAL", true);
        }

        CustomerAccount customer = customerAccountRepository.findByUsername(key)
                .or(() -> customerAccountRepository.findByEmail(keyLower))
                .orElseThrow(() -> new UnauthorizedException("Sai thông tin đăng nhập."));

        if (customer.getIsActive() != null && !customer.getIsActive()) {
            throw new UnauthorizedException("Tài khoản đã bị khóa.");
        }

        if (customer.getPassword() == null || customer.getPassword().isBlank()) {
            throw new UnauthorizedException("Tài khoản này đăng nhập bằng Google. Vui lòng dùng Google để đăng nhập.");
        }
        if (!passwordMatches(req.password(), customer.getPassword())) {
            throw new UnauthorizedException("Sai thông tin đăng nhập.");
        }

        JwtTokenDetails token = issueToken(
                "customer:" + customer.getCustomerId(),
                Map.of("userType", "CUSTOMER", "role", "CUSTOMER", "userId", customer.getCustomerId())
        );
        return toAuthResponse(
                token,
                customer.getCustomerId(),
                customer.getFullName(),
                customer.getEmail(),
                customer.getAvatarUrl(),
                "CUSTOMER",
                "CUSTOMER",
                resolveAuthProvider(customer),
                customer.getPassword() != null && !customer.getPassword().isBlank()
        );
    }

    @Override
    public AuthResponse register(RegisterRequest req) {
        if (req.fullName() == null || req.fullName().isBlank()) throw new BadRequestException("Vui lòng nhập họ và tên.");
        if (req.username() == null || req.username().isBlank()) throw new BadRequestException("Vui lòng nhập username.");
        if (req.email() == null || req.email().isBlank()) throw new BadRequestException("Vui lòng nhập email.");
        if (req.password() == null || req.password().isBlank()) throw new BadRequestException("Vui lòng nhập mật khẩu.");

        String username = req.username().trim();
        String emailLower = req.email().trim().toLowerCase(Locale.ROOT);

        if (customerAccountRepository.findByUsername(username).isPresent()) {
            throw new BadRequestException("Username đã tồn tại.");
        }
        if (customerAccountRepository.findByEmail(emailLower).isPresent()) {
            throw new BadRequestException("Email đã tồn tại.");
        }

        CustomerAccount customer = new CustomerAccount();
        customer.setFullName(req.fullName().trim());
        customer.setUsername(username);
        customer.setEmail(emailLower);
        customer.setPhone(req.phone());
        customer.setAddress(req.address());
        customer.setPassword(passwordEncoder.encode(req.password()));
        customer.setGoogleId(null);
        customer.setAuthProvider(AuthProvider.LOCAL);
        customer.setIsActive(Boolean.TRUE);

        CustomerAccount saved = customerAccountRepository.save(customer);
        JwtTokenDetails token = issueToken(
                "customer:" + saved.getCustomerId(),
                Map.of("userType", "CUSTOMER", "role", "CUSTOMER", "userId", saved.getCustomerId())
        );
        return toAuthResponse(
                token,
                saved.getCustomerId(),
                saved.getFullName(),
                saved.getEmail(),
                saved.getAvatarUrl(),
                "CUSTOMER",
                "CUSTOMER",
                resolveAuthProvider(saved),
                saved.getPassword() != null && !saved.getPassword().isBlank()
        );
    }

    @Override
    public GoogleAuthResponse googleAuth(GoogleAuthRequest request) {
        GoogleTokenVerifier.GoogleProfile profile = googleTokenVerifier.verifyIdToken(request.idToken());

        Optional<CustomerAccount> byGoogle = customerAccountRepository.findByGoogleId(profile.googleId());
        if (byGoogle.isPresent()) {
            CustomerAccount customer = byGoogle.get();
            if (customer.getIsActive() != null && !customer.getIsActive()) {
                throw new UnauthorizedException("Tài khoản đã bị khóa.");
            }
            JwtTokenDetails token = issueToken(
                    "customer:" + customer.getCustomerId(),
                    Map.of("userType", "CUSTOMER", "role", "CUSTOMER", "userId", customer.getCustomerId())
            );
            return new GoogleAuthResponse(
                    "SUCCESS",
                    "Đăng nhập Google thành công.",
                    toAuthResponse(
                            token,
                            customer.getCustomerId(),
                            customer.getFullName(),
                            customer.getEmail(),
                            customer.getAvatarUrl(),
                            "CUSTOMER",
                            "CUSTOMER",
                            resolveAuthProvider(customer),
                            customer.getPassword() != null && !customer.getPassword().isBlank()
                    ),
                    customer.getEmail(),
                    customer.getFullName(),
                    customer.getUsername(),
                    false
            );
        }

        Optional<CustomerAccount> byEmail = customerAccountRepository.findByEmail(profile.email());
        if (byEmail.isPresent()) {
            CustomerAccount customer = byEmail.get();
            if (customer.getGoogleId() == null || customer.getGoogleId().isBlank()) {
                return new GoogleAuthResponse(
                        "LINK_REQUIRED",
                        "Email đã tồn tại. Vui lòng nhập mật khẩu để liên kết Google.",
                        null,
                        customer.getEmail(),
                        customer.getFullName(),
                        customer.getUsername(),
                        false
                );
            }
        }

        // Email chưa tồn tại => tạo account mới (password null) + auto-username
        CustomerAccount created = new CustomerAccount();
        created.setFullName(profile.fullName().isBlank() ? profile.email() : profile.fullName());
        created.setEmail(profile.email());
        created.setGoogleId(profile.googleId());
        created.setPassword(null);
        created.setUsername(generateUniqueUsername(profile));
        created.setAuthProvider(AuthProvider.GOOGLE);
        created.setIsActive(Boolean.TRUE);
        created.setPhone(null);
        created.setAddress(null);
        CustomerAccount saved = customerAccountRepository.save(created);

        JwtTokenDetails token = issueToken(
                "customer:" + saved.getCustomerId(),
                Map.of("userType", "CUSTOMER", "role", "CUSTOMER", "userId", saved.getCustomerId())
        );

        return new GoogleAuthResponse(
                "PROFILE_REQUIRED",
                "Tạo tài khoản Google thành công. Vui lòng bổ sung thông tin liên hệ.",
                toAuthResponse(
                        token,
                        saved.getCustomerId(),
                        saved.getFullName(),
                        saved.getEmail(),
                        saved.getAvatarUrl(),
                        "CUSTOMER",
                        "CUSTOMER",
                        resolveAuthProvider(saved),
                        saved.getPassword() != null && !saved.getPassword().isBlank()
                ),
                saved.getEmail(),
                saved.getFullName(),
                saved.getUsername(),
                true
        );
    }

    @Override
    public GoogleAuthResponse linkGoogle(LinkGoogleRequest request) {
        GoogleTokenVerifier.GoogleProfile profile = googleTokenVerifier.verifyIdToken(request.idToken());
        if (request.password() == null || request.password().isBlank()) {
            throw new BadRequestException("Vui lòng nhập mật khẩu để liên kết tài khoản.");
        }

        CustomerAccount customer = customerAccountRepository.findByEmail(profile.email())
                .orElseThrow(() -> new BadRequestException("Email Google chưa tồn tại trong hệ thống."));

        if (customer.getIsActive() != null && !customer.getIsActive()) {
            throw new UnauthorizedException("Tài khoản đã bị khóa.");
        }

        if (customer.getGoogleId() != null && !customer.getGoogleId().isBlank()) {
            if (!customer.getGoogleId().equals(profile.googleId())) {
                throw new BadRequestException("Email này đã liên kết với một Google account khác.");
            }
        } else {
            if (customer.getPassword() == null || customer.getPassword().isBlank()) {
                throw new UnauthorizedException("Tài khoản chưa có mật khẩu để xác thực liên kết.");
            }
            if (!passwordMatches(request.password(), customer.getPassword())) {
                throw new UnauthorizedException("Mật khẩu không chính xác.");
            }
            customer.setGoogleId(profile.googleId());
            customer.setAuthProvider(AuthProvider.GOOGLE);
            customerAccountRepository.save(customer);
        }

        JwtTokenDetails token = issueToken(
                "customer:" + customer.getCustomerId(),
                Map.of("userType", "CUSTOMER", "role", "CUSTOMER", "userId", customer.getCustomerId())
        );
        return new GoogleAuthResponse(
                "SUCCESS",
                "Liên kết Google thành công.",
                toAuthResponse(
                        token,
                        customer.getCustomerId(),
                        customer.getFullName(),
                        customer.getEmail(),
                        customer.getAvatarUrl(),
                        "CUSTOMER",
                        "CUSTOMER",
                        resolveAuthProvider(customer),
                        customer.getPassword() != null && !customer.getPassword().isBlank()
                ),
                customer.getEmail(),
                customer.getFullName(),
                customer.getUsername(),
                isBlank(customer.getPhone()) || isBlank(customer.getAddress())
        );
    }

    private String generateUniqueUsername(GoogleTokenVerifier.GoogleProfile profile) {
        String base = (profile.fullName() == null ? "" : profile.fullName().toLowerCase(Locale.ROOT))
                .replaceAll("[^a-z0-9]+", "")
                .trim();
        if (base.isBlank()) {
            base = profile.email().split("@")[0].replaceAll("[^a-z0-9]+", "");
        }
        if (base.isBlank()) base = "user";
        String candidate = base;
        int suffix = 1;
        while (customerAccountRepository.findByUsername(candidate).isPresent()) {
            candidate = base + suffix++;
        }
        return candidate;
    }

    private boolean passwordMatches(String rawPassword, String storedPassword) {
        if (rawPassword == null || storedPassword == null) return false;
        String p = storedPassword.trim();
        if (p.startsWith("$2a$") || p.startsWith("$2b$") || p.startsWith("$2y$")) {
            return passwordEncoder.matches(rawPassword, p);
        }
        return rawPassword.equals(storedPassword);
    }

    private JwtTokenDetails issueToken(String subject, Map<String, Object> claims) {
        return jwtService.generateToken(subject, new LinkedHashMap<>(claims));
    }

    private AuthResponse toAuthResponse(
            JwtTokenDetails token,
            Integer userId,
            String fullName,
            String email,
            String avatarUrl,
            String role,
            String userType,
            String authProvider,
            Boolean hasPassword
    ) {
        return new AuthResponse(
                token.token(),
                userId,
                fullName,
                email,
                avatarUrl,
                role,
                userType,
                authProvider,
                hasPassword,
                token.issuedAt().toString(),
                token.expiresAt().toString()
        );
    }

    private String resolveAuthProvider(CustomerAccount customer) {
        if (customer == null) return "LOCAL";
        if (customer.getAuthProvider() != null) return customer.getAuthProvider().name();
        if (customer.getGoogleId() != null && !customer.getGoogleId().isBlank()) return "GOOGLE";
        return "LOCAL";
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
