package com.webbanhang.shop.Repository.Carts;

import com.webbanhang.shop.Model.Carts.Cart;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CartRepository extends JpaRepository<Cart, Integer> {
    Optional<Cart> findByCustomerId(Integer customerId);
}

