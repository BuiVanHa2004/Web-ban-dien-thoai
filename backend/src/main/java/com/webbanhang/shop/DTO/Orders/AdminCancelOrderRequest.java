package com.webbanhang.shop.DTO.Orders;

import jakarta.validation.constraints.NotNull;

public record AdminCancelOrderRequest(
        @NotNull(message = "Lý do hủy là bắt buộc")
        Integer reasonId,
        String cancelNote
) {}
