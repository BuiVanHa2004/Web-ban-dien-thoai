package com.webbanhang.shop.Controller.Payments;

import com.webbanhang.shop.DTO.Payments.AdminCreateBankTransactionRequest;
import com.webbanhang.shop.DTO.Payments.BankTransactionDto;
import com.webbanhang.shop.DTO.Payments.MatchResultDto;
import com.webbanhang.shop.Model.Orders.BankTransaction;
import com.webbanhang.shop.Service.Payments.BankTransactionService;
import org.springframework.http.ResponseEntity;
import org.springframework.lang.NonNull;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/bank-transactions")
public class AdminBankTransactionController {

    private final BankTransactionService bankTransactionService;
    private final com.webbanhang.shop.Repository.Admins.AdminAccountRepository adminAccountRepository;
    private final com.webbanhang.shop.Repository.Orders.OrderRepository orderRepository;

    public AdminBankTransactionController(
            BankTransactionService bankTransactionService,
            com.webbanhang.shop.Repository.Admins.AdminAccountRepository adminAccountRepository,
            com.webbanhang.shop.Repository.Orders.OrderRepository orderRepository
    ) {
        this.bankTransactionService = bankTransactionService;
        this.adminAccountRepository = adminAccountRepository;
        this.orderRepository = orderRepository;
    }

    private BankTransactionDto mapToDto(@NonNull BankTransaction tx) {
        String adminName = null;
        if (tx.getMatchedByAdminId() != null) {
            if (tx.getMatchedByAdminId() == 0) {
                adminName = "Hệ thống";
            } else {
                adminName = adminAccountRepository.findById(tx.getMatchedByAdminId())
                        .map(com.webbanhang.shop.Model.Admins.AdminAccount::getFullName)
                        .orElse("Admin #" + tx.getMatchedByAdminId());
            }
        }
        String orderCode = null;
        if (tx.getMatchedOrderId() != null) {
            orderCode = orderRepository.findById(tx.getMatchedOrderId())
                    .map(com.webbanhang.shop.Model.Orders.Order::getOrderCode)
                    .orElse(null);
        }
        return BankTransactionDto.fromEntity(tx, adminName, orderCode);
    }

    @GetMapping
    public List<BankTransactionDto> getAll(
            @RequestParam(value = "matched", required = false) Boolean matched,
            @RequestParam(value = "trash", required = false) Boolean trash
    ) {
        return bankTransactionService.getAll(matched, trash).stream().map(this::mapToDto).toList();
    }

    @GetMapping("/selectable-orders")
    public List<com.webbanhang.shop.DTO.Payments.SelectableOrderDto> getSelectableOrders() {
        return bankTransactionService.getSelectableOrders();
    }

    @PostMapping
    public ResponseEntity<BankTransactionDto> create(@RequestBody AdminCreateBankTransactionRequest request) {
        BankTransaction tx = bankTransactionService.createTransactionFromAdminInput(request);
        return ResponseEntity.ok(mapToDto(tx));
    }

    @PostMapping("/import")
    public List<BankTransactionDto> importFromText(@RequestBody Map<String, String> body) {
        String payload = body.getOrDefault("payload", "");
        return bankTransactionService.importTransactionsFromFile(payload).stream().map(this::mapToDto).toList();
    }

    @PostMapping("/auto-match")
    public List<MatchResultDto> autoMatch() {
        return bankTransactionService.autoMatchByContent();
    }

    @PostMapping("/{transactionId}/confirm-match")
    public ResponseEntity<BankTransactionDto> confirmMatch(
            @PathVariable Integer transactionId,
            @RequestParam("orderId") Integer orderId,
            @RequestParam(value = "adminId", defaultValue = "1") Integer adminId,
            @RequestParam(value = "note", required = false) String note
    ) {
        BankTransaction tx = bankTransactionService.confirmMatch(transactionId, orderId, adminId, note);
        return ResponseEntity.ok(mapToDto(tx));
    }

    @PostMapping("/{transactionId}/reject")
    public ResponseEntity<BankTransactionDto> reject(
            @PathVariable Integer transactionId,
            @RequestParam(required = false) Integer orderId,
            @RequestParam(required = false) Integer adminId,
            @RequestParam(required = false) String note
    ) {
        return ResponseEntity.ok(mapToDto(bankTransactionService.rejectMatch(transactionId, orderId, adminId, note)));
    }
    
    @DeleteMapping("/{transactionId}")
    public ResponseEntity<Void> delete(@PathVariable Integer transactionId) {
        bankTransactionService.delete(transactionId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{transactionId}/restore")
    public ResponseEntity<Void> restore(@PathVariable Integer transactionId) {
        bankTransactionService.restore(transactionId);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{transactionId}/hard")
    public ResponseEntity<Void> hardDelete(@PathVariable Integer transactionId) {
        bankTransactionService.hardDelete(transactionId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{transactionId}/re-match")
    public ResponseEntity<BankTransactionDto> reMatch(
            @PathVariable Integer transactionId,
            @RequestParam(value = "adminId", defaultValue = "1") Integer adminId,
            @RequestParam(value = "note", required = false) String note
    ) {
        BankTransaction tx = bankTransactionService.reMatchTransaction(transactionId, adminId, note);
        return ResponseEntity.ok(mapToDto(tx));
    }
}
