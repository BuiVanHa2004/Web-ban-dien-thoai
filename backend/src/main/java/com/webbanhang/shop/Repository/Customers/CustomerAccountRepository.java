package com.webbanhang.shop.Repository.Customers;

import com.webbanhang.shop.Model.Customers.CustomerAccount;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CustomerAccountRepository extends JpaRepository<CustomerAccount, Integer> {

    Optional<CustomerAccount> findByCustomerId(Integer customerId);
    
    java.util.List<CustomerAccount> findAllByDeletedAtIsNull();

    java.util.List<CustomerAccount> findAllByDeletedAtIsNotNullOrderByDeletedAtDesc();

    Optional<CustomerAccount> findByUsername(String username);

    Optional<CustomerAccount> findByEmail(String email);

    Optional<CustomerAccount> findByGoogleId(String googleId);

    Optional<CustomerAccount> findByPhone(String phone);
    
    boolean existsByPhone(String phone);
    
    boolean existsByUsername(String username);
    
    boolean existsByEmail(String email);
}
