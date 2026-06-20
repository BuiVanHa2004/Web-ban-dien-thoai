package com.webbanhang.shop.Repository.Orders;

import com.webbanhang.shop.Model.Orders.PaymentAttempt;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PaymentAttemptRepository extends JpaRepository<PaymentAttempt, Integer> {
    Optional<PaymentAttempt> findTopByOrderIdOrderByCreatedAtDesc(Integer orderId);

    /** Latest bill in the admin queue for this order (same filter as getPaymentAttempts). */
    Optional<PaymentAttempt> findTopByOrderIdAndStatusAndTransferImageUrlIsNotNullOrderByCreatedAtDesc(
            Integer orderId, String status);

    List<PaymentAttempt> findAllByOrderIdOrderByCreatedAtDesc(Integer orderId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT pa FROM PaymentAttempt pa WHERE pa.attemptId = :id")
    Optional<PaymentAttempt> findByIdWithLock(Integer id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT pa FROM PaymentAttempt pa WHERE pa.orderId = :orderId ORDER BY pa.createdAt DESC")
    Optional<PaymentAttempt> findTopByOrderIdOrderByCreatedAtDescWithLock(Integer orderId);

    List<PaymentAttempt> findByStatusAndTransferImageUrlIsNotNullOrderByCreatedAtDesc(String status);
    List<PaymentAttempt> findAllByStatusInAndTransferImageUrlIsNotNullOrderByCreatedAtDesc(List<String> statuses);
    List<PaymentAttempt> findAllByArchivedAtIsNotNullOrderByArchivedAtDesc();
}
