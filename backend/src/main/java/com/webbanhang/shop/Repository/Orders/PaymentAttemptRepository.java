package com.webbanhang.shop.Repository.Orders;

import com.webbanhang.shop.Model.Orders.PaymentAttempt;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
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
    
    // Active bills for PaymentPage (exclude archived and soft deleted)
    List<PaymentAttempt> findByStatusAndTransferImageUrlIsNotNullAndArchivedAtIsNullAndDeletedAtIsNullOrderByCreatedAtDesc(String status);
    List<PaymentAttempt> findAllByStatusInAndTransferImageUrlIsNotNullAndArchivedAtIsNullAndDeletedAtIsNullOrderByCreatedAtDesc(List<String> statuses);
    
    // Archived bills (exclude soft deleted)
    List<PaymentAttempt> findAllByArchivedAtIsNotNullAndDeletedAtIsNullAndTransferImageUrlIsNotNullOrderByArchivedAtDesc();
    
    // Trash queries (soft deleted bills)
    List<PaymentAttempt> findAllByDeletedAtIsNotNullOrderByDeletedAtDesc();
    Optional<PaymentAttempt> findByAttemptIdAndDeletedAtIsNotNull(Integer attemptId);
    
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE PaymentAttempt pa SET pa.archivedAt = :archivedAt WHERE pa.attemptId = :attemptId")
    int updateArchivedAt(@Param("attemptId") Integer attemptId, @Param("archivedAt") LocalDateTime archivedAt);
    
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE PaymentAttempt pa SET pa.archivedOrderCode = :orderCode, pa.archivedAdminNote = :adminNote WHERE pa.attemptId = :attemptId")
    int updateArchiveSnapshot(@Param("attemptId") Integer attemptId, @Param("orderCode") String orderCode, @Param("adminNote") String adminNote);
    
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE PaymentAttempt pa SET pa.orderId = null WHERE pa.attemptId = :attemptId")
    int updateOrderIdToNull(@Param("attemptId") Integer attemptId);
}
