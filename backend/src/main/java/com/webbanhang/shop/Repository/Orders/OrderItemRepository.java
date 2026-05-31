package com.webbanhang.shop.Repository.Orders;

import com.webbanhang.shop.Model.Orders.OrderItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface OrderItemRepository extends JpaRepository<OrderItem, Integer> {
    List<OrderItem> findAllByOrderOrderId(Integer orderId);

    List<OrderItem> findAllByOrderItemIdIn(List<Integer> orderItemIds);

    @Query("""
            select case when count(oi) > 0 then true else false end
            from OrderItem oi
            join ProductVariant pv on oi.variantId = pv.variantId
            join ProductColor pc on pv.productColor.productColorId = pc.productColorId
            where pc.product.productId = :productId
            """)
    boolean existsByProductProductId(@Param("productId") Integer productId);

    @Query("""
            select pc.product.productId, pc.product.productName, coalesce(sum(oi.quantity), 0)
            from OrderItem oi
            join ProductVariant pv on oi.variantId = pv.variantId
            join ProductColor pc on pv.productColor.productColorId = pc.productColorId
            group by pc.product.productId, pc.product.productName
            order by coalesce(sum(oi.quantity), 0) desc
            """)
    List<Object[]> aggregateTopProductsSold();
}
