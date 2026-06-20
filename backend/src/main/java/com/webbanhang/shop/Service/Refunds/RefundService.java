package com.webbanhang.shop.Service.Refunds;

import com.webbanhang.shop.DTO.Refund.*;
import com.webbanhang.shop.Model.Refunds.RefundStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface RefundService {

    // Customer operations
    RefundResponse createRefund(Integer customerId, RefundCreateRequest request);
    
    RefundResponse getRefundByCode(String refundCode, Integer customerId);
    
    RefundResponse getRefundByOrderId(Integer orderId, Integer customerId);
    
    Page<RefundResponse> getCustomerRefunds(Integer customerId, Pageable pageable);
    
    RefundResponse updateRefundInfo(String refundCode, Integer customerId, RefundUpdateRequest request);
    
    RefundResponse cancelRefund(String refundCode, Integer customerId);

    // Admin operations
    Page<RefundResponse> getAllRefunds(RefundStatus status, Integer customerId, Pageable pageable);
    
    RefundResponse getRefundById(Integer refundId);
    
    RefundResponse approveRefund(Integer refundId, Integer adminId, String adminName, RefundActionRequest request);
    
    RefundResponse rejectRefund(Integer refundId, Integer adminId, String adminName, RefundActionRequest request);
    
    RefundResponse processRefund(Integer refundId, Integer adminId, String adminName);
    
    RefundResponse completeRefund(Integer refundId, Integer adminId, String adminName, RefundActionRequest request);
    
    RefundResponse failRefund(Integer refundId, Integer adminId, String adminName, RefundActionRequest request);
    
    RefundResponse holdRefund(Integer refundId, Integer adminId, String adminName, RefundActionRequest request);
    
    void softDeleteRefund(Integer refundId, Integer adminId, String reason);
}
