package com.webbanhang.shop.Service.Refunds.Impl;

import com.webbanhang.shop.DTO.Refund.*;
import com.webbanhang.shop.Exception.BadRequestException;
import com.webbanhang.shop.Exception.NotFoundException;
import com.webbanhang.shop.Model.Orders.Order;
import com.webbanhang.shop.Model.Orders.PaymentStatus;
import com.webbanhang.shop.Model.Refunds.Refund;
import com.webbanhang.shop.Model.Refunds.RefundMethod;
import com.webbanhang.shop.Model.Refunds.RefundStatus;
import com.webbanhang.shop.Repository.Orders.OrderRepository;
import com.webbanhang.shop.Repository.RefundRepository;
import com.webbanhang.shop.Service.Refunds.RefundService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class RefundServiceImpl implements RefundService {

    private final RefundRepository refundRepository;
    private final OrderRepository orderRepository;

    // ============================================
    // CUSTOMER OPERATIONS
    // ============================================

    @Override
    @Transactional(timeout = 30)
    public RefundResponse createRefund(Integer customerId, RefundCreateRequest request) {
        // Check idempotency
        if (request.getIdempotencyKey() != null) {
            var existing = refundRepository.findByIdempotencyKey(request.getIdempotencyKey());
            if (existing.isPresent()) {
                return toResponse(existing.get());
            }
        }

        // Validate order
        Order order = orderRepository.findById(request.getOrderId())
                .orElseThrow(() -> new NotFoundException("Order not found"));

        if (!order.getCustomerId().equals(customerId)) {
            throw new BadRequestException("You can only refund your own orders");
        }

        // Check if already has active refund
        var activeRefund = refundRepository.findActiveRefundByOrderId(order.getOrderId());
        if (activeRefund.isPresent()) {
            throw new BadRequestException("This order already has an active refund request");
        }

        // Validate order is eligible for refund
        if (order.getPaymentStatus() != PaymentStatus.PAID) {
            throw new BadRequestException("Only paid orders can be refunded");
        }

        // Validate refund amount
        if (request.getRefundAmount().compareTo(order.getTotalAmount()) > 0) {
            throw new BadRequestException("Refund amount cannot exceed order total");
        }

        // Validate bank account if method is BANK_TRANSFER
        if (request.getRefundMethod() == RefundMethod.BANK_TRANSFER) {
            validateBankAccount(request);
        }

        // Create refund
        Refund refund = new Refund();
        refund.setOrderId(order.getOrderId());
        refund.setCustomerId(customerId);
        // Note: paymentId can be set later if needed (payments.order_id FK exists)
        refund.setRefundAmount(request.getRefundAmount());
        refund.setOrderTotalAmount(order.getTotalAmount());
        refund.setIsFullRefund(request.getIsFullRefund());
        refund.setRefundMethod(request.getRefundMethod());
        refund.setRefundReason(request.getRefundReason());
        refund.setIdempotencyKey(request.getIdempotencyKey());
        refund.setRequestIpAddress(request.getRequestIpAddress());
        refund.setRequestUserAgent(request.getRequestUserAgent());

        // Bank account info
        if (request.getRefundMethod() == RefundMethod.BANK_TRANSFER) {
            refund.setCustomerBankName(request.getCustomerBankName());
            refund.setCustomerBankCode(request.getCustomerBankCode());
            refund.setCustomerAccountNumber(request.getCustomerAccountNumber());
            refund.setCustomerAccountHolder(request.getCustomerAccountHolder());
        }

        // Set refund deadline (e.g., 30 days from now)
        refund.setRefundDeadline(LocalDateTime.now().plusDays(30));

        refund = refundRepository.save(refund);
        
        // Generate refund_code after save (to get refund_id)
        if (refund.getRefundCode() == null || refund.getRefundCode().isEmpty()) {
            String date = LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd"));
            refund.setRefundCode(String.format("RF-%s-%06d", date, refund.getRefundId()));
            refund = refundRepository.save(refund);
        }
        
        return toResponse(refund);
    }

    @Override
    @Transactional(readOnly = true)
    public RefundResponse getRefundByCode(String refundCode, Integer customerId) {
        Refund refund = refundRepository.findByRefundCodeAndDeletedAtIsNull(refundCode)
                .orElseThrow(() -> new NotFoundException("Refund not found"));

        if (!refund.getCustomerId().equals(customerId)) {
            throw new BadRequestException("Access denied");
        }

        return toResponse(refund);
    }

    @Override
    @Transactional(readOnly = true)
    public RefundResponse getRefundByOrderId(Integer orderId, Integer customerId) {
        Refund refund = refundRepository.findByOrderIdAndCustomerId(orderId, customerId)
                .orElseThrow(() -> new NotFoundException("Refund not found for this order"));

        return toResponse(refund);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<RefundResponse> getCustomerRefunds(Integer customerId, Pageable pageable) {
        return refundRepository.findByCustomerId(customerId, pageable)
                .map(this::toResponse);
    }

    @Override
    @Transactional(timeout = 30)
    public RefundResponse updateRefundInfo(String refundCode, Integer customerId, RefundUpdateRequest request) {
        Refund refund = refundRepository.findByRefundCodeAndDeletedAtIsNull(refundCode)
                .orElseThrow(() -> new NotFoundException("Refund not found"));

        if (!refund.getCustomerId().equals(customerId)) {
            throw new BadRequestException("Access denied");
        }

        // Can only update if PENDING_INFO
        if (refund.getRefundStatus() != RefundStatus.PENDING_INFO) {
            throw new BadRequestException("Can only update refund in PENDING_INFO status");
        }

        // Update fields
        if (request.getRefundReason() != null) {
            refund.setRefundReason(request.getRefundReason());
        }

        if (refund.getRefundMethod() == RefundMethod.BANK_TRANSFER) {
            if (request.getCustomerBankName() != null) {
                refund.setCustomerBankName(request.getCustomerBankName());
            }
            if (request.getCustomerBankCode() != null) {
                refund.setCustomerBankCode(request.getCustomerBankCode());
            }
            if (request.getCustomerAccountNumber() != null) {
                refund.setCustomerAccountNumber(request.getCustomerAccountNumber());
            }
            if (request.getCustomerAccountHolder() != null) {
                refund.setCustomerAccountHolder(request.getCustomerAccountHolder());
            }
        }

        // Move to PENDING_APPROVAL if bank info complete
        if (isBankInfoComplete(refund)) {
            refund.setRefundStatus(RefundStatus.PENDING_APPROVAL);
        }

        refund = refundRepository.save(refund);
        return toResponse(refund);
    }

    @Override
    @Transactional(timeout = 30)
    public RefundResponse cancelRefund(String refundCode, Integer customerId) {
        Refund refund = refundRepository.findByRefundCodeAndDeletedAtIsNull(refundCode)
                .orElseThrow(() -> new NotFoundException("Refund not found"));

        if (!refund.getCustomerId().equals(customerId)) {
            throw new BadRequestException("Access denied");
        }

        // Can cancel only if PENDING_INFO or PENDING_APPROVAL
        if (refund.getRefundStatus() != RefundStatus.PENDING_INFO 
            && refund.getRefundStatus() != RefundStatus.PENDING_APPROVAL) {
            throw new BadRequestException("Cannot cancel refund in current status");
        }

        refund.setRefundStatus(RefundStatus.CANCELLED);
        refund = refundRepository.save(refund);
        return toResponse(refund);
    }

    // ============================================
    // ADMIN OPERATIONS
    // ============================================

    @Override
    @Transactional(readOnly = true)
    public Page<RefundResponse> getAllRefunds(RefundStatus status, Integer customerId, Pageable pageable) {
        return refundRepository.findAllWithFilters(status, customerId, pageable)
                .map(this::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public RefundResponse getRefundById(Integer refundId) {
        Refund refund = refundRepository.findById(refundId)
                .orElseThrow(() -> new NotFoundException("Refund not found"));

        if (refund.getDeletedAt() != null) {
            throw new NotFoundException("Refund has been deleted");
        }

        return toResponse(refund);
    }

    @Override
    @Transactional(timeout = 30)
    public RefundResponse approveRefund(Integer refundId, Integer adminId, String adminName, RefundActionRequest request) {
        Refund refund = findRefundForUpdate(refundId);

        // Validate transition
        if (refund.getRefundStatus() != RefundStatus.PENDING_APPROVAL) {
            throw new BadRequestException("Can only approve refund in PENDING_APPROVAL status");
        }

        refund.setRefundStatus(RefundStatus.APPROVED);
        refund.setApprovedByAdminId(adminId);
        refund.setApprovedByAdminName(adminName);
        refund.setApprovedAt(LocalDateTime.now());

        refund = refundRepository.save(refund);
        return toResponse(refund);
    }

    @Override
    @Transactional(timeout = 30)
    public RefundResponse rejectRefund(Integer refundId, Integer adminId, String adminName, RefundActionRequest request) {
        Refund refund = findRefundForUpdate(refundId);

        // Validate transition
        if (refund.getRefundStatus() != RefundStatus.PENDING_APPROVAL) {
            throw new BadRequestException("Can only reject refund in PENDING_APPROVAL status");
        }

        if (request.getReason() == null || request.getReason().isBlank()) {
            throw new BadRequestException("Reject reason is required");
        }

        refund.setRefundStatus(RefundStatus.REJECTED);
        refund.setRejectedByAdminId(adminId);
        refund.setRejectedByAdminName(adminName);
        refund.setRejectedAt(LocalDateTime.now());
        refund.setRejectReason(request.getReason());

        refund = refundRepository.save(refund);
        return toResponse(refund);
    }

    @Override
    @Transactional(timeout = 30)
    public RefundResponse processRefund(Integer refundId, Integer adminId, String adminName) {
        Refund refund = findRefundForUpdate(refundId);

        // Validate transition
        if (refund.getRefundStatus() != RefundStatus.APPROVED) {
            throw new BadRequestException("Can only process refund in APPROVED status");
        }

        refund.setRefundStatus(RefundStatus.PROCESSING);
        refund.setProcessedByAdminId(adminId);
        refund.setProcessedByAdminName(adminName);
        refund.setProcessedAt(LocalDateTime.now());

        refund = refundRepository.save(refund);
        return toResponse(refund);
    }

    @Override
    @Transactional(timeout = 30)
    public RefundResponse completeRefund(Integer refundId, Integer adminId, String adminName, RefundActionRequest request) {
        Refund refund = findRefundForUpdate(refundId);

        // Validate transition
        if (refund.getRefundStatus() != RefundStatus.PROCESSING) {
            throw new BadRequestException("Can only complete refund in PROCESSING status");
        }

        refund.setRefundStatus(RefundStatus.COMPLETED);
        refund.setCompletedByAdminId(adminId);
        refund.setCompletedByAdminName(adminName);
        refund.setCompletedAt(LocalDateTime.now());

        if (request.getReceiptImageKey() != null) {
            refund.setReceiptImageKey(request.getReceiptImageKey());
            refund.setReceiptUploadedAt(LocalDateTime.now());
            refund.setReceiptUploadedByAdminId(adminId);
        }

        refund = refundRepository.save(refund);
        return toResponse(refund);
    }

    @Override
    @Transactional(timeout = 30)
    public RefundResponse failRefund(Integer refundId, Integer adminId, String adminName, RefundActionRequest request) {
        Refund refund = findRefundForUpdate(refundId);

        // Validate transition
        if (refund.getRefundStatus() != RefundStatus.PROCESSING) {
            throw new BadRequestException("Can only mark refund as failed in PROCESSING status");
        }

        if (request.getReason() == null || request.getReason().isBlank()) {
            throw new BadRequestException("Fail reason is required");
        }

        refund.setRefundStatus(RefundStatus.FAILED);
        refund.setFailedByAdminId(adminId);
        refund.setFailedByAdminName(adminName);
        refund.setFailedAt(LocalDateTime.now());
        refund.setFailedReason(request.getReason());

        refund = refundRepository.save(refund);
        return toResponse(refund);
    }

    @Override
    @Transactional(timeout = 30)
    public RefundResponse holdRefund(Integer refundId, Integer adminId, String adminName, RefundActionRequest request) {
        Refund refund = findRefundForUpdate(refundId);

        // Can hold from PENDING_APPROVAL or APPROVED
        if (refund.getRefundStatus() != RefundStatus.PENDING_APPROVAL 
            && refund.getRefundStatus() != RefundStatus.APPROVED) {
            throw new BadRequestException("Cannot hold refund in current status");
        }

        if (request.getReason() == null || request.getReason().isBlank()) {
            throw new BadRequestException("Hold reason is required");
        }

        refund.setRefundStatus(RefundStatus.ON_HOLD);
        refund.setOnHoldByAdminId(adminId);
        refund.setOnHoldByAdminName(adminName);
        refund.setOnHoldAt(LocalDateTime.now());
        refund.setOnHoldReason(request.getReason());

        refund = refundRepository.save(refund);
        return toResponse(refund);
    }

    @Override
    @Transactional(timeout = 30)
    public void softDeleteRefund(Integer refundId, Integer adminId, String reason) {
        Refund refund = refundRepository.findById(refundId)
                .orElseThrow(() -> new NotFoundException("Refund not found"));

        if (refund.getDeletedAt() != null) {
            throw new BadRequestException("Refund already deleted");
        }

        refund.setDeletedAt(LocalDateTime.now());
        refund.setDeletedByAdminId(adminId);
        refund.setDeletedReason(reason);

        refundRepository.save(refund);
    }

    // ============================================
    // HELPER METHODS
    // ============================================

    private Refund findRefundForUpdate(Integer refundId) {
        Refund refund = refundRepository.findById(refundId)
                .orElseThrow(() -> new NotFoundException("Refund not found"));

        if (refund.getDeletedAt() != null) {
            throw new BadRequestException("Refund has been deleted");
        }

        return refund;
    }

    private void validateBankAccount(RefundCreateRequest request) {
        if (request.getCustomerAccountNumber() == null || request.getCustomerAccountNumber().isBlank()) {
            throw new BadRequestException("Bank account number is required for bank transfer refund");
        }
        if (request.getCustomerBankName() == null || request.getCustomerBankName().isBlank()) {
            throw new BadRequestException("Bank name is required for bank transfer refund");
        }
        if (request.getCustomerAccountHolder() == null || request.getCustomerAccountHolder().isBlank()) {
            throw new BadRequestException("Account holder name is required for bank transfer refund");
        }
    }

    private boolean isBankInfoComplete(Refund refund) {
        if (refund.getRefundMethod() != RefundMethod.BANK_TRANSFER) {
            return true;
        }

        return refund.getCustomerAccountNumber() != null 
            && refund.getCustomerBankName() != null
            && refund.getCustomerAccountHolder() != null;
    }

    private RefundResponse toResponse(Refund refund) {
        RefundResponse response = new RefundResponse();
        
        response.setRefundId(refund.getRefundId());
        response.setRefundCode(refund.getRefundCode());
        response.setOrderId(refund.getOrderId());
        response.setCustomerId(refund.getCustomerId());
        response.setPaymentId(refund.getPaymentId());
        
        response.setRefundStatus(refund.getRefundStatus());
        response.setRefundAmount(refund.getRefundAmount());
        response.setOrderTotalAmount(refund.getOrderTotalAmount());
        response.setIsFullRefund(refund.getIsFullRefund());
        
        response.setRefundMethod(refund.getRefundMethod());
        response.setCustomerBankName(refund.getCustomerBankName());
        response.setCustomerBankCode(refund.getCustomerBankCode());
        response.setCustomerAccountNumber(refund.getCustomerAccountNumber());
        response.setCustomerAccountHolder(refund.getCustomerAccountHolder());
        
        response.setReceiptImageKey(refund.getReceiptImageKey());
        response.setReceiptUploadedAt(refund.getReceiptUploadedAt());
        
        response.setRefundReason(refund.getRefundReason());
        response.setRejectReason(refund.getRejectReason());
        
        // Admin actions
        response.setApprovedByAdminId(refund.getApprovedByAdminId());
        response.setApprovedAt(refund.getApprovedAt());
        response.setApprovedByAdminName(refund.getApprovedByAdminName());
        
        response.setProcessedByAdminId(refund.getProcessedByAdminId());
        response.setProcessedAt(refund.getProcessedAt());
        response.setProcessedByAdminName(refund.getProcessedByAdminName());
        
        response.setCompletedByAdminId(refund.getCompletedByAdminId());
        response.setCompletedAt(refund.getCompletedAt());
        response.setCompletedByAdminName(refund.getCompletedByAdminName());
        
        response.setRejectedByAdminId(refund.getRejectedByAdminId());
        response.setRejectedAt(refund.getRejectedAt());
        response.setRejectedByAdminName(refund.getRejectedByAdminName());
        
        response.setFailedAt(refund.getFailedAt());
        response.setFailedByAdminId(refund.getFailedByAdminId());
        response.setFailedByAdminName(refund.getFailedByAdminName());
        response.setFailedReason(refund.getFailedReason());
        
        response.setOnHoldAt(refund.getOnHoldAt());
        response.setOnHoldByAdminId(refund.getOnHoldByAdminId());
        response.setOnHoldByAdminName(refund.getOnHoldByAdminName());
        response.setOnHoldReason(refund.getOnHoldReason());
        
        response.setRefundDeadline(refund.getRefundDeadline());
        response.setExpiresAt(refund.getExpiresAt());
        
        response.setCreatedAt(refund.getCreatedAt());
        response.setUpdatedAt(refund.getUpdatedAt());
        
        return response;
    }
}
