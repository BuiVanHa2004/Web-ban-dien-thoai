package com.webbanhang.shop.Service.Payments;

import com.webbanhang.shop.Model.Orders.PaymentLog;
import com.webbanhang.shop.Repository.Orders.PaymentLogRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class PaymentLogService {

    private final PaymentLogRepository paymentLogRepository;

    public PaymentLogService(PaymentLogRepository paymentLogRepository) {
        this.paymentLogRepository = paymentLogRepository;
    }

    @Transactional
    public void log(Integer orderId, Integer paymentId, Integer attemptId, Integer transactionId,
                    Integer adminId, String adminName, String actionType, String oldStatus, String newStatus,
                    String note, String ipAddress) {
        PaymentLog log = new PaymentLog();
        log.setOrderId(orderId);
        log.setPaymentId(paymentId);
        log.setPaymentAttemptId(attemptId);
        log.setTransactionId(transactionId);
        log.setAdminId(adminId);
        log.setAdminName(adminName);
        log.setActionType(actionType);
        log.setOldStatus(oldStatus);
        log.setNewStatus(newStatus);
        log.setNote(note);
        log.setIpAddress(ipAddress);
        log.setCreatedAt(LocalDateTime.now());
        paymentLogRepository.save(log);
    }

    public List<PaymentLog> getLogsByOrderId(Integer orderId) {
        return paymentLogRepository.findByOrderIdOrderByCreatedAtDesc(orderId);
    }
}
