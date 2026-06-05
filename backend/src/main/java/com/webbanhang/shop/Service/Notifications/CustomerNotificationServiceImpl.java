package com.webbanhang.shop.Service.Notifications;

import com.webbanhang.shop.DTO.Notifications.NotificationDto;
import com.webbanhang.shop.Model.Customers.CustomerAccount;
import com.webbanhang.shop.Model.Notifications.CustomerNotification;
import com.webbanhang.shop.Repository.Contacts.ContactRepository;
import com.webbanhang.shop.Repository.Customers.CustomerAccountRepository;
import com.webbanhang.shop.Repository.Notifications.CustomerNotificationRepository;
import com.webbanhang.shop.Repository.Orders.EvaluateRepository;
import com.webbanhang.shop.Repository.Orders.OrderRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
@SuppressWarnings("null")
public class CustomerNotificationServiceImpl implements CustomerNotificationService {

    private final CustomerNotificationRepository notificationRepository;
    private final CustomerAccountRepository customerAccountRepository;
    private final OrderRepository orderRepository;
    private final ContactRepository contactRepository;
    private final EvaluateRepository evaluateRepository;

    public CustomerNotificationServiceImpl(
            CustomerNotificationRepository notificationRepository,
            CustomerAccountRepository customerAccountRepository,
            OrderRepository orderRepository,
            ContactRepository contactRepository,
            EvaluateRepository evaluateRepository
    ) {
        this.notificationRepository = notificationRepository;
        this.customerAccountRepository = customerAccountRepository;
        this.orderRepository = orderRepository;
        this.contactRepository = contactRepository;
        this.evaluateRepository = evaluateRepository;
    }

    @Override
    @Transactional
    public NotificationDto createNotification(NotificationDto dto) {
        CustomerNotification notification = new CustomerNotification();
        
        CustomerAccount customer = customerAccountRepository.findById(dto.getAdminId()) // Using adminId field in DTO for customerId to reuse DTO
                .orElseThrow(() -> new IllegalArgumentException("Customer not found"));
        notification.setCustomer(customer);
        
        notification.setType(dto.getType());
        notification.setAction(dto.getAction());
        notification.setActorType(dto.getActorType());
        notification.setActorId(dto.getActorId());
        notification.setActorName(dto.getActorName());
        
        if (dto.getOrderId() != null) {
            orderRepository.findById(dto.getOrderId()).ifPresent(notification::setOrder);
        }
        if (dto.getContactId() != null) {
            contactRepository.findById(dto.getContactId()).ifPresent(notification::setContact);
        }
        if (dto.getEvaluateId() != null) {
            evaluateRepository.findById(dto.getEvaluateId()).ifPresent(notification::setEvaluate);
        }
        
        notification.setTitle(dto.getTitle());
        notification.setMessage(dto.getMessage());
        
        CustomerNotification saved = notificationRepository.save(notification);
        return mapToDto(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<NotificationDto> getNotificationsByCustomer(Integer customerId, Pageable pageable) {
        return notificationRepository.findByCustomerCustomerIdOrderByCreatedAtDesc(customerId, pageable)
                .map(this::mapToDto);
    }

    @Override
    @Transactional(readOnly = true)
    public long countUnreadNotifications(Integer customerId) {
        return notificationRepository.countUnreadByCustomer(customerId);
    }

    @Override
    @Transactional
    public void markAsRead(Integer notificationId, Integer customerId) {
        CustomerNotification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new IllegalArgumentException("Notification not found"));
        
        if (!notification.getCustomer().getCustomerId().equals(customerId)) {
            throw new IllegalArgumentException("You don't have permission to modify this notification");
        }
        
        if (!notification.getIsRead()) {
            notification.setIsRead(true);
            notification.setReadAt(Instant.now());
            notificationRepository.save(notification);
        }
    }

    @Override
    @Transactional
    public void markAllAsRead(Integer customerId) {
        notificationRepository.markAllAsRead(customerId, Instant.now());
    }

    private NotificationDto mapToDto(CustomerNotification entity) {
        return NotificationDto.builder()
                .notificationId(entity.getNotificationId())
                .adminId(entity.getCustomer().getCustomerId()) // mapping customer_id to adminId for generic DTO
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
