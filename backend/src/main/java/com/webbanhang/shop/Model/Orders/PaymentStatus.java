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
            throw new IllegalStateException(
                String.format(
                    "Invalid payment status transition: %s -> %s. Allowed transitions from %s: %s",
                    from, to, from, ALLOWED_TRANSITIONS.get(from)
                )
            );
        }
    }
    
    /**
     * Check if this status is a terminal state
     */
    public boolean isTerminal() {
        return this == REFUNDED;
    }
}


