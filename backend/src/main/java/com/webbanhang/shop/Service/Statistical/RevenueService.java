package com.webbanhang.shop.Service.Statistical;

import com.webbanhang.shop.Model.Orders.Order;
import com.webbanhang.shop.Model.Orders.OrderStatus;
import com.webbanhang.shop.Model.Orders.PaymentStatus;
import com.webbanhang.shop.Repository.Orders.OrderRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Revenue Service - Production-grade revenue calculation
 * 
 * ✅ CRITICAL RULE:
 * Revenue ONLY counts orders that meet ALL conditions:
 * 1. Order status = DELIVERED (đã giao hàng thành công)
 * 2. Payment status = PAID (đã thanh toán)
 * 3. Payment status != REFUNDED (chưa bị hoàn tiền)
 * 
 * This ensures revenue only reflects ACTUAL completed sales with confirmed payment.
 */
@Service
public class RevenueService {

    private final OrderRepository orderRepository;

    public RevenueService(OrderRepository orderRepository) {
        this.orderRepository = orderRepository;
    }

    /**
     * Calculate total revenue for a date range
     * 
     * @param startDate Start date (inclusive)
     * @param endDate End date (inclusive)
     * @return Total revenue from completed orders
     */
    @Transactional(readOnly = true)
    public BigDecimal calculateRevenue(LocalDateTime startDate, LocalDateTime endDate) {
        List<Order> eligibleOrders = orderRepository.findRevenueOrders(
            OrderStatus.DELIVERED,
            PaymentStatus.PAID,
            startDate,
            endDate
        );

        return eligibleOrders.stream()
            .filter(order -> order.getPaymentStatus() != PaymentStatus.REFUNDED)
            .filter(order -> order.getPaymentStatus() != PaymentStatus.REFUND_PENDING)
            .map(Order::getTotalAmount)
            .filter(amount -> amount != null)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    /**
     * Calculate revenue for current month
     */
    @Transactional(readOnly = true)
    public BigDecimal calculateMonthlyRevenue() {
        LocalDateTime startOfMonth = LocalDateTime.now()
            .withDayOfMonth(1)
            .withHour(0)
            .withMinute(0)
            .withSecond(0)
            .withNano(0);
        
        LocalDateTime now = LocalDateTime.now();
        
        return calculateRevenue(startOfMonth, now);
    }

    /**
     * Calculate revenue for current year
     */
    @Transactional(readOnly = true)
    public BigDecimal calculateYearlyRevenue() {
        LocalDateTime startOfYear = LocalDateTime.now()
            .withDayOfYear(1)
            .withHour(0)
            .withMinute(0)
            .withSecond(0)
            .withNano(0);
        
        LocalDateTime now = LocalDateTime.now();
        
        return calculateRevenue(startOfYear, now);
    }

    /**
     * Calculate total all-time revenue
     */
    @Transactional(readOnly = true)
    public BigDecimal calculateTotalRevenue() {
        List<Order> allOrders = orderRepository.findAll();
        
        return allOrders.stream()
            .filter(order -> order.getOrderStatus() == OrderStatus.DELIVERED)
            .filter(order -> order.getPaymentStatus() == PaymentStatus.PAID)
            .filter(order -> order.getPaymentStatus() != PaymentStatus.REFUNDED)
            .filter(order -> order.getPaymentStatus() != PaymentStatus.REFUND_PENDING)
            .filter(order -> order.getDeletedAt() == null)
            .map(Order::getTotalAmount)
            .filter(amount -> amount != null)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    /**
     * Count completed orders (for statistics)
     */
    @Transactional(readOnly = true)
    public long countCompletedOrders(LocalDateTime startDate, LocalDateTime endDate) {
        List<Order> eligibleOrders = orderRepository.findRevenueOrders(
            OrderStatus.DELIVERED,
            PaymentStatus.PAID,
            startDate,
            endDate
        );

        return eligibleOrders.stream()
            .filter(order -> order.getPaymentStatus() != PaymentStatus.REFUNDED)
            .filter(order -> order.getPaymentStatus() != PaymentStatus.REFUND_PENDING)
            .count();
    }
}
