package com.webbanhang.shop.Service.Notifications;

import com.webbanhang.shop.DTO.Notifications.NotificationDto;
import com.webbanhang.shop.Model.Admins.AdminAccount;
import com.webbanhang.shop.Model.Contacts.Contact;
import com.webbanhang.shop.Model.Notifications.Notification;
import com.webbanhang.shop.Model.Orders.Evaluate;
import com.webbanhang.shop.Model.Orders.Order;
import com.webbanhang.shop.Repository.Admins.AdminAccountRepository;
import com.webbanhang.shop.Repository.Contacts.ContactRepository;
import com.webbanhang.shop.Repository.Notifications.NotificationRepository;
import com.webbanhang.shop.Repository.Orders.EvaluateRepository;
import com.webbanhang.shop.Repository.Orders.OrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class NotificationServiceImpl implements NotificationService {

    private final NotificationRepository notificationRepository;
    private final AdminAccountRepository adminAccountRepository;
    private final OrderRepository orderRepository;
    private final ContactRepository contactRepository;
    private final EvaluateRepository evaluateRepository;

    @Override
    public Page<NotificationDto> getAdminNotifications(Integer adminId, Pageable pageable) {
        return notificationRepository.findByAdminId(adminId, pageable)
                .map(this::mapToDto);
    }

    @Override
    public long countUnreadNotifications(Integer adminId) {
        return notificationRepository.countUnreadByAdminId(adminId);
    }

    @Override
    @Transactional
    public void markAsRead(Integer notificationId, Integer adminId) {
        Optional<Notification> opt = notificationRepository.findById(notificationId);
        if (opt.isPresent()) {
            Notification notification = opt.get();
            if (notification.getAdmin().getAccountId().equals(adminId) && !notification.getIsRead()) {
                notification.setIsRead(true);
                notification.setReadAt(Instant.now());
                notificationRepository.save(notification);
            }
        }
    }

    @Override
    @Transactional
    public void markAllAsRead(Integer adminId) {
        notificationRepository.markAllAsReadByAdminId(adminId);
    }

    @Override
    @Transactional
    public void createNotification(Integer adminId, NotificationDto request) {
        AdminAccount admin = adminAccountRepository.findById(adminId)
                .orElseThrow(() -> new RuntimeException("Admin not found"));

        Notification notification = new Notification();
        notification.setAdmin(admin);
        notification.setType(request.getType());
        notification.setAction(request.getAction());
        notification.setActorType(request.getActorType());
        notification.setActorId(request.getActorId());
        notification.setActorName(request.getActorName());
        notification.setTitle(request.getTitle());
        notification.setMessage(request.getMessage());

        if (request.getOrderId() != null) {
            Order order = orderRepository.findById(request.getOrderId()).orElse(null);
            notification.setOrder(order);
        }
        
        if (request.getContactId() != null) {
            Contact contact = contactRepository.findById(request.getContactId()).orElse(null);
            notification.setContact(contact);
        }

        if (request.getEvaluateId() != null) {
            Evaluate evaluate = evaluateRepository.findById(request.getEvaluateId()).orElse(null);
            notification.setEvaluate(evaluate);
        }

        notificationRepository.save(notification);
    }

    @Override
    @Transactional
    public void notifyAllAdmins(NotificationDto request) {
        List<AdminAccount> admins = adminAccountRepository.findAllByDeletedAtIsNull();
        for (AdminAccount admin : admins) {
            createNotification(admin.getAccountId(), request);
        }
    }

    private NotificationDto mapToDto(Notification entity) {
        return NotificationDto.builder()
                .notificationId(entity.getNotificationId())
                .adminId(entity.getAdmin().getAccountId())
                .type(entity.getType())
                .action(entity.getAction())
                .actorType(entity.getActorType())
                .actorId(entity.getActorId())
                .actorName(entity.getActorName())
                .orderId(entity.getOrder() != null ? entity.getOrder().getOrderId() : null)
                .contactId(entity.getContact() != null ? entity.getContact().getContactId() : null)
                .evaluateId(entity.getEvaluate() != null ? entity.getEvaluate().getEvaluateId() : null)
                .productId(entity.getEvaluate() != null && entity.getEvaluate().getProduct() != null ? entity.getEvaluate().getProduct().getProductId() : null)
                .title(entity.getTitle())
                .message(entity.getMessage())
                .isRead(entity.getIsRead())
                .readAt(entity.getReadAt())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}
