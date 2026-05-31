package com.webbanhang.shop.DTO.Payments;

import com.webbanhang.shop.Model.Orders.Order;
import com.webbanhang.shop.Model.Orders.OrderStatus;
import com.webbanhang.shop.Model.Orders.PaymentStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SelectableOrderDto {
    private Integer orderId;
    private String orderCode;
    private String receiverName;
    private BigDecimal totalAmount;
    /** Enum name, same as chi tiết thanh toán admin */
    private String orderStatus;
    private String paymentStatus;
    private String paymentMethod;

    public static SelectableOrderDto fromEntity(Order order) {
        OrderStatus os = order.getOrderStatus();
        PaymentStatus ps = order.getPaymentStatus();
        return SelectableOrderDto.builder()
                .orderId(order.getOrderId())
                .orderCode(order.getOrderCode())
                .receiverName(order.getReceiverName() != null ? order.getReceiverName() : order.getCustomerName())
                .totalAmount(order.getTotalAmount())
                .orderStatus(os != null ? os.name() : null)
                .paymentStatus(ps != null ? ps.name() : null)
                .paymentMethod(order.getPaymentMethod())
                .build();
    }
}
