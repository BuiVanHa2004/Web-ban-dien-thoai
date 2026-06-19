package com.webbanhang.shop.Repository.Orders;

import com.webbanhang.shop.Model.Orders.Payment;
import com.webbanhang.shop.Model.Orders.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PaymentRepository extends JpaRepository<Payment, Integer> {

    Optional<Payment> findTopByOrderIdOrderByCreatedAtDesc(Integer orderId);

    List<Payment> findAllByOrderId(Integer orderId);

    List<Payment> findAllByCustomerIdOrderByCreatedAtDesc(Integer customerId);

    List<Payment> findAllByOrderByCreatedAtDesc();

    @org.springframework.data.jpa.repository.Query("SELECT p FROM Payment p WHERE p.isDeleted = false OR p.isDeleted IS NULL ORDER BY p.createdAt DESC")
    List<Payment> findAllByIsDeletedFalseOrderByCreatedAtDesc();

    List<Payment> findAllByIsDeletedTrueOrderByDeletedAtDesc();

    List<Payment> findAllByPaymentStatusOrderByCreatedAtDesc(PaymentStatus paymentStatus);
}
