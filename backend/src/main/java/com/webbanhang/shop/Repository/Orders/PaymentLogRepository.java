package com.webbanhang.shop.Repository.Orders;

import com.webbanhang.shop.Model.Orders.PaymentLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PaymentLogRepository extends JpaRepository<PaymentLog, Long> {
    List<PaymentLog> findByOrderIdOrderByCreatedAtDesc(Integer orderId);
    List<PaymentLog> findByPaymentIdOrderByCreatedAtDesc(Integer paymentId);
    List<PaymentLog> findByPaymentAttemptIdOrderByCreatedAtDesc(Integer paymentAttemptId);
}
