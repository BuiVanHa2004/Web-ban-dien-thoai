package com.webbanhang.shop.DTO.Orders;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record CreateOrderRequest(
        @NotNull Integer customerId,
        @NotBlank String receiverName,
        @NotBlank String receiverPhone,
        @NotBlank String shippingAddress,
        @NotEmpty @Valid List<CreateOrderItemRequest> items,
        String paymentMethod
) {
}
