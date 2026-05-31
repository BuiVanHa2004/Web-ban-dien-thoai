package com.webbanhang.shop.Service.Notifications;

import com.webbanhang.shop.DTO.Notifications.NotificationDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface CustomerNotificationService {
    NotificationDto createNotification(NotificationDto dto);
    Page<NotificationDto> getNotificationsByCustomer(Integer customerId, Pageable pageable);
    long countUnreadNotifications(Integer customerId);
    void markAsRead(Integer notificationId, Integer customerId);
    void markAllAsRead(Integer customerId);
}
