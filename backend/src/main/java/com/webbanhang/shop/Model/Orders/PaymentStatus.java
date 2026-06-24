package com.webbanhang.shop.Model.Orders;

import java.util.Set;
import java.util.Map;

/**
 * Payment Status State Machine
 * Enforces valid payment status transitions
 */
public enum PaymentStatus {
    UNPAID,
    WAITING_CONFIRM,     // Chờ xác nhận thanh toán (BANK_TRANSFER)
    PAID,
    FAILED,
    REOPENED,
    REFUND_PENDING,      // Đang chờ hoàn tiền
    REFUNDED,            // Đã hoàn tiền
    PARTIAL_REFUNDED,    // Hoàn 1 phần
    PARTIAL_PAID;
    
    /**
     * Valid payment status transitions
     */
    private static final Map<PaymentStatus, Set<PaymentStatus>> ALLOWED_TRANSITIONS = Map.of(
        UNPAID, Set.of(WAITING_CONFIRM, PAID, FAILED),
        WAITING_CONFIRM, Set.of(PAID, FAILED, UNPAID),
        PAID, Set.of(REFUND_PENDING, PARTIAL_REFUNDED),
        FAILED, Set.of(REOPENED, UNPAID),
        REOPENED, Set.of(WAITING_CONFIRM, PAID, FAILED),
        REFUND_PENDING, Set.of(REFUNDED, PARTIAL_REFUNDED, FAILED),
        REFUNDED, Set.of(), // Terminal state
        PARTIAL_REFUNDED, Set.of(REFUND_PENDING, REFUNDED),
        PARTIAL_PAID, Set.of(PAID, FAILED, REFUND_PENDING)
    );
    
    /**
     * Check if transition is valid
     */
    public static boolean isValidTransition(PaymentStatus from, PaymentStatus to) {
        if (from == null || to == null) {
            return false;
        }
        
        if (from == to) {
            return true;
        }
        
        Set<PaymentStatus> allowedNextStates = ALLOWED_TRANSITIONS.get(from);
        return allowedNextStates != null && allowedNextStates.contains(to);
    }
    
    /**
     * Validate and throw exception if transition is invalid
     */
    public static void validateTransition(PaymentStatus from, PaymentStatus to) {
        if (!isValidTransition(from, to)) {
            String fromVi = getVietnameseName(from);
            String toVi = getVietnameseName(to);
            Set<PaymentStatus> allowed = ALLOWED_TRANSITIONS.get(from);
            String allowedVi = allowed == null || allowed.isEmpty() 
                ? "không có trạng thái nào" 
                : allowed.stream()
                    .map(PaymentStatus::getVietnameseName)
                    .reduce((a, b) -> a + ", " + b)
                    .orElse("");
            
            throw new IllegalStateException(
                String.format(
                    "Không thể chuyển trạng thái thanh toán từ '%s' sang '%s'. Các trạng thái được phép: %s",
                    fromVi, toVi, allowedVi
                )
            );
        }
    }
    
    /**
     * Get Vietnamese name for payment status
     */
    public static String getVietnameseName(PaymentStatus status) {
        if (status == null) return "Không xác định";
        return switch (status) {
            case UNPAID -> "Chưa thanh toán";
            case WAITING_CONFIRM -> "Chờ xác nhận thanh toán";
            case PAID -> "Đã thanh toán";
            case FAILED -> "Thanh toán thất bại";
            case REOPENED -> "Mở lại thanh toán";
            case REFUND_PENDING -> "Chờ hoàn tiền";
            case REFUNDED -> "Đã hoàn tiền";
            case PARTIAL_REFUNDED -> "Hoàn tiền một phần";
            case PARTIAL_PAID -> "Thanh toán một phần";
        };
    }
    
    /**
     * Check if this status is a terminal state
     */
    public boolean isTerminal() {
        return this == REFUNDED;
    }
}


