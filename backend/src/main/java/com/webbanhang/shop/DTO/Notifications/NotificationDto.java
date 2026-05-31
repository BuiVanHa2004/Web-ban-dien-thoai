package com.webbanhang.shop.DTO.Notifications;

import com.webbanhang.shop.Model.Notifications.ActorType;
import com.webbanhang.shop.Model.Notifications.NotificationAction;
import com.webbanhang.shop.Model.Notifications.NotificationType;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Getter
@Setter
@Builder
public class NotificationDto {
    private Integer notificationId;
    private Integer adminId;
    private NotificationType type;
    private NotificationAction action;
    private ActorType actorType;
    private Integer actorId;
    private String actorName;
    private Integer orderId;
    private Integer contactId;
    private Integer evaluateId;
    private Integer productId;
    private String title;
    private String message;
    private Boolean isRead;
    private Instant readAt;
    private Instant createdAt;
}
