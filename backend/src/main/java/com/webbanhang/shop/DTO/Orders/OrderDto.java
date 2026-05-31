package com.webbanhang.shop.DTO.Orders;

import com.webbanhang.shop.Model.Orders.Order;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record OrderDto(
        Integer orderId,
        String orderCode,
        Integer customerId,
        String customerName,
        String email,
        String receiverName,
        String receiverPhone,
        String shippingAddress,
        String orderStatus,
        String paymentMethod,
        String paymentStatus,
        BigDecimal totalAmount,
        List<OrderItemDto> items,
        Instant createdAt,
        Instant updatedAt,
        Instant deletedAt,
        String adminNote,
        String adminNoteAuthor,
        String adminNoteDate,
        Integer cancelReasonId,
        String cancelNote,
        String cancelledBy,
        java.time.LocalDateTime cancelledAt,
        String cancelReasonName,
        Integer cancelledByAdminId,
        String cancelledByName
) {
    public static OrderDto fromEntity(Order o) {
        return fromEntity(o, null);
    }

    public static OrderDto fromEntity(Order o, String reasonName) {
        List<OrderItemDto> items = o.getItems() == null
                ? List.of()
                : o.getItems().stream().map(OrderItemDto::fromEntity).toList();

        return new OrderDto(
                o.getOrderId(),
                o.getOrderCode(),
                o.getCustomerId(),
                o.getCustomerName(),
                o.getEmail(),
                o.getReceiverName(),
                o.getReceiverPhone(),
                o.getShippingAddress(),
                o.getOrderStatus() != null ? o.getOrderStatus().name() : null,
                o.getPaymentMethod(),
                o.getPaymentStatus() != null ? o.getPaymentStatus().name() : null,
                o.getTotalAmount(),
                items,
                o.getCreatedAt(),
                o.getUpdatedAt(),
                o.getDeletedAt(),
                o.getPaymentNote(),
                o.getPaymentNoteAuthor(),
                o.getPaymentNoteDate() != null ? o.getPaymentNoteDate().toString() : null,
                o.getCancelReasonId(),
                o.getCancelNote(),
                o.getCancelledBy() != null ? o.getCancelledBy().name() : null,
                o.getCancelledAt(),
                reasonName,
                o.getCancelledByAdminId(),
                o.getCancelledByName()
        );
    }
}
