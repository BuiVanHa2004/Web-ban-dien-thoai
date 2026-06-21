package com.webbanhang.shop.Model.Orders;

import java.util.Set;
import java.util.Map;

/**
 * Order Status State Machine
 * Enforces valid state transitions to prevent invalid order flow
 */
public enum OrderStatus {
    PENDING_CONFIRM,
    PENDING_PAYMENT_CONFIRMATION,
    CONFIRMED,
    SHIPPING,
    PENDING_PICKUP,
    PENDING_SHIPPING,
    DELIVERED,
    CANCELLED;
    
    /**
     * Valid state transitions
     * Key: Current state
     * Value: Set of allowed next states
     */
    private static final Map<OrderStatus, Set<OrderStatus>> ALLOWED_TRANSITIONS = Map.of(
        PENDING_CONFIRM, Set.of(PENDING_PAYMENT_CONFIRMATION, CONFIRMED, CANCELLED),
        PENDING_PAYMENT_CONFIRMATION, Set.of(CONFIRMED, CANCELLED),
        CONFIRMED, Set.of(PENDING_PICKUP, SHIPPING, PENDING_SHIPPING, CANCELLED),
        PENDING_PICKUP, Set.of(SHIPPING, PENDING_SHIPPING, CANCELLED),
        PENDING_SHIPPING, Set.of(SHIPPING, CANCELLED),
        SHIPPING, Set.of(DELIVERED, CANCELLED),
        DELIVERED, Set.of(), // Terminal state - cannot transition (except refund)
        CANCELLED, Set.of()  // Terminal state
    );
    
    /**
     * Check if transition from current state to new state is valid
     * 
     * @param from Current order status
     * @param to Target order status
     * @return true if transition is allowed
     */
    public static boolean isValidTransition(OrderStatus from, OrderStatus to) {
        if (from == null || to == null) {
            return false;
        }
        
        // Allow staying in same state
        if (from == to) {
            return true;
        }
        
        Set<OrderStatus> allowedNextStates = ALLOWED_TRANSITIONS.get(from);
        return allowedNextStates != null && allowedNextStates.contains(to);
    }
    
    /**
     * Validate and throw exception if transition is invalid
     * 
     * @param from Current order status
     * @param to Target order status
     * @throws IllegalStateException if transition is not allowed
     */
    public static void validateTransition(OrderStatus from, OrderStatus to) {
        if (!isValidTransition(from, to)) {
            throw new IllegalStateException(
                String.format(
                    "Invalid order status transition: %s -> %s. Allowed transitions from %s: %s",
                    from, to, from, ALLOWED_TRANSITIONS.get(from)
                )
            );
        }
    }
    
    /**
     * Check if this status is a terminal state (cannot be changed)
     */
    public boolean isTerminal() {
        return this == DELIVERED || this == CANCELLED;
    }
}

