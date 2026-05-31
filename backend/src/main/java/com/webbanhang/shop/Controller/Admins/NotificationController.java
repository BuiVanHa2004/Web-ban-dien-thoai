package com.webbanhang.shop.Controller.Admins;

import com.webbanhang.shop.DTO.Notifications.NotificationDto;
import com.webbanhang.shop.Security.JwtService;
import com.webbanhang.shop.Service.Notifications.NotificationService;
import io.jsonwebtoken.Claims;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;
    private final JwtService jwtService;

    private Integer getAdminIdFromToken(String authHeader) {
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
        Integer adminId = getAdminIdFromToken(authHeader);
        return ResponseEntity.ok(notificationService.getAdminNotifications(adminId, PageRequest.of(page, size)));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Long>> getUnreadCount(
            @RequestHeader("Authorization") String authHeader
    ) {
        Integer adminId = getAdminIdFromToken(authHeader);
        long count = notificationService.countUnreadNotifications(adminId);
        return ResponseEntity.ok(Map.of("count", count));
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<Void> markAsRead(
            @PathVariable Integer id,
            @RequestHeader("Authorization") String authHeader
    ) {
        Integer adminId = getAdminIdFromToken(authHeader);
        notificationService.markAsRead(id, adminId);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/read-all")
    public ResponseEntity<Void> markAllAsRead(
            @RequestHeader("Authorization") String authHeader
    ) {
        Integer adminId = getAdminIdFromToken(authHeader);
        notificationService.markAllAsRead(adminId);
        return ResponseEntity.ok().build();
    }
}
