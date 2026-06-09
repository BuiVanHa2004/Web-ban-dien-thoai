package com.webbanhang.shop.Service.Payments;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class PaymentNotificationService {

    private final SimpMessagingTemplate messagingTemplate;

    public PaymentNotificationService(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    @SuppressWarnings("null")
    public void notifyNewBill(Object bill) {
        messagingTemplate.convertAndSend("/topic/payments/new-bill", bill);
    }

    @SuppressWarnings("null")
    public void notifyPaymentUpdate(Integer attemptId, String status, Integer adminId) {
        messagingTemplate.convertAndSend("/topic/payments/update", Map.of(
                "attemptId", attemptId,
                "status", status,
                "adminId", adminId
        ));
    }

    @SuppressWarnings("null")
    public void notifyLockStatus(Integer attemptId, Integer adminId, boolean locked) {
        messagingTemplate.convertAndSend("/topic/payments/lock", Map.of(
                "attemptId", attemptId,
                "adminId", adminId,
                "locked", locked
        ));
    }

    @SuppressWarnings("null")
    public void notifyTransactionMatched(Integer transactionId, Integer orderId) {
        messagingTemplate.convertAndSend("/topic/transactions/matched", Map.of(
                "transactionId", transactionId,
                "orderId", orderId
        ));
    }
}
