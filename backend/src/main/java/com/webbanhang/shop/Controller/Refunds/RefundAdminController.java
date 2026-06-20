package com.webbanhang.shop.Controller.Refunds;

import com.webbanhang.shop.DTO.Refund.RefundActionRequest;
import com.webbanhang.shop.DTO.Refund.RefundResponse;
import com.webbanhang.shop.Model.Refunds.RefundStatus;
import com.webbanhang.shop.Service.Refunds.RefundService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/refunds")
@RequiredArgsConstructor
public class RefundAdminController {

    private final RefundService refundService;

    @GetMapping
    public ResponseEntity<Page<RefundResponse>> getAllRefunds(
            @RequestParam(required = false) RefundStatus status,
            @RequestParam(required = false) Integer customerId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        
        Pageable pageable = PageRequest.of(page, size);
        Page<RefundResponse> refunds = refundService.getAllRefunds(status, customerId, pageable);
        return ResponseEntity.ok(refunds);
    }

    @GetMapping("/{refundId}")
    public ResponseEntity<RefundResponse> getRefundById(@PathVariable Integer refundId) {
        RefundResponse response = refundService.getRefundById(refundId);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{refundId}/approve")
    public ResponseEntity<RefundResponse> approveRefund(
            @PathVariable Integer refundId,
            @Valid @RequestBody(required = false) RefundActionRequest request,
            Authentication authentication) {
        
        Integer adminId = extractAdminId(authentication);
        String adminName = extractAdminName(authentication);
        
        RefundActionRequest actionRequest = request != null ? request : new RefundActionRequest();
        RefundResponse response = refundService.approveRefund(refundId, adminId, adminName, actionRequest);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{refundId}/reject")
    public ResponseEntity<RefundResponse> rejectRefund(
            @PathVariable Integer refundId,
            @Valid @RequestBody RefundActionRequest request,
            Authentication authentication) {
        
        Integer adminId = extractAdminId(authentication);
        String adminName = extractAdminName(authentication);
        
        RefundResponse response = refundService.rejectRefund(refundId, adminId, adminName, request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{refundId}/process")
    public ResponseEntity<RefundResponse> processRefund(
            @PathVariable Integer refundId,
            Authentication authentication) {
        
        Integer adminId = extractAdminId(authentication);
        String adminName = extractAdminName(authentication);
        
        RefundResponse response = refundService.processRefund(refundId, adminId, adminName);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{refundId}/complete")
    public ResponseEntity<RefundResponse> completeRefund(
            @PathVariable Integer refundId,
            @Valid @RequestBody RefundActionRequest request,
            Authentication authentication) {
        
        Integer adminId = extractAdminId(authentication);
        String adminName = extractAdminName(authentication);
        
        RefundResponse response = refundService.completeRefund(refundId, adminId, adminName, request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{refundId}/fail")
    public ResponseEntity<RefundResponse> failRefund(
            @PathVariable Integer refundId,
            @Valid @RequestBody RefundActionRequest request,
            Authentication authentication) {
        
        Integer adminId = extractAdminId(authentication);
        String adminName = extractAdminName(authentication);
        
        RefundResponse response = refundService.failRefund(refundId, adminId, adminName, request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{refundId}/hold")
    public ResponseEntity<RefundResponse> holdRefund(
            @PathVariable Integer refundId,
            @Valid @RequestBody RefundActionRequest request,
            Authentication authentication) {
        
        Integer adminId = extractAdminId(authentication);
        String adminName = extractAdminName(authentication);
        
        RefundResponse response = refundService.holdRefund(refundId, adminId, adminName, request);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{refundId}")
    public ResponseEntity<Void> softDeleteRefund(
            @PathVariable Integer refundId,
            @RequestParam String reason,
            Authentication authentication) {
        
        Integer adminId = extractAdminId(authentication);
        refundService.softDeleteRefund(refundId, adminId, reason);
        return ResponseEntity.noContent().build();
    }

    // Helper methods
    private Integer extractAdminId(Authentication authentication) {
        // Extract from JWT token or authentication principal
        // Implementation depends on your security setup
        return (Integer) authentication.getPrincipal();
    }

    private String extractAdminName(Authentication authentication) {
        // Extract from JWT token or authentication principal
        // Implementation depends on your security setup
        return authentication.getName();
    }
}
