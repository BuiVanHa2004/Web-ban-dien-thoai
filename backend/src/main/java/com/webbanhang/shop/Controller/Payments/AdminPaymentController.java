package com.webbanhang.shop.Controller.Payments;

import com.webbanhang.shop.Service.Payments.PaymentService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.List;
import com.webbanhang.shop.Model.Orders.PaymentAttempt;
import com.webbanhang.shop.Model.Orders.PaymentLog;

@RestController
@RequestMapping("/api/admin/payments/bank-transfer")
public class AdminPaymentController {

    private final PaymentService paymentService;

    public AdminPaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @GetMapping("/attempts")
    public ResponseEntity<List<PaymentAttempt>> getPaymentAttempts(
            @RequestParam(value = "status", required = false) String status) {
        return ResponseEntity.ok(paymentService.getPaymentAttempts(status));
    }

    @PostMapping("/lock/{attemptId}")
    public ResponseEntity<?> lockPayment(@PathVariable Integer attemptId, @RequestParam Integer adminId) {
        paymentService.lockPayment(attemptId, adminId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/release/{attemptId}")
    public ResponseEntity<?> releaseLock(@PathVariable Integer attemptId, @RequestParam Integer adminId) {
        paymentService.releaseLock(attemptId, adminId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/approve/{attemptId}")
    public ResponseEntity<?> approvePayment(
            @PathVariable Integer attemptId,
            @RequestParam Integer adminId,
            @RequestBody Map<String, String> payload) {
        paymentService.adminApprovePayment(attemptId, adminId, payload.get("note"));
        return ResponseEntity.ok().build();
    }

    @PostMapping("/reject/{attemptId}")
    public ResponseEntity<?> rejectPayment(
            @PathVariable Integer attemptId,
            @RequestParam Integer adminId,
            @RequestBody Map<String, String> payload) {
        paymentService.adminRejectPayment(attemptId, adminId, payload.get("note"));
        return ResponseEntity.ok().build();
    }

    @PostMapping("/log-view/{attemptId}")
    public ResponseEntity<?> logView(@PathVariable Integer attemptId, @RequestParam Integer adminId) {
        paymentService.logViewBill(attemptId, adminId);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/logs/{orderId}")
    public ResponseEntity<List<PaymentLog>> getLogs(@PathVariable Integer orderId) {
        return ResponseEntity.ok(paymentService.getLogsByOrderId(orderId));
    }

    @PatchMapping("/order/{orderId}/note")
    public ResponseEntity<?> updateOrderNote(@PathVariable Integer orderId, @RequestBody Map<String, String> payload) {
        paymentService.updateOrderNote(orderId, payload.get("note"), payload.get("authorName"));
        return ResponseEntity.ok().build();
    }

    @GetMapping("/archived")
    public ResponseEntity<List<PaymentAttempt>> getArchivedAttempts() {
        return ResponseEntity.ok(paymentService.getArchivedAttempts());
    }

    @DeleteMapping("/archived/{attemptId}")
    public ResponseEntity<?> deleteArchivedAttemptForever(@PathVariable Integer attemptId) {
        paymentService.deleteArchivedAttemptForever(attemptId);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/archived/all")
    public ResponseEntity<?> deleteAllArchivedAttempts() {
        paymentService.deleteAllArchivedAttempts();
        return ResponseEntity.ok().build();
    }
}
