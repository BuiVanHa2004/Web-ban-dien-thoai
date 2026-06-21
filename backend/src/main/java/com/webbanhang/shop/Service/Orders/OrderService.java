package com.webbanhang.shop.Service.Orders;

import com.webbanhang.shop.Model.Orders.Order;
import com.webbanhang.shop.Model.Orders.OrderStatus;
import com.webbanhang.shop.Model.Orders.CancelledBy;
import com.webbanhang.shop.DTO.Orders.CreateOrderItemRequest;

import java.util.List;
import java.util.Optional;

public interface OrderService {
    List<Order> findAll();

    List<Order> findAllByCustomerId(Integer customerId);

    List<Order> findTrash();

    List<Order> findTrashByCustomerId(Integer customerId);

    Optional<Order> findById(Integer id);

    Order createOrder(
            Integer customerId,
            String receiverName,
            String receiverPhone,
            String shippingAddress,
            List<CreateOrderItemRequest> items,
            String paymentMethod
    );

    boolean softDelete(Integer id);

    boolean restore(Integer id);

    boolean deleteForever(Integer id);

    Optional<Order> updateStatus(Integer id, OrderStatus status);

    Optional<Order> payCod(Integer orderId, Integer customerId);
    
    void deductInventory(Order order);
    
    List<Order> getOrdersEligibleForReconciliation();

    Optional<Order> cancelOrder(Integer orderId, Integer customerId, Integer reasonId, String cancelNote, CancelledBy cancelledBy);

    Optional<Order> adminCancelOrder(Integer orderId, Integer adminId, Integer reasonId, String cancelNote);

    void restoreInventory(Order order);
    
    /**
     * ✅ NEW: Update payment status for refund process
     * 
     * @param orderId Order ID
     * @param paymentStatus New payment status (REFUND_PENDING, REFUNDED, PARTIAL_REFUNDED)
     * @param note Admin note explaining the status change
     * @param adminId Admin who performed the action
     * @param adminName Admin name
     * @return Updated order
     */
    Optional<Order> updatePaymentStatus(
            Integer orderId, 
            com.webbanhang.shop.Model.Orders.PaymentStatus paymentStatus, 
            String note, 
            Integer adminId, 
            String adminName
    );
    
    /**
     * Get admin full name by admin ID
     * 
     * @param adminId Admin ID
     * @return Admin full name or null if not found
     */
    String getAdminFullName(Integer adminId);
    
    com.webbanhang.shop.DTO.Orders.OrderDto convertToDto(Order order);
    
    java.util.List<com.webbanhang.shop.DTO.Orders.OrderDto> convertToDtoList(java.util.List<Order> orders);
}
