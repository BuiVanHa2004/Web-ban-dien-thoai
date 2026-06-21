package com.webbanhang.shop.Controller.Admins;

import com.webbanhang.shop.DTO.Orders.AdminCancelOrderRequest;
import com.webbanhang.shop.DTO.Orders.OrderDto;
import com.webbanhang.shop.Service.Orders.OrderService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/orders")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
public class AdminOrderController {

    private final OrderService orderService;

    @PostMapping("/{orderId}/cancel")
    public ResponseEntity<OrderDto> cancelOrder(
            @PathVariable Integer orderId,
            @RequestBody AdminCancelOrderRequest req,
            Authentication authentication
    ) {
        Integer adminId = parseAdminId(authentication);
        return orderService.adminCancelOrder(orderId, adminId, req.reasonId(), req.cancelNote())
                .map(orderService::convertToDto)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * ✅ NEW: Update payment status (for refund process)
     * 
     * @param orderId Order ID
     * @param request { "paymentStatus": "REFUND_PENDING" | "REFUNDED" | "PARTIAL_REFUNDED", "note": "..." }
     * @param authentication Admin authentication
     * @return Updated order DTO
     */
    @PostMapping("/{orderId}/payment-status")
    @PreAuthorize("hasRole('ADMIN')") // ✅ Only ADMIN can process refunds, not STAFF
    public ResponseEntity<?> updatePaymentStatus(
            @PathVariable Integer orderId,
            @RequestBody java.util.Map<String, String> request,
            Authentication authentication
    ) {
        try {
            String statusStr = request.get("paymentStatus");
            String note = request.get("note");
            
            if (statusStr == null || statusStr.isBlank()) {
                return ResponseEntity.badRequest().body(java.util.Map.of("error", "Payment status is required"));
            }
            
            com.webbanhang.shop.Model.Orders.PaymentStatus paymentStatus;
            try {
                paymentStatus = com.webbanhang.shop.Model.Orders.PaymentStatus.valueOf(statusStr.toUpperCase());
            } catch (IllegalArgumentException e) {
                return ResponseEntity.badRequest().body(java.util.Map.of("error", "Invalid payment status: " + statusStr));
            }
            
            Integer adminId = parseAdminId(authentication);
            
            // Get admin full name from database
            String adminName = orderService.getAdminFullName(adminId);
            if (adminName == null || adminName.isBlank()) {
                adminName = authentication != null ? authentication.getName() : "Admin";
            }
            
            return orderService.updatePaymentStatus(orderId, paymentStatus, note, adminId, adminName)
                    .map(orderService::convertToDto)
                    .map(ResponseEntity::ok)
                    .orElse(ResponseEntity.notFound().build());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(java.util.Map.of("error", e.getMessage()));
        }
    }

    private Integer parseAdminId(Authentication authentication) {
        if (authentication == null) return null;
        String name = authentication.getName();
        if (name != null && name.startsWith("admin:")) {
            try {
                return Integer.parseInt(name.substring(6));
            } catch (NumberFormatException e) {
                return null;
            }
        }
        return null;
    }
}
