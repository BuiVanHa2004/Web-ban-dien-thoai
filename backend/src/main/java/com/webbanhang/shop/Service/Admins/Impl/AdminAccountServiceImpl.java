package com.webbanhang.shop.Service.Admins.Impl;

import com.webbanhang.shop.DTO.Admins.AdminAccountUpsertRequest;
import com.webbanhang.shop.Model.Admins.AdminAccount;
import com.webbanhang.shop.Model.Roles.Role;
import com.webbanhang.shop.Repository.Admins.AdminAccountRepository;
import com.webbanhang.shop.Repository.Customers.CustomerAccountRepository;
import com.webbanhang.shop.Repository.Roles.RoleRepository;
import com.webbanhang.shop.Service.Admins.AdminAccountService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Service
public class AdminAccountServiceImpl implements AdminAccountService {

    private final AdminAccountRepository adminAccountRepository;
    private final RoleRepository roleRepository;
    private final CustomerAccountRepository customerAccountRepository;
    private final PasswordEncoder passwordEncoder;

    public AdminAccountServiceImpl(
            AdminAccountRepository adminAccountRepository,
            RoleRepository roleRepository,
            CustomerAccountRepository customerAccountRepository,
            PasswordEncoder passwordEncoder
    ) {
        this.adminAccountRepository = adminAccountRepository;
        this.roleRepository = roleRepository;
        this.customerAccountRepository = customerAccountRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public List<AdminAccount> findAllActive() {
        return adminAccountRepository.findAllByDeletedAtIsNull();
    }

    @Override
    public List<AdminAccount> findAllTrashed() {
        return adminAccountRepository.findAllByDeletedAtIsNotNullOrderByDeletedAtDesc();
    }

    @Override
    public Optional<AdminAccount> findById(Integer id) {
        return adminAccountRepository.findByAccountId(id);
    }

    @Override
    public AdminAccount create(AdminAccountUpsertRequest req) {
        validateUniqueFields(req, null);
        AdminAccount admin = new AdminAccount();
        applyRequest(admin, req, true);
        admin.setAccountId(null);
        return adminAccountRepository.save(admin);
    }

    @Override
    public Optional<AdminAccount> update(Integer id, AdminAccountUpsertRequest req) {
        return adminAccountRepository.findByAccountId(id).map(existing -> {
            validateUniqueFields(req, id);
            applyRequest(existing, req, false);
            return adminAccountRepository.save(existing);
        });
    }

    @Override
    public Optional<AdminAccount> changePassword(Integer id, String oldPassword, String newPassword) {
        if (oldPassword == null || oldPassword.isBlank()) {
            throw new IllegalArgumentException("Vui lòng nhập mật khẩu cũ.");
        }
        if (newPassword == null || newPassword.isBlank()) {
            throw new IllegalArgumentException("Vui lòng nhập mật khẩu mới.");
        }
        if (newPassword.length() < 6) {
            throw new IllegalArgumentException("Mật khẩu mới phải có ít nhất 6 ký tự.");
        }

        return adminAccountRepository.findByAccountId(id).map(existing -> {
            if (!passwordMatches(oldPassword, existing.getPassword())) {
                throw new IllegalArgumentException("Mật khẩu cũ không đúng.");
            }
            existing.setPassword(passwordEncoder.encode(newPassword));
            return adminAccountRepository.save(existing);
        });
    }

    private boolean passwordMatches(String rawPassword, String storedPassword) {
        if (rawPassword == null || storedPassword == null) return false;
        String p = storedPassword.trim();
        if (p.startsWith("$2a$") || p.startsWith("$2b$") || p.startsWith("$2y$")) {
            return passwordEncoder.matches(rawPassword, p);
        }
        return rawPassword.equals(storedPassword);
    }

    @Override
    public boolean softDelete(Integer id) {
        return adminAccountRepository.findById(id).map(existing -> {
            if (existing.getDeletedAt() != null) {
                return true;
            }
            existing.setDeletedAt(Instant.now());
            adminAccountRepository.save(existing);
            return true;
        }).orElse(false);
    }

    @Override
    public boolean restore(Integer id) {
        return adminAccountRepository.findById(id).map(existing -> {
            existing.setDeletedAt(null);
            adminAccountRepository.save(existing);
            return true;
        }).orElse(false);
    }

    @Override
    public boolean deleteForever(Integer id) {
        return adminAccountRepository.findById(id).map(existing -> {
            adminAccountRepository.deleteById(id);
            return true;
        }).orElse(false);
    }

    private void applyRequest(AdminAccount admin, AdminAccountUpsertRequest req, boolean creating) {
        admin.setFullName(req.fullName());
        admin.setUsername(req.username());
        admin.setEmail(req.email());
        admin.setPhone(req.phone());
        admin.setAddress(req.address());

        Role role = roleRepository.findById(req.roleId())
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy vai trò."));
        admin.setRole(role);

        if (creating) {
            if (req.password() == null || req.password().isBlank()) {
                throw new IllegalArgumentException("Vui lòng nhập mật khẩu.");
            }
            admin.setPassword(passwordEncoder.encode(req.password()));
        } else {
            if (req.password() != null && !req.password().isBlank()) {
                admin.setPassword(passwordEncoder.encode(req.password()));
            }
        }
    }

    private void validateUniqueFields(AdminAccountUpsertRequest req, Integer excludeId) {
        String username = req.username();
        String email = req.email();
        String phone = req.phone();

        // Check unique within accounts table
        if (username != null && !username.isBlank()) {
            var existing = adminAccountRepository.findByUsernameAndDeletedAtIsNull(username);
            if (existing.isPresent() && !existing.get().getAccountId().equals(excludeId)) {
                throw new IllegalArgumentException("Tên đăng nhập đã tồn tại.");
            }
        }

        if (email != null && !email.isBlank()) {
            var existing = adminAccountRepository.findByEmailAndDeletedAtIsNull(email.toLowerCase());
            if (existing.isPresent() && !existing.get().getAccountId().equals(excludeId)) {
                throw new IllegalArgumentException("Email đã tồn tại.");
            }
        }

        if (phone != null && !phone.isBlank()) {
            var existing = adminAccountRepository.findByPhoneAndDeletedAtIsNull(phone);
            if (existing.isPresent() && !existing.get().getAccountId().equals(excludeId)) {
                throw new IllegalArgumentException("Số điện thoại đã tồn tại.");
            }
        }

        // Check unique against customers table
        if (username != null && !username.isBlank()) {
            if (customerAccountRepository.findByUsername(username).isPresent()) {
                throw new IllegalArgumentException("Tên đăng nhập đã tồn tại trong hệ thống khách hàng.");
            }
        }

        if (email != null && !email.isBlank()) {
            if (customerAccountRepository.findByEmail(email.toLowerCase()).isPresent()) {
                throw new IllegalArgumentException("Email đã tồn tại trong hệ thống khách hàng.");
            }
        }

        if (phone != null && !phone.isBlank()) {
            if (customerAccountRepository.findByPhone(phone).isPresent()) {
                throw new IllegalArgumentException("Số điện thoại đã tồn tại trong hệ thống khách hàng.");
            }
        }
    }
}
