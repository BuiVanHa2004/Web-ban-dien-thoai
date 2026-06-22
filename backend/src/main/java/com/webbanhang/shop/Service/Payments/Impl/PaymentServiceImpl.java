package com.webbanhang.shop.Service.Payments.Impl;

import com.webbanhang.shop.DTO.Orders.PaymentQRResponse;
import com.webbanhang.shop.DTO.Payments.BankTransferStatusDto;
import com.webbanhang.shop.DTO.Payments.PaymentAttemptDto;
import com.webbanhang.shop.DTO.Payments.PendingPaymentDto;
import com.webbanhang.shop.Model.Orders.Order;
import com.webbanhang.shop.Model.Orders.OrderStatus;
import com.webbanhang.shop.Model.Orders.Payment;
import com.webbanhang.shop.Model.Orders.PaymentAttempt;
import com.webbanhang.shop.Model.Admins.AdminAccount;
import com.webbanhang.shop.Repository.Admins.AdminAccountRepository;
import com.webbanhang.shop.Model.Orders.PaymentStatus;
import com.webbanhang.shop.Repository.Orders.OrderRepository;
import com.webbanhang.shop.Repository.Orders.PaymentAttemptRepository;
import com.webbanhang.shop.Repository.Orders.PaymentRepository;
import com.webbanhang.shop.Repository.Orders.BankTransactionRepository;
import com.webbanhang.shop.DTO.Payments.BankTransactionDto;
import com.webbanhang.shop.Service.Payments.PaymentService;
import com.webbanhang.shop.Service.Notifications.CustomerNotificationService;
import com.webbanhang.shop.DTO.Notifications.NotificationDto;
import com.webbanhang.shop.Model.Notifications.NotificationType;
import com.webbanhang.shop.Model.Notifications.NotificationAction;
import com.webbanhang.shop.Model.Notifications.ActorType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import com.webbanhang.shop.Service.Payments.PaymentLogService;
import com.webbanhang.shop.Service.Payments.PaymentNotificationService;
import com.webbanhang.shop.Service.Orders.OrderService;
import com.webbanhang.shop.Repository.Settings.BankSettingRepository;
import com.webbanhang.shop.Repository.Settings.SettingRepository;
import com.webbanhang.shop.Service.Storage.MinioStorageService;
import com.webbanhang.shop.Model.Settings.BankSetting;
import com.webbanhang.shop.Model.Settings.Setting;
import com.webbanhang.shop.Model.Orders.PaymentLog;
import com.webbanhang.shop.Model.Roles.RoleName;
import com.webbanhang.shop.Service.Inventory.InventoryService;
import com.webbanhang.shop.Model.Orders.OrderItem;
import com.webbanhang.shop.Service.Email.CustomerEmailService;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Service
@SuppressWarnings("null")
public class PaymentServiceImpl implements PaymentService {

    private final OrderRepository orderRepository;
    private final PaymentAttemptRepository paymentAttemptRepository;
    private final PaymentRepository paymentRepository;
    private final OrderService orderService;
    private final BankSettingRepository bankSettingRepository;
    private final MinioStorageService storageService;
    private final PaymentLogService paymentLogService;
    private final CustomerNotificationService customerNotificationService;
    private final PaymentNotificationService paymentNotificationService;
    private final AdminAccountRepository adminAccountRepository;
    private final BankTransactionRepository bankTransactionRepository;
    private final SettingRepository settingRepository;
    private final InventoryService inventoryService;
    private final CustomerEmailService customerEmailService;

    public PaymentServiceImpl(
            OrderRepository orderRepository,
            PaymentAttemptRepository paymentAttemptRepository,
            PaymentRepository paymentRepository,
            OrderService orderService,
            BankSettingRepository bankSettingRepository,
            MinioStorageService storageService,
            CustomerNotificationService customerNotificationService,
            PaymentLogService paymentLogService,
            PaymentNotificationService paymentNotificationService,
            AdminAccountRepository adminAccountRepository,
            BankTransactionRepository bankTransactionRepository,
            SettingRepository settingRepository,
            InventoryService inventoryService,
            CustomerEmailService customerEmailService
    ) {
        this.orderRepository = orderRepository;
        this.paymentAttemptRepository = paymentAttemptRepository;
        this.paymentRepository = paymentRepository;
        this.orderService = orderService;
        this.bankSettingRepository = bankSettingRepository;
        this.storageService = storageService;
        this.customerNotificationService = customerNotificationService;
        this.paymentLogService = paymentLogService;
        this.paymentNotificationService = paymentNotificationService;
        this.adminAccountRepository = adminAccountRepository;
        this.bankTransactionRepository = bankTransactionRepository;
        this.settingRepository = settingRepository;
        this.inventoryService = inventoryService;
        this.customerEmailService = customerEmailService;
    }

    private BigDecimal getApproveThreshold() {
        return settingRepository.findTopByOrderBySettingIdDesc()
                .map(Setting::getPaymentApproveThreshold)
                .orElse(new BigDecimal("5000000.00"));
    }


    @Override
    @Transactional
    public PaymentAttempt createPaymentAttempt(Integer orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Order not found"));
        
        PaymentAttempt attempt = new PaymentAttempt();
        attempt.setOrderId(orderId);
        attempt.setAmount(order.getTotalAmount());
        attempt.setPaymentMethod("BANK_TRANSFER");
        attempt.setStatus("PENDING");
        attempt.setCreatedAt(LocalDateTime.now());
        
        // QR content standard format for VietQR
        BankSetting bankSetting = bankSettingRepository.findByIsActiveTrue()
                .orElseThrow(() -> new IllegalStateException("Active bank setting not found"));
        
        String qrContent = String.format("00020101021238570010A00000072701270006%s0113%s0208QRIBFTTA5204581453037045802VN5903MBB6005HANOI62140810%s6304", 
                bankSetting.getBankBin(), bankSetting.getAccountNumber(), order.getOrderCode());
        attempt.setQrContent(qrContent);
        
        return paymentAttemptRepository.save(attempt);
    }

    @Override
    public PaymentQRResponse getPaymentQRInfo(Integer orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Order not found"));
        
        // Validate payment method
        if (!"BANK_TRANSFER".equals(order.getPaymentMethod())) {
            throw new IllegalStateException("Chỉ đơn hàng chuyển khoản mới có QR code.");
        }
        
        // Validate order status
        List<OrderStatus> validStatuses = List.of(
            OrderStatus.PENDING_CONFIRM,
            OrderStatus.PENDING_PAYMENT_CONFIRMATION,
            OrderStatus.CONFIRMED
        );
        if (!validStatuses.contains(order.getOrderStatus())) {
            throw new IllegalStateException("Đơn hàng không ở trạng thái cần QR code.");
        }
        
        BankSetting bankSetting = bankSettingRepository.findByIsActiveTrue()
                .orElseThrow(() -> new IllegalStateException("Active bank setting not found"));
        
        String qrUrl = String.format("https://img.vietqr.io/image/%s-%s-compact2.jpg?amount=%s&addInfo=%s&accountName=%s",
                bankSetting.getBankBin(), 
                bankSetting.getAccountNumber(),
                order.getTotalAmount().toBigInteger(),
                order.getOrderCode(),
                bankSetting.getAccountName().replace(" ", "%20"));
                
        return PaymentQRResponse.builder()
                .qrUrl(qrUrl)
                .orderCode(order.getOrderCode())
                .amount(order.getTotalAmount())
                .accountName(bankSetting.getAccountName())
                .accountNumber(bankSetting.getAccountNumber())
                .bankBin(bankSetting.getBankBin())
                .build();
    }

    @Override
    @Transactional
    public PaymentAttempt customerConfirmPayment(Integer orderId, String transferNote, MultipartFile billImage) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Order not found"));
        
        // Validate payment method
        if (!"BANK_TRANSFER".equals(order.getPaymentMethod())) {
            throw new IllegalStateException("Chỉ đơn hàng chuyển khoản mới được upload bill.");
        }
        
        // Validate order status
        List<OrderStatus> allowedStatuses = List.of(
            OrderStatus.PENDING_CONFIRM,
            OrderStatus.PENDING_PAYMENT_CONFIRMATION,
            OrderStatus.CONFIRMED
        );
        if (!allowedStatuses.contains(order.getOrderStatus())) {
            throw new IllegalStateException("Đơn hàng ở trạng thái " + order.getOrderStatus() + " không thể upload bill.");
        }
        
        if (order.getPaymentStatus() == PaymentStatus.PAID) {
            throw new IllegalStateException("Đơn hàng này đã được xác nhận thanh toán.");
        }

        PaymentAttempt attempt = paymentAttemptRepository.findTopByOrderIdOrderByCreatedAtDesc(orderId)
                .orElseGet(() -> createPaymentAttempt(orderId));
        
        if (billImage != null && !billImage.isEmpty()) {
            MinioStorageService.UploadedObject uploaded = storageService.uploadImageToFolder("payments", billImage);
            attempt.setTransferImageUrl(uploaded.url());
        }
        
        attempt.setTransferNote(transferNote);
        attempt.setStatus("WAITING_CONFIRM");
        attempt.setCustomerConfirmedAt(LocalDateTime.now());
        
        // Phân tích rủi ro dựa theo giá trị giao dịch thực tế
        BigDecimal amount = order.getTotalAmount();
        if (amount.compareTo(new BigDecimal("5000000")) >= 0) {
            attempt.setRiskLevel("HIGH");
            attempt.setIsSuspicious(true);
        } else if (amount.compareTo(new BigDecimal("2000000")) >= 0) {
            attempt.setRiskLevel("MEDIUM");
            attempt.setIsSuspicious(false);
        } else {
            attempt.setRiskLevel("LOW");
            attempt.setIsSuspicious(false);
        }
        
        PaymentAttempt saved = paymentAttemptRepository.save(attempt);

        OrderStatus previousOrderStatus = order.getOrderStatus();
        PaymentStatus previousPaymentStatus = order.getPaymentStatus();

        // Update Order Status
        order.setOrderStatus(OrderStatus.PENDING_PAYMENT_CONFIRMATION);
        order.setPaymentStatus(PaymentStatus.WAITING_CONFIRM);
        orderRepository.save(order);

        notifyCustomerPaymentChange(
                order,
                previousOrderStatus,
                OrderStatus.PENDING_PAYMENT_CONFIRMATION,
                previousPaymentStatus,
                PaymentStatus.WAITING_CONFIRM,
                transferNote,
                NotificationAction.CONFIRM,
                "Minh chứng thanh toán cho đơn hàng " + order.getOrderCode() + " đã được gửi. Chúng tôi đang xác nhận."
        );
        
        paymentLogService.log(orderId, null, saved.getAttemptId(), null,
                null, "KHACH_HANG", "CUSTOMER_CONFIRM", "PENDING", "WAITING_CONFIRM",
                transferNote, null);
        
        paymentNotificationService.notifyNewBill(saved);
        
        return saved;
    }

    @Override
    @Transactional
    public void lockPayment(Integer attemptId, Integer adminId) {
        PaymentAttempt attempt = paymentAttemptRepository.findByIdWithLock(attemptId)
                .orElseThrow(() -> new IllegalArgumentException("Payment attempt not found"));

        if (attempt.getProcessingByAdminId() != null &&
            !attempt.getProcessingByAdminId().equals(adminId) &&
            attempt.getLockExpiresAt() != null &&
            attempt.getLockExpiresAt().isAfter(LocalDateTime.now())) {
            throw new IllegalStateException("Payment is being processed by another admin");
        }

        String adminName = adminAccountRepository.findById(adminId)
                .map(AdminAccount::getFullName).orElse("Admin #" + adminId);
        attempt.setProcessingByAdminId(adminId);
        attempt.setProcessingByAdminName(adminName);
        attempt.setProcessingAt(LocalDateTime.now());
        attempt.setLockedAt(LocalDateTime.now());
        attempt.setLockExpiresAt(LocalDateTime.now().plusMinutes(10)); // Increased to 10 mins
        attempt.setStatus("PROCESSING");
        paymentAttemptRepository.save(attempt);

        paymentLogService.log(attempt.getOrderId(), null, attemptId, null,
                adminId, adminName, "LOCK_PROCESS", attempt.getStatus(), attempt.getStatus(),
                "Quản trị viên đã khóa để xử lý", null);
        
        paymentNotificationService.notifyLockStatus(attemptId, adminId, true);
    }

    @Override
    @Transactional
    public void releaseLock(Integer attemptId, Integer adminId) {
        PaymentAttempt attempt = paymentAttemptRepository.findByIdWithLock(attemptId)
                .orElseThrow(() -> new IllegalArgumentException("Payment attempt not found"));

        if (attempt.getProcessingByAdminId() == null || !attempt.getProcessingByAdminId().equals(adminId)) {
            return; // Only the locker can release, or just ignore if not locked
        }

        String adminName = adminAccountRepository.findById(adminId)
                .map(AdminAccount::getFullName).orElse("Admin #" + adminId);
        attempt.setProcessingByAdminId(null);
        attempt.setProcessingByAdminName(null);
        attempt.setProcessingAt(null);
        attempt.setLockedAt(null);
        attempt.setLockExpiresAt(null);
        if ("PROCESSING".equals(attempt.getStatus())) {
            attempt.setStatus("WAITING_CONFIRM");
        }
        paymentAttemptRepository.save(attempt);

        paymentLogService.log(attempt.getOrderId(), null, attemptId, null,
                adminId, adminName, "RELEASE_LOCK", attempt.getStatus(), attempt.getStatus(),
                "Quản trị viên đã mở khóa", null);
        
        paymentNotificationService.notifyLockStatus(attemptId, null, false);
    }

    @Override
    @Transactional
    public void adminApprovePayment(Integer attemptId, Integer adminId, String adminNote) {
        System.out.println("[SERVICE] adminApprovePayment called: attemptId=" + attemptId + ", adminId=" + adminId + ", adminNote='" + adminNote + "'");
        
        // Load attempt first (no lock yet)
        PaymentAttempt attempt = paymentAttemptRepository.findById(attemptId)
                .orElseThrow(() -> new IllegalArgumentException("Payment attempt not found"));

        // Validate early (before locking)
        boolean systemActor = adminId == null || adminId.equals(0);
        if (!systemActor) {
            AdminAccount admin = adminAccountRepository.findById(adminId)
                    .orElseThrow(() -> new IllegalArgumentException("Tài khoản quản trị không tồn tại"));
            if (RoleName.STAFF.equals(admin.getRole().getRoleName())) {
                if (attempt.getAmount().compareTo(getApproveThreshold()) >= 0) {
                    throw new IllegalStateException("Hạn mức phê duyệt thanh toán vượt quá quyền hạn của Nhân viên (Chỉ áp dụng với giao dịch dưới " 
                        + String.format("%,d", getApproveThreshold().longValue()) + " VND). Vui lòng chuyển quyền phê duyệt cho Quản trị viên.");
                }
                if (Boolean.TRUE.equals(attempt.getIsSuspicious()) || "HIGH".equals(attempt.getRiskLevel()) || "MEDIUM".equals(attempt.getRiskLevel())) {
                    throw new IllegalStateException("Giao dịch này được đánh dấu rủi ro cao. Nhân viên không có quyền phê duyệt. Vui lòng chuyển cho Quản trị viên.");
                }
            }
        }

        if (!systemActor && attempt.getProcessingByAdminId() != null &&
            !attempt.getProcessingByAdminId().equals(adminId) &&
            attempt.getLockExpiresAt() != null &&
            attempt.getLockExpiresAt().isAfter(LocalDateTime.now())) {
            throw new IllegalStateException("Payment is being processed by another admin");
        }

        if ("MATCHED".equals(attempt.getStatus()) || "SUCCESS".equals(attempt.getStatus())) {
            return; // Already processed
        }

        // NOW lock with minimal time
        PaymentAttempt lockedAttempt = paymentAttemptRepository.findByIdWithLock(attemptId)
                .orElseThrow(() -> new IllegalArgumentException("Payment attempt not found"));

        // Double-check after lock
        if ("MATCHED".equals(lockedAttempt.getStatus()) || "SUCCESS".equals(lockedAttempt.getStatus())) {
            return; // Another transaction processed it
        }

        Order order = orderRepository.findById(lockedAttempt.getOrderId())
                .orElseThrow(() -> new IllegalArgumentException("Order not found"));

        String oldStatus = lockedAttempt.getStatus();
        PaymentStatus previousPaymentStatus = order.getPaymentStatus();
        OrderStatus previousOrderStatus = order.getOrderStatus();

        Integer persistedAdminId = systemActor ? null : adminId;
        String adminName = systemActor
                ? "Hệ thống"
                : adminAccountRepository.findById(adminId)
                        .map(AdminAccount::getFullName).orElse("Admin #" + adminId);

        // Update Attempt (use lockedAttempt, not attempt!)
        lockedAttempt.setStatus("MATCHED");
        lockedAttempt.setProcessingByAdminId(null);
        lockedAttempt.setProcessingByAdminName(null);
        lockedAttempt.setLockedAt(null);
        lockedAttempt.setLockExpiresAt(null);
        lockedAttempt.setReviewedByAdminId(persistedAdminId);
        lockedAttempt.setReviewedByAdminName(adminName);
        lockedAttempt.setReviewedAt(LocalDateTime.now());
        paymentAttemptRepository.save(lockedAttempt);

        // Update Order
        order.setPaymentStatus(PaymentStatus.PAID);
        order.setOrderStatus(OrderStatus.CONFIRMED);
        order.setPaymentConfirmedAt(LocalDateTime.now());
        // Always save adminNote (even if empty) so frontend can display it
        String noteToSave = adminNote != null ? adminNote : "";
        System.out.println("[APPROVE] Setting paymentNote: '" + noteToSave + "' (original adminNote: '" + adminNote + "')");
        order.setPaymentNote(noteToSave);
        order.setPaymentNoteAuthor(adminName);
        order.setPaymentNoteDate(LocalDateTime.now());

        // Clear cancellation metadata as order is now matched/approved
        order.setCancelledAt(null);
        order.setCancelledBy(null);
        order.setCancelledByAdminId(null);
        order.setCancelledByName(null);
        order.setCancelReasonId(null);
        order.setCancelNote(null);
        orderRepository.save(order);

        // ✅ CRITICAL FIX: BANK_TRANSFER - Trừ kho khi Admin approve payment (PAID)
        // Confirm sale: chuyển từ reserved sang sold (TRỪ KHO THỰC SỰ)
        try {
            for (OrderItem item : order.getItems()) {
                if (item.getVariantId() != null && item.getQuantity() != null && item.getQuantity() > 0) {
                    inventoryService.confirmSale(item.getVariantId(), item.getQuantity());
                }
            }
            order.setInventoryDeducted(true);
            orderRepository.save(order);
            System.out.println("[PAYMENT] ✅ BANK_TRANSFER order " + order.getOrderCode() + " - Stock deducted on PAID");
        } catch (Exception e) {
            System.err.println("Failed to confirm sale: " + e.getMessage());
            throw new RuntimeException("Không thể trừ kho: " + e.getMessage(), e);
        }

        // Update Payment
        Payment payment = paymentRepository.findTopByOrderIdOrderByCreatedAtDesc(order.getOrderId()).orElseGet(() -> {
            Payment newPayment = new Payment();
            newPayment.setOrderId(order.getOrderId());
            newPayment.setOrderCode(order.getOrderCode());
            newPayment.setCustomerId(order.getCustomerId());
            newPayment.setPaymentMethod(order.getPaymentMethod() != null ? order.getPaymentMethod() : "BANK_TRANSFER");
            newPayment.setAmount(order.getTotalAmount());
            return newPayment;
        });
        payment.setPaymentStatus(PaymentStatus.PAID);
        payment.setPaidAt(LocalDateTime.now());
        payment.setConfirmedByAdminId(persistedAdminId);
        paymentRepository.save(payment);

        // Audit Log
        paymentLogService.log(order.getOrderId(), payment.getPaymentId(), attemptId, null,
                persistedAdminId, adminName, "APPROVE_BILL", oldStatus, "SUCCESS",
                adminNote, null);

        // Notify customer
        notifyCustomerPaymentChange(
                order,
                previousOrderStatus,
                OrderStatus.CONFIRMED,
                previousPaymentStatus,
                PaymentStatus.PAID,
                adminNote,
                NotificationAction.CONFIRM,
                "Đơn hàng " + order.getOrderCode() + " đã được xác nhận thanh toán."
        );
        
        paymentNotificationService.notifyPaymentUpdate(attemptId, "MATCHED", adminId != null ? adminId : 0);
    }

    @Override
    @Transactional
    public void adminRejectPayment(Integer attemptId, Integer adminId, String adminNote) {
        PaymentAttempt attempt = paymentAttemptRepository.findByIdWithLock(attemptId)
                .orElseThrow(() -> new IllegalArgumentException("Payment attempt not found"));

        boolean systemActor = adminId == null || adminId.equals(0);
        if (!systemActor) {
            AdminAccount admin = adminAccountRepository.findById(adminId)
                    .orElseThrow(() -> new IllegalArgumentException("Tài khoản quản trị không tồn tại"));
            if (RoleName.STAFF.equals(admin.getRole().getRoleName())) {
                if (attempt.getAmount().compareTo(getApproveThreshold()) >= 0) {
                    throw new IllegalStateException("Hạn mức từ chối thanh toán vượt quá quyền hạn của Nhân viên (Chỉ áp dụng với giao dịch dưới " 
                        + String.format("%,d", getApproveThreshold().longValue()) + " VND). Vui lòng chuyển cho Quản trị viên.");
                }
                if (Boolean.TRUE.equals(attempt.getIsSuspicious()) || "HIGH".equals(attempt.getRiskLevel()) || "MEDIUM".equals(attempt.getRiskLevel())) {
                    throw new IllegalStateException("Giao dịch này được đánh dấu rủi ro cao. Nhân viên không có quyền từ chối. Vui lòng chuyển cho Quản trị viên.");
                }
            }
        }

        if (!systemActor && attempt.getProcessingByAdminId() != null &&
            !attempt.getProcessingByAdminId().equals(adminId) &&
            attempt.getLockExpiresAt() != null &&
            attempt.getLockExpiresAt().isAfter(LocalDateTime.now())) {
            throw new IllegalStateException("Payment is being processed by another admin");
        }

        Order order = orderRepository.findById(attempt.getOrderId())
                .orElseThrow(() -> new IllegalArgumentException("Order not found"));

        String oldStatus = attempt.getStatus();
        PaymentStatus previousPaymentStatus = order.getPaymentStatus();
        OrderStatus previousOrderStatus = order.getOrderStatus();
        String adminName = adminAccountRepository.findById(adminId)
                .map(AdminAccount::getFullName).orElse("Admin #" + adminId);

        // Update Attempt
        attempt.setStatus("REJECTED");
        attempt.setProcessingByAdminId(null);
        attempt.setProcessingByAdminName(null);
        attempt.setLockedAt(null);
        attempt.setLockExpiresAt(null);
        attempt.setReviewedByAdminId(adminId);
        attempt.setReviewedByAdminName(adminName);
        attempt.setReviewedAt(LocalDateTime.now());
        attempt.setRejectReason(adminNote);
        paymentAttemptRepository.save(attempt);

        // Update Order - Keep order active, allow customer to re-upload bill
        // DO NOT cancel order, just mark payment as failed/unpaid
        order.setPaymentStatus(PaymentStatus.UNPAID);
        order.setOrderStatus(OrderStatus.CONFIRMED); // Keep confirmed so customer can retry payment
        order.setPaymentNote(adminNote);
        order.setPaymentNoteAuthor(adminName);
        order.setPaymentNoteDate(LocalDateTime.now());
        orderRepository.save(order);

        // Update Payment Record
        Payment payment = paymentRepository.findTopByOrderIdOrderByCreatedAtDesc(order.getOrderId()).orElseGet(() -> {
            Payment newPayment = new Payment();
            newPayment.setOrderId(order.getOrderId());
            newPayment.setOrderCode(order.getOrderCode());
            newPayment.setCustomerId(order.getCustomerId());
            newPayment.setPaymentMethod(order.getPaymentMethod() != null ? order.getPaymentMethod() : "BANK_TRANSFER");
            newPayment.setAmount(order.getTotalAmount());
            newPayment.setPaymentStatus(PaymentStatus.UNPAID);
            return newPayment;
        });
        payment.setPaymentStatus(PaymentStatus.FAILED);
        paymentRepository.save(payment);

        // Audit Log
        paymentLogService.log(order.getOrderId(), payment.getPaymentId(), attemptId, null,
                adminId, adminName, "REJECT_BILL", oldStatus, "FAILED",
                adminNote, null);

        // Notify customer
        notifyCustomerPaymentChange(
                order,
                previousOrderStatus,
                OrderStatus.CONFIRMED,
                previousPaymentStatus,
                PaymentStatus.UNPAID,
                adminNote,
                NotificationAction.CANCEL,
                "Minh chứng thanh toán cho đơn hàng " + order.getOrderCode() + " đã bị từ chối."
        );
        
        paymentNotificationService.notifyPaymentUpdate(attemptId, "REJECTED", adminId);
    }

    @Override
    public List<PaymentAttempt> getPaymentAttempts(String status) {
        if (status == null || status.isEmpty() || "WAITING_CONFIRM".equals(status)) {
            // Return both waiting and processing so they don't disappear when locked
            // Exclude archived bills (from deleted orders) and soft deleted bills
            return paymentAttemptRepository.findAllByStatusInAndTransferImageUrlIsNotNullAndArchivedAtIsNullAndDeletedAtIsNullOrderByCreatedAtDesc(
                List.of("WAITING_CONFIRM", "PROCESSING")
            );
        }
        // Exclude archived bills (from deleted orders) and soft deleted bills
        return paymentAttemptRepository.findByStatusAndTransferImageUrlIsNotNullAndArchivedAtIsNullAndDeletedAtIsNullOrderByCreatedAtDesc(status);
    }

    private void notifyCustomer(Order order, NotificationAction action, String message) {
        try {
            NotificationDto notif = NotificationDto.builder()
                    .adminId(order.getCustomerId())
                    .type(NotificationType.ORDER)
                    .action(action)
                    .actorType(ActorType.ADMIN)
                    .orderId(order.getOrderId())
                    .title("Cập nhật thanh toán")
                    .message(message)
                    .build();
            customerNotificationService.createNotification(notif);
        } catch (Exception e) {
            System.err.println("Failed to notify customer: " + e.getMessage());
        }
    }

    private void notifyCustomerPaymentChange(
            Order order,
            OrderStatus previousOrderStatus,
            OrderStatus newOrderStatus,
            PaymentStatus previousPaymentStatus,
            PaymentStatus newPaymentStatus,
            String note,
            NotificationAction action,
            String message
    ) {
        notifyCustomer(order, action, message);

        try {
            if (previousOrderStatus != newOrderStatus) {
                customerEmailService.sendOrderStatusChangeEmail(order, previousOrderStatus, newOrderStatus);
            }
            customerEmailService.sendPaymentStatusChangeEmail(order, previousPaymentStatus, newPaymentStatus, note);
        } catch (Exception e) {
            System.err.println("Failed to send payment/order update email: " + e.getMessage());
        }
    }


    @Override
    public BankTransferStatusDto getBankTransferStatus(Integer orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Order not found"));
        PaymentAttempt latest = paymentAttemptRepository.findTopByOrderIdOrderByCreatedAtDesc(orderId).orElse(null);
        
        // Prioritize the latest transaction linked to this order (whether MATCHED or REJECTED)
        BankTransactionDto matchedTx = bankTransactionRepository.findTopByMatchedOrderIdAndDeletedAtIsNullOrderByCreatedAtDesc(orderId)
                .map(tx -> {
                    String adminName = null;
                    if (tx.getMatchedByAdminId() != null) {
                        if (tx.getMatchedByAdminId() == 0) {
                            adminName = "Hệ thống";
                        } else {
                            adminName = adminAccountRepository.findById(tx.getMatchedByAdminId())
                                    .map(AdminAccount::getFullName)
                                    .orElse("Admin #" + tx.getMatchedByAdminId());
                        }
                    }
                    return BankTransactionDto.fromEntity(tx, adminName, order.getOrderCode());
                }).orElse(null);

        return new BankTransferStatusDto(
                order.getOrderId(),
                order.getOrderCode(),
                order.getOrderStatus() != null ? order.getOrderStatus().name() : null,
                order.getPaymentStatus() != null ? order.getPaymentStatus().name() : null,
                order.getPaymentMethod(),
                latest != null ? PaymentAttemptDto.fromEntity(latest) : null,
                matchedTx
        );
    }

    @Override
    public List<PendingPaymentDto> getPendingPayments() {
        return paymentRepository.findAllByPaymentStatusOrderByCreatedAtDesc(PaymentStatus.WAITING_CONFIRM)
                .stream()
                .map(p -> {
                    String note = paymentAttemptRepository.findTopByOrderIdOrderByCreatedAtDesc(p.getOrderId())
                            .map(PaymentAttempt::getTransferNote)
                            .orElse(null);
                    return new PendingPaymentDto(
                            p.getPaymentId(),
                            p.getOrderId(),
                            p.getOrderCode(),
                            p.getCustomerId(),
                            p.getPaymentMethod(),
                            p.getPaymentStatus() != null ? p.getPaymentStatus().name() : null,
                            p.getAmount(),
                            p.getCreatedAt(),
                            note
                    );
                })
                .toList();
    }

    @Override
    @Transactional
    public void confirmPayment(Integer orderId, Integer actingAdminId, String note) {
        boolean systemMatch = actingAdminId == null || actingAdminId.equals(0);
        if (!systemMatch) {
            AdminAccount admin = adminAccountRepository.findById(actingAdminId)
                    .orElseThrow(() -> new IllegalArgumentException("Tài khoản quản trị không tồn tại"));
            if (RoleName.STAFF.equals(admin.getRole().getRoleName())) {
                Order order = orderRepository.findById(orderId)
                        .orElseThrow(() -> new IllegalArgumentException("Đơn hàng không tồn tại"));
                if (order.getTotalAmount().compareTo(getApproveThreshold()) >= 0) {
                    throw new IllegalStateException("Hạn mức xác nhận thanh toán vượt quá quyền hạn của Nhân viên (Chỉ áp dụng với giao dịch dưới " 
                        + String.format("%,d", getApproveThreshold().longValue()) + " VND). Vui lòng chuyển cho Quản trị viên.");
                }
            }
        }
        Integer approveAsAdminId = systemMatch ? null : actingAdminId;
        String matchNote = (note != null && !note.isBlank()) 
                ? note 
                : (systemMatch
                    ? "Hệ thống tự động xác nhận qua khớp giao dịch ngân hàng"
                    : "Xác nhận thanh toán qua khớp giao dịch ngân hàng (đối soát thủ công)");

        PaymentAttempt billInQueue = paymentAttemptRepository
                .findTopByOrderIdAndStatusAndTransferImageUrlIsNotNullOrderByCreatedAtDesc(orderId, "WAITING_CONFIRM")
                .orElse(null);

        PaymentAttempt latest = billInQueue != null
                ? billInQueue
                : paymentAttemptRepository.findTopByOrderIdOrderByCreatedAtDesc(orderId).orElse(null);

        if (latest != null) {
            adminApprovePayment(latest.getAttemptId(), approveAsAdminId, matchNote);
        } else {
            Order order = orderRepository.findById(orderId)
                    .orElseThrow(() -> new IllegalArgumentException("Order not found"));

            String logActorName = systemMatch
                    ? "Hệ thống"
                    : adminAccountRepository.findById(actingAdminId)
                            .map(AdminAccount::getFullName).orElse("Admin #" + actingAdminId);

            PaymentStatus previousPaymentStatus = order.getPaymentStatus();
            OrderStatus previousOrderStatus = order.getOrderStatus();

            order.setPaymentStatus(PaymentStatus.PAID);
            order.setOrderStatus(OrderStatus.CONFIRMED);
            order.setPaymentConfirmedAt(LocalDateTime.now());
            if (note != null && !note.isBlank()) {
                order.setPaymentNote(note);
            }
            order.setPaymentNoteAuthor(logActorName);
            order.setPaymentNoteDate(LocalDateTime.now());
            orderRepository.save(order);

            // ✅ Confirm sale: move from reserved to sold
            try {
                for (OrderItem item : order.getItems()) {
                    if (item.getVariantId() != null && item.getQuantity() != null && item.getQuantity() > 0) {
                        inventoryService.confirmSale(item.getVariantId(), item.getQuantity());
                    }
                }
                order.setInventoryDeducted(true);
                orderRepository.save(order);
                System.out.println("[PAYMENT] Confirmed sale for auto-matched order " + order.getOrderCode());
            } catch (Exception e) {
                System.err.println("Failed to confirm sale: " + e.getMessage());
                throw new RuntimeException("Không thể trừ kho: " + e.getMessage(), e);
            }

            Payment payment = paymentRepository.findTopByOrderIdOrderByCreatedAtDesc(order.getOrderId()).orElseGet(() -> {
                Payment newPayment = new Payment();
                newPayment.setOrderId(order.getOrderId());
                newPayment.setOrderCode(order.getOrderCode());
                newPayment.setCustomerId(order.getCustomerId());
                newPayment.setPaymentMethod(order.getPaymentMethod() != null ? order.getPaymentMethod() : "BANK_TRANSFER");
                newPayment.setAmount(order.getTotalAmount());
                return newPayment;
            });
            payment.setPaymentStatus(PaymentStatus.PAID);
            payment.setPaidAt(LocalDateTime.now());
            payment.setConfirmedByAdminId(approveAsAdminId);
            paymentRepository.save(payment);

            paymentLogService.log(orderId, payment.getPaymentId(), null, null,
                    approveAsAdminId, logActorName, "AUTO_MATCH", PaymentStatus.UNPAID.name(), PaymentStatus.PAID.name(),
                    matchNote, null);

            notifyCustomerPaymentChange(
                    order,
                    previousOrderStatus,
                    OrderStatus.CONFIRMED,
                    previousPaymentStatus,
                    PaymentStatus.PAID,
                    matchNote,
                    NotificationAction.CONFIRM,
                    "Đơn hàng " + order.getOrderCode() + " đã được xác nhận thanh toán tự động."
            );
        }
    }

    @Override
    @Transactional
    public void revokePayment(Integer orderId, Integer actingAdminId, String note) {
        boolean systemMatch = actingAdminId == null || actingAdminId.equals(0);
        if (!systemMatch) {
            AdminAccount admin = adminAccountRepository.findById(actingAdminId)
                    .orElseThrow(() -> new IllegalArgumentException("Tài khoản quản trị không tồn tại"));
            if (RoleName.STAFF.equals(admin.getRole().getRoleName())) {
                Order order = orderRepository.findById(orderId)
                        .orElseThrow(() -> new IllegalArgumentException("Đơn hàng không tồn tại"));
                if (order.getTotalAmount().compareTo(getApproveThreshold()) >= 0) {
                    throw new IllegalStateException("Hạn mức hủy thanh toán vượt quá quyền hạn của Nhân viên (Chỉ áp dụng với giao dịch dưới " 
                        + String.format("%,d", getApproveThreshold().longValue()) + " VND). Vui lòng chuyển cho Quản trị viên.");
                }
            }
        }

        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Order not found"));
        
        final String adminName = (actingAdminId != null && actingAdminId > 0)
                ? adminAccountRepository.findById(actingAdminId)
                    .map(AdminAccount::getFullName).orElse("Admin #" + actingAdminId)
                : "Hệ thống";

        PaymentStatus oldStatus = order.getPaymentStatus();
        OrderStatus previousOrderStatus = order.getOrderStatus();
        String oldStatusStr = (oldStatus != null) ? oldStatus.name() : "UNKNOWN";

        // Update Order
        order.setPaymentStatus(PaymentStatus.FAILED);
        order.setOrderStatus(OrderStatus.CANCELLED);
        order.setPaymentNote(note != null ? note : "Giao dịch bị từ chối");
        order.setPaymentNoteAuthor(adminName);
        order.setPaymentNoteDate(LocalDateTime.now());

        // Also set cancellation metadata for Order detail view (Source identification)
        order.setCancelledAt(LocalDateTime.now());
        order.setCancelledBy(com.webbanhang.shop.Model.Orders.CancelledBy.ADMIN);
        order.setCancelledByAdminId(actingAdminId);
        order.setCancelledByName(adminName);

        // Clear previous cancellation reasons to prioritize payment rejection info
        order.setCancelReasonId(null);
        order.setCancelNote(null);

        orderRepository.save(order);

        // Update Payment Record
        paymentRepository.findTopByOrderIdOrderByCreatedAtDesc(orderId).ifPresentOrElse(payment -> {
            payment.setPaymentStatus(PaymentStatus.FAILED);
            paymentRepository.save(payment);
            
            // Log with payment ID
            paymentLogService.log(orderId, payment.getPaymentId(), null, null,
                actingAdminId, adminName, "REVOKE_PAYMENT", oldStatusStr, PaymentStatus.FAILED.name(),
                note != null ? note : "Giao dịch ngân hàng bị từ chối", null);
        }, () -> {
            // Log without payment ID if it doesn't exist
            paymentLogService.log(orderId, null, null, null,
                actingAdminId, adminName, "REVOKE_PAYMENT", oldStatusStr, PaymentStatus.FAILED.name(),
                note != null ? note : "Giao dịch ngân hàng bị từ chối", null);
        });

        String rejectionNote = note != null ? note : "Giao dịch bị từ chối";
        notifyCustomerPaymentChange(
                order,
                previousOrderStatus,
                OrderStatus.CANCELLED,
                oldStatus,
                PaymentStatus.FAILED,
                rejectionNote,
                NotificationAction.REJECT,
                "Xác nhận thanh toán cho đơn hàng " + order.getOrderCode() + " đã bị từ chối bởi quản trị viên."
        );
    }

    @Override
    @Transactional
    public void logViewBill(Integer attemptId, Integer adminId) {
        PaymentAttempt attempt = paymentAttemptRepository.findById(attemptId)
                .orElseThrow(() -> new IllegalArgumentException("Payment attempt not found"));
        
        String adminName = adminAccountRepository.findById(adminId)
                .map(AdminAccount::getFullName).orElse("Admin #" + adminId);
        paymentLogService.log(attempt.getOrderId(), null, attemptId, null,
                adminId, adminName, "VIEW_BILL", attempt.getStatus(), attempt.getStatus(),
                "Quản trị viên đã xem ảnh minh chứng", null);
    }

    @Override
    public List<PaymentLog> getLogsByOrderId(Integer orderId) {
        return paymentLogService.getLogsByOrderId(orderId);
    }
    
    @Override
    public List<PaymentLog> getLogsByAttemptId(Integer attemptId) {
        return paymentLogService.getLogsByAttemptId(attemptId);
    }

    @Override
    @Transactional
    public void updateOrderNote(Integer orderId, String note, String authorName) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Order not found"));
        order.setPaymentNote(note);
        order.setPaymentNoteAuthor(authorName);
        order.setPaymentNoteDate(LocalDateTime.now());
        orderRepository.save(order);
    }

    @Override
    public PaymentQRResponse getPaymentQRInfoByOrderCode(String orderCode) {
        Order order = orderRepository.findByOrderCode(orderCode)
                .orElseThrow(() -> new IllegalArgumentException("Order not found: " + orderCode));
        
        BankSetting bankSetting = bankSettingRepository.findByIsActiveTrue()
                .orElseThrow(() -> new IllegalStateException("Active bank setting not found"));
        
        String qrUrl = String.format("https://img.vietqr.io/image/%s-%s-compact2.jpg?amount=%s&addInfo=%s&accountName=%s",
                bankSetting.getBankBin(), 
                bankSetting.getAccountNumber(),
                order.getTotalAmount().toBigInteger(),
                order.getOrderCode(),
                bankSetting.getAccountName().replace(" ", "%20"));
                
        return PaymentQRResponse.builder()
                .qrUrl(qrUrl)
                .orderCode(order.getOrderCode())
                .amount(order.getTotalAmount())
                .accountName(bankSetting.getAccountName())
                .accountNumber(bankSetting.getAccountNumber())
                .bankBin(bankSetting.getBankBin())
                .build();
    }

    @Override
    @Transactional
    public void changeToCOD(String orderCode) {
        Order order = orderRepository.findByOrderCode(orderCode)
                .orElseThrow(() -> new IllegalArgumentException("Order not found: " + orderCode));
        
        // Validate: Chỉ cho phép khi PENDING_CONFIRM và UNPAID
        if (!order.getOrderStatus().equals(OrderStatus.PENDING_CONFIRM)) {
            throw new IllegalStateException("Không thể đổi sang COD cho đơn hàng ở trạng thái: " + order.getOrderStatus());
        }
        
        if (!order.getPaymentStatus().equals(PaymentStatus.UNPAID)) {
            throw new IllegalStateException("Không thể đổi sang COD cho đơn hàng đã thanh toán");
        }

        OrderStatus previousOrderStatus = order.getOrderStatus();
        
        // Cập nhật Order
        order.setPaymentMethod("COD");
        order.setOrderStatus(OrderStatus.CONFIRMED);
        // paymentStatus giữ nguyên UNPAID (sẽ thanh toán khi nhận hàng)
        orderRepository.save(order);
        
        // Cập nhật Payment
        Payment payment = paymentRepository.findTopByOrderIdOrderByCreatedAtDesc(order.getOrderId())
                .orElseThrow(() -> new IllegalStateException("Payment record not found"));
        payment.setPaymentMethod("COD");
        // paymentStatus giữ nguyên UNPAID
        paymentRepository.save(payment);
        
        // ✅ KHÔNG trừ kho ở đây - COD sẽ trừ khi DELIVERED
        // Đơn COD chỉ có stock reserved, chưa confirm sale
        
        // Gửi notification cho khách hàng
        notifyCustomerPaymentChange(
                order,
                previousOrderStatus,
                OrderStatus.CONFIRMED,
                PaymentStatus.UNPAID,
                PaymentStatus.UNPAID,
                null,
                NotificationAction.CONFIRM,
                "Đơn hàng " + order.getOrderCode() + " đã được chuyển sang thanh toán COD và đã được xác nhận."
        );
    }

    @Override
    public List<PaymentAttempt> getArchivedAttempts() {
        // Get archived attempts (exclude soft deleted ones in trash)
        List<PaymentAttempt> archived = paymentAttemptRepository.findAllByArchivedAtIsNotNullAndDeletedAtIsNullAndTransferImageUrlIsNotNullOrderByArchivedAtDesc();
        System.out.println("[WAREHOUSE] Found " + archived.size() + " archived payment attempts (excluding trash)");
        for (PaymentAttempt attempt : archived) {
            System.out.println("  - attemptId=" + attempt.getAttemptId() + 
                             ", orderId=" + attempt.getOrderId() + 
                             ", archivedAt=" + attempt.getArchivedAt() + 
                             ", hasImage=" + (attempt.getTransferImageUrl() != null));
        }
        return archived;
    }

    @Override
    @Transactional
    public void deleteArchivedAttemptForever(Integer attemptId) {
        PaymentAttempt attempt = paymentAttemptRepository.findById(attemptId)
                .orElseThrow(() -> new IllegalArgumentException("Payment attempt not found"));
        
        if (attempt.getArchivedAt() == null) {
            throw new IllegalStateException("Chỉ có thể xóa vĩnh viễn bill đã được lưu trữ");
        }
        
        paymentAttemptRepository.delete(attempt);
    }

    @Override
    @Transactional
    public void deleteAllArchivedAttempts() {
        List<PaymentAttempt> archived = paymentAttemptRepository.findAllByArchivedAtIsNotNullAndDeletedAtIsNullAndTransferImageUrlIsNotNullOrderByArchivedAtDesc();
        if (!archived.isEmpty()) {
            // Soft delete all archived bills
            for (PaymentAttempt attempt : archived) {
                attempt.setDeletedAt(LocalDateTime.now());
            }
            paymentAttemptRepository.saveAll(archived);
        }
    }
    
    // ============= TRASH MANAGEMENT (SOFT DELETE) =============
    
    @Override
    public List<PaymentAttempt> getTrashedAttempts() {
        return paymentAttemptRepository.findAllByDeletedAtIsNotNullOrderByDeletedAtDesc();
    }
    
    @Override
    @Transactional
    public void softDeleteAttempt(Integer attemptId) {
        PaymentAttempt attempt = paymentAttemptRepository.findById(attemptId)
                .orElseThrow(() -> new IllegalArgumentException("Payment attempt not found"));
        
        if (attempt.getDeletedAt() != null) {
            throw new IllegalStateException("Bill này đã bị xóa rồi");
        }
        
        attempt.setDeletedAt(LocalDateTime.now());
        paymentAttemptRepository.save(attempt);
        
        System.out.println("✅ Soft deleted payment attempt: attemptId=" + attemptId);
    }
    
    @Override
    @Transactional
    public void restoreAttempt(Integer attemptId) {
        PaymentAttempt attempt = paymentAttemptRepository.findByAttemptIdAndDeletedAtIsNotNull(attemptId)
                .orElseThrow(() -> new IllegalArgumentException("Payment attempt not found in trash"));
        
        attempt.setDeletedAt(null);
        paymentAttemptRepository.save(attempt);
        
        System.out.println("✅ Restored payment attempt: attemptId=" + attemptId);
    }
    
    @Override
    @Transactional
    public void deleteAttemptForever(Integer attemptId) {
        PaymentAttempt attempt = paymentAttemptRepository.findByAttemptIdAndDeletedAtIsNotNull(attemptId)
                .orElseThrow(() -> new IllegalArgumentException("Payment attempt not found in trash"));
        
        // Chuyển vào archived trước khi xóa vĩnh viễn
        attempt.setArchivedAt(LocalDateTime.now());
        attempt.setDeletedAt(null); // Clear soft delete flag
        
        // Lưu snapshot của order code và admin note nếu có
        if (attempt.getOrderId() != null) {
            orderRepository.findById(attempt.getOrderId()).ifPresent(order -> {
                attempt.setArchivedOrderCode(order.getOrderCode());
                attempt.setArchivedAdminNote(order.getPaymentNote()); // Use paymentNote instead
            });
        }
        
        // Unlink order (set orderId = null)
        attempt.setOrderId(null);
        
        paymentAttemptRepository.save(attempt);
        
        System.out.println("✅ Archived payment attempt (deleted forever from trash): attemptId=" + attemptId);
    }
}

