package com.webbanhang.shop.Model.Orders;

public enum PaymentStatus {
    UNPAID,
    WAITING_CONFIRM,
    PAID,
    FAILED,
    REOPENED,
    REFUND_PENDING,  // Đang chờ hoàn tiền
    REFUNDED,        // Đã hoàn tiền
    PARTIAL_REFUNDED, // Hoàn 1 phần
    PARTIAL_PAID
}

