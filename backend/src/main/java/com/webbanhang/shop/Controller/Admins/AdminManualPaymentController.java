package com.webbanhang.shop.Controller.Admins;

import com.webbanhang.shop.Service.Payments.PaymentService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/payments")
public class AdminManualPaymentController {

    private final PaymentService paymentService;

    public AdminManualPaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @GetMapping("/pending")
    public ResponseEntity<?> getPendingPayments() {
        return ResponseEntity.ok(paymentService.getPendingPayments());
    }

    @PostMapping("/approve/{orderId}")
    public ResponseEntity<?> approvePayment(
            @PathVariable Integer orderId,
            @RequestParam(value = "adminNote", required = false) String adminNote
    ) {
        // In a real app, you'd get adminId from SecurityContext
        Integer adminId = 1; 
        paymentService.adminApprovePayment(orderId, adminId, adminNote);
        return ResponseEntity.ok(Map.of("message", "Payment approved successfully"));
    }

    @PostMapping("/reject/{orderId}")
    public ResponseEntity<?> rejectPayment(
            @PathVariable Integer orderId,
            @RequestParam(value = "adminNote", required = false) String adminNote
    ) {
        Integer adminId = 1;
        paymentService.adminRejectPayment(orderId, adminId, adminNote);
        return ResponseEntity.ok(Map.of("message", "Payment rejected"));
    }
}
