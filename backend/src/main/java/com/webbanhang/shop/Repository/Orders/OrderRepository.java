package com.webbanhang.shop.Repository.Orders;

import com.webbanhang.shop.Model.Orders.Order;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface OrderRepository extends JpaRepository<Order, Integer> {

    @Override
    @EntityGraph(attributePaths = {"items"})
    @org.springframework.lang.NonNull
    List<Order> findAll();

    @EntityGraph(attributePaths = {"items"})
    List<Order> findAllByCustomerId(Integer customerId);

    @EntityGraph(attributePaths = {"items"})
    List<Order> findAllByDeletedAtIsNull();

    @EntityGraph(attributePaths = {"items"})
    List<Order> findAllByDeletedAtIsNullAndCustomerId(Integer customerId);

    @EntityGraph(attributePaths = {"items"})
    List<Order> findAllByDeletedAtIsNotNull();

    @EntityGraph(attributePaths = {"items"})
    List<Order> findAllByDeletedAtIsNotNullAndCustomerId(Integer customerId);

    @EntityGraph(attributePaths = {"items"})
    Optional<Order> findByOrderId(Integer orderId);
    
    @EntityGraph(attributePaths = {"items"})
    Optional<Order> findByOrderCode(String orderCode);

    List<Order> findByPaymentMethodAndPaymentStatusNot(String paymentMethod, com.webbanhang.shop.Model.Orders.PaymentStatus status);
    List<Order> findByPaymentMethodInAndPaymentStatusNot(List<String> paymentMethods, com.webbanhang.shop.Model.Orders.PaymentStatus status);
}
