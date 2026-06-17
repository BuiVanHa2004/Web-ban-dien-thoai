package com.webbanhang.shop.Service.Orders;

import com.webbanhang.shop.Model.Orders.CancelledBy;
import com.webbanhang.shop.Model.Orders.Order;
import com.webbanhang.shop.Model.Orders.OrderStatus;
import com.webbanhang.shop.Model.Orders.PaymentStatus;
import com.webbanhang.shop.Repository.Orders.OrderRepository;
import com.webbanhang.shop.Repository.Orders.PaymentRepository;
import com.webbanhang.shop.Service.Notifications.CustomerNotificationService;
import com.webbanhang.shop.Service.Inventory.InventoryService;
import com.webbanhang.shop.Model.Orders.OrderItem;
import com.webbanhang.shop.DTO.Notifications.NotificationDto;
import com.webbanhang.shop.Model.Notifications.NotificationType;
import com.webbanhang.shop.Model.Notifications.NotificationAction;
import com.webbanhang.shop.Model.Notifications.ActorType;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * Scheduled job để tự động hủy các đơn hàng chuyển khoản quá 30 phút chưa thanh toán
 */
@Component
public class OrderCancellationScheduler {

    private final OrderRepository orderRepository;
    private final PaymentRepository paymentRepository;
    private final CustomerNotificationService customerNotificationService;
    private final InventoryService inventoryService;

    public OrderCancellationScheduler(
            OrderRepository orderRepository,
            PaymentRepository paymentRepository,
            CustomerNotificationService customerNotificationService,
            InventoryService inventoryService
    ) {
        this.orderRepository = orderRepository;
        this.paymentRepository = paymentRepository;
        this.customerNotificationService = customerNotificationService;
        this.inventoryService = inventoryService;
    }

    /**
     * Chạy mỗi 5 phút để kiểm tra và hủy đơn hàng quá hạn
     */
    @Scheduled(fixedRate = 300000) // 5 phút = 300,000 ms
    @Transactional
    public void cancelExpiredOrders() {
        try {
            Instant expiredTime = Instant.now().minus(30, ChronoUnit.MINUTES);
            
            // Tìm các đơn hàng:
            // - payment_method = BANK_TRANSFER
            // - order_status = PENDING_CONFIRM
            // - created_at < 30 phút trước
            List<Order> allOrders = orderRepository.findAll();
            
            int cancelledCount = 0;
            
            for (Order order : allOrders) {
                // Kiểm tra điều kiện hủy
                if (shouldCancelOrder(order, expiredTime)) {
                    cancelOrder(order);
                    cancelledCount++;
                }
            }
            
            if (cancelledCount > 0) {
                System.out.println("[SCHEDULER] Cancelled " + cancelledCount + " expired orders");
            }
            
        } catch (Exception e) {
            System.err.println("[SCHEDULER ERROR] Failed to cancel expired orders: " + e.getMessage());
            e.printStackTrace();
        }
    }

    private boolean shouldCancelOrder(Order order, Instant expiredTime) {
        // Chỉ hủy nếu:
        // 1. Phương thức thanh toán là BANK_TRANSFER
        // 2. Trạng thái là PENDING_CONFIRM
        // 3. created_at quá 30 phút
        // 4. Chưa bị xóa (deleted_at == null)
        
        return "BANK_TRANSFER".equals(order.getPaymentMethod())
                && OrderStatus.PENDING_CONFIRM.equals(order.getOrderStatus())
                && order.getCreatedAt() != null
                && order.getCreatedAt().isBefore(expiredTime)
                && order.getDeletedAt() == null;
    }

    private void cancelOrder(Order order) {
        // Cập nhật order
        order.setOrderStatus(OrderStatus.CANCELLED);
        order.setPaymentStatus(PaymentStatus.FAILED);
        order.setCancelledBy(CancelledBy.SYSTEM);
        order.setCancelledAt(LocalDateTime.now());
        order.setCancelNote("Đơn hàng quá 30 phút chưa thanh toán");
        orderRepository.save(order);
        
        // Release reserved stock
        try {
            for (OrderItem item : order.getItems()) {
                if (item.getVariantId() != null && item.getQuantity() != null && item.getQuantity() > 0) {
                    inventoryService.releaseStock(item.getVariantId(), item.getQuantity());
                }
            }
            System.out.println("[SCHEDULER] Released reserved stock for expired order " + order.getOrderCode());
        } catch (Exception e) {
            System.err.println("[SCHEDULER] Failed to release stock for order " + order.getOrderCode() + ": " + e.getMessage());
        }
        
        // Cập nhật payment
        paymentRepository.findTopByOrderIdOrderByCreatedAtDesc(order.getOrderId())
                .ifPresent(payment -> {
                    payment.setPaymentStatus(PaymentStatus.FAILED);
                    paymentRepository.save(payment);
                });
        
        // Gửi thông báo cho khách hàng
        try {
            customerNotificationService.createNotification(
                NotificationDto.builder()
                    .adminId(order.getCustomerId()) // customerId
                    .type(NotificationType.ORDER)
                    .action(NotificationAction.CANCEL)
                    .actorType(ActorType.SYSTEM)
                    .orderId(order.getOrderId())
                    .title("Đơn hàng đã bị hủy")
                    .message("Đơn hàng " + order.getOrderCode() + " đã bị hủy do quá 30 phút chưa thanh toán")
                    .build()
            );
        } catch (Exception e) {
            System.err.println("[SCHEDULER] Failed to send notification for order " + order.getOrderCode() + ": " + e.getMessage());
        }
        
        System.out.println("[SCHEDULER] Cancelled order: " + order.getOrderCode());
    }
}
