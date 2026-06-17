package com.webbanhang.shop.Controller.Payments;

import com.webbanhang.shop.DTO.Orders.PaymentQRResponse;
import com.webbanhang.shop.Model.Orders.PaymentAttempt;
import com.webbanhang.shop.Service.Payments.PaymentService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    /**
     * Lấy thông tin QR code để thanh toán
     * GET /api/payments/qr/{orderCode}
     */
    @GetMapping("/qr/{orderCode}")
    public ResponseEntity<PaymentQRResponse> getPaymentQR(@PathVariable String orderCode) {
        PaymentQRResponse response = paymentService.getPaymentQRInfoByOrderCode(orderCode);
        return ResponseEntity.ok(response);
    }

    /**
     * Upload bill thanh toán
     * POST /api/payments/upload-bill
     */
    @PostMapping("/upload-bill")
    public ResponseEntity<Map<String, Object>> uploadBill(
            @RequestParam("orderCode") String orderCode,
            @RequestParam("billImage") MultipartFile billImage,
            @RequestParam(value = "note", required = false) String note,
            @RequestParam("orderId") Integer orderId
    ) {
        try {
            PaymentAttempt attempt = paymentService.customerConfirmPayment(orderId, note, billImage);
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Upload bill thành công. Đơn hàng đang chờ xác nhận.",
                "attemptId", attempt.getAttemptId()
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", e.getMessage()
            ));
        }
    }

    /**
     * Đổi sang thanh toán COD
     * POST /api/payments/change-to-cod
     */
    @PostMapping("/change-to-cod")
    public ResponseEntity<Map<String, String>> changeToCOD(@RequestBody Map<String, String> request) {
        try {
            String orderCode = request.get("orderCode");
            if (orderCode == null || orderCode.isBlank()) {
                return ResponseEntity.badRequest().body(Map.of(
                    "success", "false",
                    "message", "orderCode is required"
                ));
            }
            
            paymentService.changeToCOD(orderCode);
            
            return ResponseEntity.ok(Map.of(
                "success", "true",
                "message", "Đã chuyển sang thanh toán COD thành công"
            ));
        } catch (IllegalStateException | IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", "false",
                "message", e.getMessage()
            ));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of(
                "success", "false",
                "message", "Có lỗi xảy ra: " + e.getMessage()
            ));
        }
    }
}
