package com.webbanhang.shop.Controller.Customers;

import com.webbanhang.shop.DTO.Notifications.NotificationDto;
import com.webbanhang.shop.Security.JwtService;
import com.webbanhang.shop.Service.Notifications.CustomerNotificationService;
import io.jsonwebtoken.Claims;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/customer/notifications")
public class CustomerNotificationController {

    private final CustomerNotificationService notificationService;
    private final JwtService jwtService;

    public CustomerNotificationController(CustomerNotificationService notificationService, JwtService jwtService) {
        this.notificationService = notificationService;
        this.jwtService = jwtService;
    }

    private Integer getCustomerIdFromToken(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token không hợp lệ");
        }
        String token = authHeader.substring(7);
        try {
            Claims claims = jwtService.parseClaims(token);
            Object userId = claims.get("userId");
            if (userId instanceof Integer) {
                return (Integer) userId;
            } else if (userId instanceof String) {
                return Integer.parseInt((String) userId);
            } else if (userId instanceof Number) {
                return ((Number) userId).intValue();
            }
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Không tìm thấy user id");
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token không hợp lệ");
        }
    }

    @GetMapping
    public ResponseEntity<Page<NotificationDto>> getNotifications(
            @RequestHeader("Authorization") String authHeader,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        Integer customerId = getCustomerIdFromToken(authHeader);
        Page<NotificationDto> notifications = notificationService.getNotificationsByCustomer(customerId, PageRequest.of(page, size));
        return ResponseEntity.ok(notifications);
    }

    @GetMapping("/unread-count")
    public ResponseEntity<Long> getUnreadCount(@RequestHeader("Authorization") String authHeader) {
        Integer customerId = getCustomerIdFromToken(authHeader);
        long count = notificationService.countUnreadNotifications(customerId);
        return ResponseEntity.ok(count);
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<Void> markAsRead(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Integer id
    ) {
        Integer customerId = getCustomerIdFromToken(authHeader);
        notificationService.markAsRead(id, customerId);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/read-all")
    public ResponseEntity<Void> markAllAsRead(@RequestHeader("Authorization") String authHeader) {
        Integer customerId = getCustomerIdFromToken(authHeader);
        notificationService.markAllAsRead(customerId);
        return ResponseEntity.ok().build();
    }
}
