package com.webbanhang.shop.Service.Notifications;

import com.webbanhang.shop.DTO.Notifications.NotificationDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface NotificationService {

    Page<NotificationDto> getAdminNotifications(Integer adminId, Pageable pageable);

    long countUnreadNotifications(Integer adminId);

    void markAsRead(Integer notificationId, Integer adminId);

    void markAllAsRead(Integer adminId);

    void createNotification(Integer adminId, NotificationDto request);

    void notifyAllAdmins(NotificationDto request);
}
