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
