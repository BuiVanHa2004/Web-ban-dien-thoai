package com.webbanhang.shop.Model.Orders;

public enum OrderStatus {
    PENDING_CONFIRM,
    PENDING_PAYMENT_CONFIRMATION,
    CONFIRMED,
    SHIPPING,
    PENDING_PICKUP,
    DELIVERED,
    CANCELLED
}
