package com.webbanhang.shop.Service.Customers.Impl;

import com.webbanhang.shop.DTO.Customers.ChangePasswordRequest;
import com.webbanhang.shop.DTO.Customers.CustomerAccountUpsertRequest;
import com.webbanhang.shop.Model.Customers.CustomerAccount;
import com.webbanhang.shop.Repository.Customers.CustomerAccountRepository;
import com.webbanhang.shop.Service.Customers.CustomerAccountService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
@SuppressWarnings("null")
public class CustomerAccountServiceImpl implements CustomerAccountService {

    private final CustomerAccountRepository customerAccountRepository;
    private final PasswordEncoder passwordEncoder;

    public CustomerAccountServiceImpl(CustomerAccountRepository customerAccountRepository, PasswordEncoder passwordEncoder) {
        this.customerAccountRepository = customerAccountRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public List<CustomerAccount> findAllActive() {
        return customerAccountRepository.findAllByDeletedAtIsNull();
    }

    @Override
    public List<CustomerAccount> findAllTrashed() {
        return customerAccountRepository.findAllByDeletedAtIsNotNullOrderByDeletedAtDesc();
    }

    @Override
    public Optional<CustomerAccount> findById(Integer id) {
        return customerAccountRepository.findByCustomerId(id);
    }

    @Override
    public CustomerAccount create(CustomerAccountUpsertRequest req) {
        validateUniqueFields(req, null);
        CustomerAccount customer = new CustomerAccount();
        applyRequest(customer, req);
        customer.setCustomerId(null);
        customer.setDeletedAt(null);
        return customerAccountRepository.save(customer);
    }

    @Override
    public Optional<CustomerAccount> update(Integer id, CustomerAccountUpsertRequest req) {
        return customerAccountRepository.findByCustomerId(id).map(existing -> {
            validateUniqueFields(req, id);
            applyRequest(existing, req);
            return customerAccountRepository.save(existing);
        });
    }

    @Override
    public void changePassword(Integer id, ChangePasswordRequest req) {
        CustomerAccount customer = customerAccountRepository.findByCustomerId(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy người dùng."));

        if (!passwordEncoder.matches(req.currentPassword(), customer.getPassword())) {
            throw new IllegalArgumentException("Mật khẩu hiện tại không chính xác.");
        }

        if (req.newPassword() == null || req.newPassword().length() < 8) {
            throw new IllegalArgumentException("Mật khẩu mới phải có ít nhất 8 ký tự.");
        }

        customer.setPassword(passwordEncoder.encode(req.newPassword()));
        customerAccountRepository.save(customer);
    }

    @Override
    public boolean softDelete(Integer id) {
        return customerAccountRepository.findByCustomerId(id).map(existing -> {
            if (existing.getDeletedAt() != null) return true;
            existing.setDeletedAt(java.time.Instant.now());
            customerAccountRepository.save(existing);
            return true;
        }).orElse(false);
    }

    @Override
    public boolean restore(Integer id) {
        return customerAccountRepository.findByCustomerId(id).map(existing -> {
            existing.setDeletedAt(null);
            customerAccountRepository.save(existing);
            return true;
        }).orElse(false);
    }

    @Override
    public boolean deleteForever(Integer id) {
        return customerAccountRepository.findByCustomerId(id).map(existing -> {
            customerAccountRepository.delete(existing);
            return true;
        }).orElse(false);
    }

    private void applyRequest(CustomerAccount customer, CustomerAccountUpsertRequest req) {
        customer.setFullName(req.fullName());
        customer.setUsername(req.username());
        customer.setEmail(req.email());
        customer.setPhone(req.phone());
        customer.setAddress(req.address());

        if (req.password() != null && !req.password().isBlank()) {
            customer.setPassword(passwordEncoder.encode(req.password()));
        }
    }

    private void validateUniqueFields(CustomerAccountUpsertRequest req, Integer excludeId) {
        String username = req.username();
        String email = req.email();
        String phone = req.phone();

        // Check unique within customers table
        if (username != null && !username.isBlank()) {
            var existing = customerAccountRepository.findByUsername(username);
            if (existing.isPresent() && !existing.get().getCustomerId().equals(excludeId)) {
                throw new IllegalArgumentException("Tên đăng nhập đã tồn tại.");
            }
        }

        if (email != null && !email.isBlank()) {
            var existing = customerAccountRepository.findByEmail(email.toLowerCase());
            if (existing.isPresent() && !existing.get().getCustomerId().equals(excludeId)) {
                throw new IllegalArgumentException("Email đã tồn tại.");
            }
        }

        if (phone != null && !phone.isBlank()) {
            var existing = customerAccountRepository.findByPhone(phone);
            if (existing.isPresent() && !existing.get().getCustomerId().equals(excludeId)) {
                throw new IllegalArgumentException("Số điện thoại đã tồn tại.");
            }
        }
    }
}
