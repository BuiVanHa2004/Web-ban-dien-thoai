package com.webbanhang.shop.Repository.Carts;

import com.webbanhang.shop.Model.Carts.CartItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface CartItemRepository extends JpaRepository<CartItem, Integer> {
    @Query("""
            select ci from CartItem ci
            join fetch ci.product p
            where ci.cart.cartId = :cartId
            """)
    List<CartItem> findAllByCartIdWithProduct(@Param("cartId") Integer cartId);

    @Query("""
            select ci from CartItem ci
            where ci.cart.cartId = :cartId
              and ci.product.productId = :productId
              and ((:productColorId is null and ci.productColorId is null) or ci.productColorId = :productColorId)
              and ((:productVariantId is null and ci.productVariantId is null) or ci.productVariantId = :productVariantId)
            """)
    Optional<CartItem> findOneLine(
            @Param("cartId") Integer cartId,
            @Param("productId") Integer productId,
            @Param("productColorId") Integer productColorId,
            @Param("productVariantId") Integer productVariantId
    );
}

