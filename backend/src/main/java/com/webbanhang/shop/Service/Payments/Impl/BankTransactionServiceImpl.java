package com.webbanhang.shop.Service.Payments.Impl;

import com.webbanhang.shop.DTO.Payments.AdminCreateBankTransactionRequest;
import com.webbanhang.shop.DTO.Payments.MatchResultDto;
import com.webbanhang.shop.Model.Orders.BankTransaction;
import com.webbanhang.shop.Model.Orders.Order;
import com.webbanhang.shop.Model.Orders.PaymentStatus;
import com.webbanhang.shop.Repository.Orders.BankTransactionRepository;
import com.webbanhang.shop.Repository.Orders.OrderRepository;
import com.webbanhang.shop.Service.Payments.BankTransactionService;
import com.webbanhang.shop.Service.Payments.PaymentService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.webbanhang.shop.Service.Payments.PaymentLogService;
import com.webbanhang.shop.Service.Payments.PaymentNotificationService;
import com.webbanhang.shop.Model.Admins.AdminAccount;
import com.webbanhang.shop.Repository.Admins.AdminAccountRepository;
import com.webbanhang.shop.Repository.Settings.SettingRepository;
import com.webbanhang.shop.Model.Settings.Setting;
import com.webbanhang.shop.Model.Roles.RoleName;
import com.webbanhang.shop.Model.Orders.Payment;
import com.webbanhang.shop.Model.Orders.OrderStatus;
import com.webbanhang.shop.Model.Orders.PaymentAttempt;
import com.webbanhang.shop.Repository.Orders.PaymentAttemptRepository;
import com.webbanhang.shop.Repository.Orders.PaymentRepository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Service
public class BankTransactionServiceImpl implements BankTransactionService {
    private static final Logger log = LoggerFactory.getLogger(BankTransactionServiceImpl.class);

    private final BankTransactionRepository bankTransactionRepository;
    private final OrderRepository orderRepository;
    private final PaymentService paymentService;
    private final PaymentLogService paymentLogService;
    private final PaymentNotificationService paymentNotificationService;
    private final AdminAccountRepository adminAccountRepository;
    private final PaymentRepository paymentRepository;
    private final PaymentAttemptRepository paymentAttemptRepository;
    private final SettingRepository settingRepository;

    public BankTransactionServiceImpl(
            BankTransactionRepository bankTransactionRepository,
            OrderRepository orderRepository,
            PaymentService paymentService,
            PaymentLogService paymentLogService,
            PaymentNotificationService paymentNotificationService,
            AdminAccountRepository adminAccountRepository,
            PaymentRepository paymentRepository,
            PaymentAttemptRepository paymentAttemptRepository,
            SettingRepository settingRepository
    ) {
        this.bankTransactionRepository = bankTransactionRepository;
        this.orderRepository = orderRepository;
        this.paymentService = paymentService;
        this.paymentLogService = paymentLogService;
        this.paymentNotificationService = paymentNotificationService;
        this.adminAccountRepository = adminAccountRepository;
        this.paymentRepository = paymentRepository;
        this.paymentAttemptRepository = paymentAttemptRepository;
        this.settingRepository = settingRepository;
    }

    private BigDecimal getApproveThreshold() {
        return settingRepository.findTopByOrderBySettingIdDesc()
                .map(Setting::getPaymentApproveThreshold)
                .orElse(new BigDecimal("5000000.00"));
    }

    @Override
    @Transactional
    public BankTransaction createTransactionFromAdminInput(AdminCreateBankTransactionRequest request) {
        if (request.amount() == null || request.amount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("amount must be greater than 0");
        }

        if (request.transactionCode() != null && !request.transactionCode().isBlank()) {
            bankTransactionRepository.findByTransactionCode(request.transactionCode()).ifPresent(t -> {
                throw new IllegalStateException("transaction_code already exists");
            });
        }

        BankTransaction tx = new BankTransaction();
        tx.setTransactionCode(request.transactionCode());
        tx.setAccountNumber(request.accountNumber());
        tx.setBankName(request.bankName());
        tx.setAmount(request.amount());
        tx.setTransferContent(request.transferContent());
        tx.setTransferTime(request.transferTime() != null ? request.transferTime() : LocalDateTime.now());
        tx.setRawData(request.rawData());
        tx.setIsMatched(false);
        tx.setMatchedOrderId(null);
        return bankTransactionRepository.save(tx);
    }

    @Override
    @Transactional
    public List<BankTransaction> importTransactionsFromFile(String csvLikePayload) {
        if (csvLikePayload == null || csvLikePayload.isBlank()) {
            return List.of();
        }
        List<BankTransaction> saved = new ArrayList<>();
        String[] lines = csvLikePayload.split("\\r?\\n");
        for (String line : lines) {
            if (line == null || line.isBlank()) continue;
            String[] parts = line.split(",", -1);
            if (parts.length < 3) continue;
            BigDecimal amount;
            try {
                amount = new BigDecimal(parts[2].trim());
            } catch (Exception e) {
                continue;
            }
            AdminCreateBankTransactionRequest req = new AdminCreateBankTransactionRequest(
                    parts[0].trim(),
                    parts.length > 1 ? parts[1].trim() : null,
                    null,
                    amount,
                    parts.length > 3 ? parts[3].trim() : null,
                    LocalDateTime.now(),
                    line
            );
            saved.add(createTransactionFromAdminInput(req));
        }
        return saved;
    }

    @Override
    @Transactional
    public List<MatchResultDto> matchTransactionsWithOrders() {
        return autoMatchByContent();
    }

    @Override
    @Transactional
    public List<MatchResultDto> autoMatchByContent() {
        List<MatchResultDto> results = new ArrayList<>();
        List<BankTransaction> unmatchedTransactions = bankTransactionRepository.findAllByIsMatchedFalseAndDeletedAtIsNullOrderByCreatedAtDesc();
        List<Order> candidateOrders = orderRepository.findAllByDeletedAtIsNull();

        for (BankTransaction tx : unmatchedTransactions) {
            // Skip transactions that have been explicitly rejected or failed
            if ("REJECTED".equals(tx.getReconcileStatus()) || "FAILED".equals(tx.getReconcileStatus())) {
                continue;
            }

            String transferContent = tx.getTransferContent() == null ? "" : tx.getTransferContent().toUpperCase(Locale.ROOT);
            if (transferContent.isBlank() || tx.getAmount() == null) continue;

            for (Order order : candidateOrders) {
                if (order.getOrderCode() == null || order.getTotalAmount() == null) continue;
                if (order.getPaymentStatus() == PaymentStatus.PAID) continue;
                if (bankTransactionRepository.existsByMatchedOrderIdAndIsMatchedTrue(order.getOrderId())) continue;

                String orderCode = order.getOrderCode().toUpperCase(Locale.ROOT);
                if (!transferContent.contains(orderCode)) continue;

                if (!isAmountMatched(tx.getAmount(), order.getTotalAmount())) continue;

                tx.setIsMatched(true);
                tx.setMatchedOrderId(order.getOrderId());
                tx.setReconcileStatus("MATCHED");
                bankTransactionRepository.save(tx);
                paymentService.confirmPayment(order.getOrderId(), null, null);

                paymentLogService.log(order.getOrderId(), null, null, tx.getTransactionId(),
                        0, "SYSTEM", "AUTO_MATCH", "UNPAID", "PAID",
                        "Hệ thống tự động khớp giao dịch: " + tx.getTransactionCode(), null);

                paymentNotificationService.notifyTransactionMatched(tx.getTransactionId(), order.getOrderId());

                results.add(new MatchResultDto(tx.getTransactionId(), order.getOrderId(), order.getOrderCode(), "AUTO_MATCHED"));
                log.info("Auto matched tx {} with order {}", tx.getTransactionId(), order.getOrderCode());
                break;
            }
        }
        return results;
    }

    @Override
    @Transactional
    public BankTransaction confirmMatch(Integer transactionId, Integer orderId, Integer adminId, String note) {
        BankTransaction tx = bankTransactionRepository.findById(transactionId)
                .orElseThrow(() -> new IllegalArgumentException("Transaction not found"));
        // Only block if already MATCHED (allow re-match from REJECTED)
        if (Boolean.TRUE.equals(tx.getIsMatched()) && "MATCHED".equals(tx.getReconcileStatus())) {
            throw new IllegalArgumentException("Giao dịch này đã được khớp lệnh rồi.");
        }

        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Order not found"));

        if (adminId != null && !adminId.equals(0)) {
            AdminAccount admin = adminAccountRepository.findById(adminId)
                    .orElseThrow(() -> new IllegalArgumentException("Tài khoản quản trị không tồn tại"));
            if (RoleName.STAFF.equals(admin.getRole().getRoleName())) {
                if (order.getTotalAmount().compareTo(getApproveThreshold()) >= 0) {
                    throw new IllegalStateException("Hạn mức khớp lệnh vượt quá quyền hạn của Nhân viên (Chỉ áp dụng với giao dịch dưới " 
                        + String.format("%,d", getApproveThreshold().longValue()) + " VND). Vui lòng chuyển cho Quản trị viên.");
                }
            }
        }

        // Allow re-match if order was previously FAILED/CANCELLED (from rejection)
        if (order.getPaymentStatus() == PaymentStatus.PAID) {
            throw new IllegalArgumentException("Đơn hàng này đã được thanh toán rồi.");
        }
        // Check if another DIFFERENT transaction is already matched to this order
        if (bankTransactionRepository.existsByMatchedOrderIdAndIsMatchedTrue(orderId)) {
            BankTransaction existingMatch = bankTransactionRepository.findTopByMatchedOrderIdAndIsMatchedTrueOrderByCreatedAtDesc(orderId).orElse(null);
            if (existingMatch != null && !existingMatch.getTransactionId().equals(transactionId)) {
                throw new IllegalArgumentException("Đơn hàng này đã được khớp với một giao dịch khác.");
            }
        }
        if (!isAmountMatched(tx.getAmount(), order.getTotalAmount())) {
            throw new IllegalArgumentException("Số tiền không khớp! Giao dịch: " + tx.getAmount() + ", Đơn hàng: " + order.getTotalAmount());
        }

        tx.setIsMatched(true);
        tx.setMatchedOrderId(orderId);
        tx.setReconcileStatus("MATCHED");
        tx.setMatchedByAdminId(adminId); 
        
        // Find and link the payment attempt if it exists
        paymentAttemptRepository.findTopByOrderIdAndStatusAndTransferImageUrlIsNotNullOrderByCreatedAtDesc(orderId, "PROCESSING")
                .or(() -> paymentAttemptRepository.findTopByOrderIdAndStatusAndTransferImageUrlIsNotNullOrderByCreatedAtDesc(orderId, "WAITING_CONFIRM"))
                .ifPresent(attempt -> {
                    tx.setPaymentAttemptId(attempt.getAttemptId());
                    paymentService.adminApprovePayment(attempt.getAttemptId(), adminId, note);
                });

        // FORCE explicit order status update to ensure synchronization
        order.setPaymentStatus(PaymentStatus.PAID);
        order.setOrderStatus(OrderStatus.CONFIRMED);
        if (note != null && !note.isBlank()) {
            order.setPaymentNote(note);
        }
        
        // Clear cancellation metadata as order is now matched/confirmed
        order.setCancelledAt(null);
        order.setCancelledBy(null);
        order.setCancelledByAdminId(null);
        order.setCancelledByName(null);
        order.setCancelReasonId(null);
        order.setCancelNote(null);
        
        orderRepository.save(order);

        BankTransaction saved = bankTransactionRepository.save(tx);
        
        // If no attempt was processed above, we still need to confirm payment in order/payment tables
        if (tx.getPaymentAttemptId() == null) {
            paymentService.confirmPayment(orderId, adminId, note);
        }
        
        String adminName = adminAccountRepository.findById(adminId)
                .map(AdminAccount::getFullName).orElse("Admin #" + adminId);
        
        paymentLogService.log(orderId, null, null, transactionId,
                adminId, adminName, "MANUAL_MATCH", "UNPAID", "PAID",
                "Quản trị viên đã khớp giao dịch thủ công" + (note != null && !note.isBlank() ? ": " + note : ""), null);

        try {
            paymentNotificationService.notifyTransactionMatched(transactionId, orderId);
        } catch (Exception e) {
            log.error("Failed to notify transaction match: {}", e.getMessage());
        }
        
        log.info("Manual confirm tx {} with order {}", transactionId, order.getOrderCode());
        return saved;
    }

    @Override
    public List<com.webbanhang.shop.DTO.Payments.SelectableOrderDto> getSelectableOrders() {
        // Chỉ lấy đơn hàng chưa THANH TOÁN và CHƯA có giao dịch nào khớp
        return orderRepository.findByPaymentMethodInAndPaymentStatusNot(List.of("BANK_TRANSFER", "Banking"), PaymentStatus.PAID)
                .stream()
                .filter(o -> !bankTransactionRepository.existsByMatchedOrderIdAndIsMatchedTrue(o.getOrderId()))
                .map(com.webbanhang.shop.DTO.Payments.SelectableOrderDto::fromEntity)
                .toList();
    }

    @Override
    @Transactional(noRollbackFor = Exception.class)
    public BankTransaction rejectMatch(Integer transactionId) {
        return rejectMatch(transactionId, null, null, null);
    }

    @Override
    @Transactional
    public BankTransaction rejectMatch(Integer transactionId, Integer orderId, Integer adminId, String note) {
        BankTransaction tx = bankTransactionRepository.findById(transactionId)
                .orElseThrow(() -> new IllegalArgumentException("Transaction not found"));
        
        Integer targetOrderId = orderId != null ? orderId : tx.getMatchedOrderId();
        if (targetOrderId == null) {
            throw new IllegalArgumentException("Không xác định được đơn hàng cần từ chối.");
        }

        if (adminId != null && !adminId.equals(0)) {
            AdminAccount admin = adminAccountRepository.findById(adminId)
                    .orElseThrow(() -> new IllegalArgumentException("Tài khoản quản trị không tồn tại"));
            if (RoleName.STAFF.equals(admin.getRole().getRoleName())) {
                Order order = orderRepository.findById(targetOrderId)
                        .orElseThrow(() -> new IllegalArgumentException("Đơn hàng không tồn tại"));
                if (order.getTotalAmount().compareTo(getApproveThreshold()) >= 0) {
                    throw new IllegalStateException("Hạn mức từ chối khớp lệnh vượt quá quyền hạn của Nhân viên (Chỉ áp dụng với giao dịch dưới " 
                        + String.format("%,d", getApproveThreshold().longValue()) + " VND). Vui lòng chuyển cho Quản trị viên.");
                }
            }
        }
        
        tx.setIsMatched(false);
        tx.setReconcileStatus("REJECTED");
        tx.setRejectedReason(note);
        
        // Find and link/reject the payment attempt if it exists
        paymentAttemptRepository.findTopByOrderIdAndStatusAndTransferImageUrlIsNotNullOrderByCreatedAtDesc(targetOrderId, "PROCESSING")
                .or(() -> paymentAttemptRepository.findTopByOrderIdAndStatusAndTransferImageUrlIsNotNullOrderByCreatedAtDesc(targetOrderId, "WAITING_CONFIRM"))
                .or(() -> paymentAttemptRepository.findTopByOrderIdAndStatusAndTransferImageUrlIsNotNullOrderByCreatedAtDesc(targetOrderId, "MATCHED"))
                .ifPresent(attempt -> {
                    tx.setPaymentAttemptId(attempt.getAttemptId());
                    paymentService.adminRejectPayment(attempt.getAttemptId(), adminId != null ? adminId : 1, 
                        note != null ? note : "Giao dịch ngân hàng " + tx.getTransactionCode() + " bị từ chối");
                });

        // Link the transaction to the order even if rejected
        tx.setMatchedOrderId(targetOrderId);
        if (adminId != null) tx.setMatchedByAdminId(adminId);
        
        // FORCE explicit order status update to ensure synchronization
        Order order = orderRepository.findById(targetOrderId).orElse(null);
        if (order != null) {
            order.setPaymentStatus(PaymentStatus.FAILED);
            order.setOrderStatus(OrderStatus.CANCELLED);
            if (note != null && !note.isBlank()) {
                order.setPaymentNote(note);
            }
            
            // Set cancellation metadata for Order detail view (Source identification)
            String adminName = (adminId != null) 
                ? adminAccountRepository.findById(adminId).map(AdminAccount::getFullName).orElse("Admin #" + adminId)
                : "Hệ thống";
                
            order.setCancelledAt(LocalDateTime.now());
            order.setCancelledBy(com.webbanhang.shop.Model.Orders.CancelledBy.ADMIN);
            order.setCancelledByAdminId(adminId);
            order.setCancelledByName(adminName);
            
            // Clear previous cancellation reasons to prioritize payment rejection info
            order.setCancelReasonId(null);
            order.setCancelNote(null);
            
            orderRepository.save(order);
        }

        // If no attempt was processed above, we still need to revoke payment in order/payment tables
        if (tx.getPaymentAttemptId() == null) {
            paymentService.revokePayment(targetOrderId, adminId != null ? adminId : 1, 
                note != null ? note : "Giao dịch ngân hàng " + tx.getTransactionCode() + " bị từ chối");
        }
        
        log.info("Rejected match for tx {}", transactionId);
        return bankTransactionRepository.save(tx);
    }

    @Override
    public List<BankTransaction> getAll(Boolean matched, Boolean trash) {
        if (Boolean.TRUE.equals(trash)) {
            return bankTransactionRepository.findAllByDeletedAtIsNotNullOrderByCreatedAtDesc();
        }

        if (matched == null) return bankTransactionRepository.findAllByDeletedAtIsNullOrderByCreatedAtDesc();
        if (matched) {
            return bankTransactionRepository.findAllByDeletedAtIsNullOrderByCreatedAtDesc().stream()
                    .filter(t -> Boolean.TRUE.equals(t.getIsMatched()))
                    .toList();
        }
        return bankTransactionRepository.findAllByIsMatchedFalseAndDeletedAtIsNullOrderByCreatedAtDesc();
    }

    @Scheduled(fixedDelayString = "${payment.bank-transfer.auto-match.fixed-delay-ms:60000}")
    public void autoMatchScheduler() {
        try {
            autoMatchByContent();
        } catch (Exception e) {
            log.error("Auto match scheduler failed", e);
        }
    }

    @Override
    @Transactional
    public void delete(Integer transactionId) {
        BankTransaction tx = bankTransactionRepository.findById(transactionId)
                .orElseThrow(() -> new IllegalArgumentException("Transaction not found"));
        
        // If the transaction being deleted is matched, we should probably revoke the payment too
        if (Boolean.TRUE.equals(tx.getIsMatched()) && tx.getMatchedOrderId() != null) {
            log.info("Deleting a matched transaction {}, revoking payment for order {}", transactionId, tx.getMatchedOrderId());
            paymentService.revokePayment(tx.getMatchedOrderId(), tx.getMatchedByAdminId(), 
                "Xóa giao dịch ngân hàng đã khớp " + tx.getTransactionCode());
            tx.setIsMatched(false);
            tx.setReconcileStatus("DELETED");
        }
        
        tx.setDeletedAt(LocalDateTime.now());
        bankTransactionRepository.save(tx);
        log.info("Soft deleted bank transaction {}", transactionId);
    }

    @Override
    @Transactional
    public void restore(Integer transactionId) {
        BankTransaction tx = bankTransactionRepository.findById(transactionId)
                .orElseThrow(() -> new IllegalArgumentException("Transaction not found"));
        tx.setDeletedAt(null);
        bankTransactionRepository.save(tx);
        log.info("Restored bank transaction {}", transactionId);
    }

    @Override
    @Transactional
    public void hardDelete(Integer transactionId) {
        bankTransactionRepository.deleteById(transactionId);
        log.info("Hard deleted bank transaction {}", transactionId);
    }

    @Override
    @Transactional
    public BankTransaction reMatchTransaction(Integer transactionId, Integer adminId, String note) {
        log.info("Re-matching transaction {} with admin {}", transactionId, adminId);
        BankTransaction tx = bankTransactionRepository.findById(transactionId)
                .orElseThrow(() -> new IllegalArgumentException("Transaction not found"));
        
        if (tx.getMatchedOrderId() == null) {
            throw new IllegalArgumentException("Giao dịch này chưa được gắn đơn hàng nào.");
        }
        
        if (Boolean.TRUE.equals(tx.getIsMatched()) && "MATCHED".equals(tx.getReconcileStatus())) {
            throw new IllegalArgumentException("Giao dịch này đã ở trạng thái Khớp lệnh rồi.");
        }
        
        // Reset the isMatched flag so confirmMatch sees it as unmatched
        tx.setIsMatched(false);
        tx.setReconcileStatus(null);
        
        return confirmMatch(transactionId, tx.getMatchedOrderId(), adminId, 
                note != null ? note : "Chuyển trạng thái từ Từ chối sang Khớp lệnh");
    }


    private boolean isAmountMatched(BigDecimal txAmount, BigDecimal orderAmount) {
        BigDecimal tolerance = BigDecimal.valueOf(1000);
        return txAmount.subtract(orderAmount).abs().compareTo(tolerance) <= 0;
    }

    /**
     * Resolve any WAITING_CONFIRM PaymentAttempt for this order.
     * Removes the customer's VietQR proof from the admin queue since the transaction has been handled.
     */
    private void resolvePaymentAttemptForOrder(Integer orderId, String newStatus) {
        try {
            paymentAttemptRepository
                    .findTopByOrderIdAndStatusAndTransferImageUrlIsNotNullOrderByCreatedAtDesc(orderId, "WAITING_CONFIRM")
                    .ifPresent(attempt -> {
                        attempt.setStatus(newStatus);
                        attempt.setProcessingByAdminId(null);
                        attempt.setProcessingByAdminName(null);
                        attempt.setLockExpiresAt(null);
                        paymentAttemptRepository.save(attempt);
                        log.info("Resolved PaymentAttempt {} for order {} -> {}", attempt.getAttemptId(), orderId, newStatus);
                    });
        } catch (Exception e) {
            log.error("Failed to resolve PaymentAttempt for order {}: {}", orderId, e.getMessage());
        }
    }
}
