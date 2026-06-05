package com.webbanhang.shop.Controller.Payments;

import com.webbanhang.shop.DTO.Payments.BankTransferStatusDto;
import com.webbanhang.shop.Service.Payments.PaymentService;
import com.webbanhang.shop.DTO.Orders.PaymentQRResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/payments/bank-transfer")
public class BankTransferPaymentController {

    private final PaymentService paymentService;

    public BankTransferPaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @GetMapping("/orders/{orderId}/qr-info")
    public ResponseEntity<PaymentQRResponse> getQRInfo(@PathVariable Integer orderId) {
        return ResponseEntity.ok(paymentService.getPaymentQRInfo(orderId));
    }

    @PostMapping(value = "/confirm-transfer", consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> customerConfirm(
            @RequestParam("orderId") Integer orderId,
            @RequestParam(value = "transferNote", required = false) String transferNote,
            @RequestParam(value = "billImage", required = false) MultipartFile billImage
    ) {
        return ResponseEntity.ok(paymentService.customerConfirmPayment(orderId, transferNote, billImage));
    }

    @GetMapping("/orders/{orderId}/status")
    public ResponseEntity<BankTransferStatusDto> status(@PathVariable Integer orderId) {
        return ResponseEntity.ok(paymentService.getBankTransferStatus(orderId));
    }
}
