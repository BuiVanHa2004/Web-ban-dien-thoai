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
    
    /**
     * Find potential expired bank transfer orders for auto-cancellation scheduler.
     * Only returns orders that meet ALL of these criteria:
     * - payment_method = 'BANK_TRANSFER'
     * - payment_status = UNPAID
     * - deleted_at IS NULL
     * 
     * This significantly reduces the number of orders loaded into memory
     * compared to findAll(), improving scheduler performance.
     */
    @EntityGraph(attributePaths = {"items"})
    List<Order> findByPaymentMethodAndPaymentStatusAndDeletedAtIsNull(
            String paymentMethod, 
            com.webbanhang.shop.Model.Orders.PaymentStatus paymentStatus
    );
    
    /**
     * ✅ NEW: Find orders eligible for revenue calculation
     * Revenue = DELIVERED + PAID + NOT (REFUNDED or REFUND_PENDING)
     * 
     * @param orderStatus Must be DELIVERED
     * @param paymentStatus Must be PAID
     * @param startDate Start date for filtering
     * @param endDate End date for filtering
     * @return List of completed paid orders
     */
    @org.springframework.data.jpa.repository.Query(
        "SELECT o FROM Order o WHERE " +
        "o.orderStatus = :orderStatus AND " +
        "o.paymentStatus = :paymentStatus AND " +
        "o.deletedAt IS NULL AND " +
        "o.createdAt >= :startDate AND " +
        "o.createdAt <= :endDate"
    )
    List<Order> findRevenueOrders(
        @org.springframework.data.repository.query.Param("orderStatus") com.webbanhang.shop.Model.Orders.OrderStatus orderStatus,
        @org.springframework.data.repository.query.Param("paymentStatus") com.webbanhang.shop.Model.Orders.PaymentStatus paymentStatus,
        @org.springframework.data.repository.query.Param("startDate") java.time.LocalDateTime startDate,
        @org.springframework.data.repository.query.Param("endDate") java.time.LocalDateTime endDate
    );
}
