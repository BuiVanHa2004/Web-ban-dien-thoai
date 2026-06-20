package com.webbanhang.shop.Repository;

import com.webbanhang.shop.Model.Refunds.Refund;
import com.webbanhang.shop.Model.Refunds.RefundStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface RefundRepository extends JpaRepository<Refund, Integer> {

    // Find by refund_code
    Optional<Refund> findByRefundCodeAndDeletedAtIsNull(String refundCode);

    // Find by order_id (for unique constraint check)
    @Query("SELECT r FROM Refund r WHERE r.orderId = :orderId " +
           "AND r.deletedAt IS NULL " +
           "AND r.refundStatus NOT IN ('REJECTED', 'CANCELLED')")
    Optional<Refund> findActiveRefundByOrderId(@Param("orderId") Integer orderId);

    // Find by customer_id with pagination
    @Query("SELECT r FROM Refund r WHERE r.customerId = :customerId " +
           "AND r.deletedAt IS NULL " +
           "ORDER BY r.createdAt DESC")
    Page<Refund> findByCustomerId(@Param("customerId") Integer customerId, Pageable pageable);

    // Find by status for admin
    @Query("SELECT r FROM Refund r WHERE r.refundStatus = :status " +
           "AND r.deletedAt IS NULL " +
           "ORDER BY r.createdAt DESC")
    Page<Refund> findByStatus(@Param("status") RefundStatus status, Pageable pageable);

    // Find recently updated for admin dashboard
    @Query("SELECT r FROM Refund r WHERE r.deletedAt IS NULL " +
           "AND r.updatedAt >= :since " +
           "ORDER BY r.updatedAt DESC")
    List<Refund> findRecentlyUpdated(@Param("since") LocalDateTime since);

    // Check idempotency key
    Optional<Refund> findByIdempotencyKey(String idempotencyKey);

    // Find by order_id (for customer query)
    @Query("SELECT r FROM Refund r WHERE r.orderId = :orderId " +
           "AND r.customerId = :customerId " +
           "AND r.deletedAt IS NULL")
    Optional<Refund> findByOrderIdAndCustomerId(@Param("orderId") Integer orderId, 
                                                  @Param("customerId") Integer customerId);

    // Count by status (for statistics)
    @Query("SELECT COUNT(r) FROM Refund r WHERE r.refundStatus = :status " +
           "AND r.deletedAt IS NULL")
    long countByStatus(@Param("status") RefundStatus status);

    // Find all for admin with filters
    @Query("SELECT r FROM Refund r WHERE r.deletedAt IS NULL " +
           "AND (:status IS NULL OR r.refundStatus = :status) " +
           "AND (:customerId IS NULL OR r.customerId = :customerId) " +
           "ORDER BY r.createdAt DESC")
    Page<Refund> findAllWithFilters(@Param("status") RefundStatus status,
                                     @Param("customerId") Integer customerId,
                                     Pageable pageable);
}
