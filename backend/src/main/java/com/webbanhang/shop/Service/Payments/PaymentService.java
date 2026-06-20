package com.webbanhang.shop.Service.Payments;

import com.webbanhang.shop.DTO.Orders.PaymentQRResponse;
import com.webbanhang.shop.DTO.Payments.BankTransferStatusDto;
import com.webbanhang.shop.DTO.Payments.PendingPaymentDto;
import com.webbanhang.shop.Model.Orders.PaymentAttempt;
import com.webbanhang.shop.Model.Orders.PaymentLog;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface PaymentService {
    PaymentAttempt createPaymentAttempt(Integer orderId);

    PaymentQRResponse getPaymentQRInfo(Integer orderId);
    
    PaymentQRResponse getPaymentQRInfoByOrderCode(String orderCode);

    PaymentAttempt customerConfirmPayment(Integer orderId, String transferNote, MultipartFile billImage);
    
    void changeToCOD(String orderCode);

    void adminApprovePayment(Integer attemptId, Integer adminId, String adminNote);

    void adminRejectPayment(Integer attemptId, Integer adminId, String adminNote);

    void lockPayment(Integer attemptId, Integer adminId);

    void releaseLock(Integer attemptId, Integer adminId);

    List<PaymentAttempt> getPaymentAttempts(String status);

    List<PendingPaymentDto> getPendingPayments();
    
    void logViewBill(Integer attemptId, Integer adminId);

    List<PaymentLog> getLogsByOrderId(Integer orderId);

    /**
     * Confirm bank transfer for an order after a bank transaction match.
     *
     * @param actingAdminId admin who triggered manual match, or null/0 for automatic match (stored as NULL in DB to satisfy FK).
     */
    void confirmPayment(Integer orderId, Integer actingAdminId, String note);

    void revokePayment(Integer orderId, Integer actingAdminId, String note);

    BankTransferStatusDto getBankTransferStatus(Integer orderId);

    void updateOrderNote(Integer orderId, String note, String authorName);

    List<PaymentAttempt> getArchivedAttempts();

    void deleteArchivedAttemptForever(Integer attemptId);

    void deleteAllArchivedAttempts();
}

