package com.webbanhang.shop.Controller.Refunds;

import com.webbanhang.shop.DTO.Refund.RefundCreateRequest;
import com.webbanhang.shop.DTO.Refund.RefundResponse;
import com.webbanhang.shop.DTO.Refund.RefundUpdateRequest;
import com.webbanhang.shop.Service.Refunds.RefundService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/customer/refunds")
@RequiredArgsConstructor
public class RefundController {

    private final RefundService refundService;

    @PostMapping
    public ResponseEntity<RefundResponse> createRefund(
            @Valid @RequestBody RefundCreateRequest request,
            Authentication authentication,
            HttpServletRequest httpRequest) {
        
        Integer customerId = extractCustomerId(authentication);
        
        // Capture request metadata
        request.setRequestIpAddress(getClientIp(httpRequest));
        request.setRequestUserAgent(httpRequest.getHeader("User-Agent"));
        
        RefundResponse response = refundService.createRefund(customerId, request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/code/{refundCode}")
    public ResponseEntity<RefundResponse> getRefundByCode(
            @PathVariable String refundCode,
            Authentication authentication) {
        
        Integer customerId = extractCustomerId(authentication);
        RefundResponse response = refundService.getRefundByCode(refundCode, customerId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/order/{orderId}")
    public ResponseEntity<RefundResponse> getRefundByOrderId(
            @PathVariable Integer orderId,
            Authentication authentication) {
        
        Integer customerId = extractCustomerId(authentication);
        RefundResponse response = refundService.getRefundByOrderId(orderId, customerId);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    public ResponseEntity<Page<RefundResponse>> getMyRefunds(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            Authentication authentication) {
        
        Integer customerId = extractCustomerId(authentication);
        Pageable pageable = PageRequest.of(page, size);
        Page<RefundResponse> refunds = refundService.getCustomerRefunds(customerId, pageable);
        return ResponseEntity.ok(refunds);
    }

    @PutMapping("/{refundCode}")
    public ResponseEntity<RefundResponse> updateRefundInfo(
            @PathVariable String refundCode,
            @Valid @RequestBody RefundUpdateRequest request,
            Authentication authentication) {
        
        Integer customerId = extractCustomerId(authentication);
        RefundResponse response = refundService.updateRefundInfo(refundCode, customerId, request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{refundCode}/cancel")
    public ResponseEntity<RefundResponse> cancelRefund(
            @PathVariable String refundCode,
            Authentication authentication) {
        
        Integer customerId = extractCustomerId(authentication);
        RefundResponse response = refundService.cancelRefund(refundCode, customerId);
        return ResponseEntity.ok(response);
    }

    // Helper methods
    private Integer extractCustomerId(Authentication authentication) {
        // Extract from JWT token or authentication principal
        // Implementation depends on your security setup
        return (Integer) authentication.getPrincipal();
    }

    private String getClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
