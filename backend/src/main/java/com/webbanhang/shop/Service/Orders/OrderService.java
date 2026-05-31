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

    Optional<Order> payOnline(Integer orderId, Integer customerId);
    
    void deductInventory(Order order);
    
    List<Order> getOrdersEligibleForReconciliation();

    Optional<Order> cancelOrder(Integer orderId, Integer customerId, Integer reasonId, String cancelNote, CancelledBy cancelledBy);

    Optional<Order> adminCancelOrder(Integer orderId, Integer adminId, Integer reasonId, String cancelNote);

    void restoreInventory(Order order);
    
    com.webbanhang.shop.DTO.Orders.OrderDto convertToDto(Order order);
    
    java.util.List<com.webbanhang.shop.DTO.Orders.OrderDto> convertToDtoList(java.util.List<Order> orders);
}
