package com.webbanhang.shop.Controller.Customers;

import com.webbanhang.shop.DTO.Customers.ChangePasswordRequest;
import com.webbanhang.shop.DTO.Customers.CustomerAccountDto;
import com.webbanhang.shop.DTO.Customers.CustomerAccountUpsertRequest;
import com.webbanhang.shop.Service.Customers.CustomerAccountService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/customers")
public class CustomerAccountController {

    private final CustomerAccountService customerAccountService;

    public CustomerAccountController(CustomerAccountService customerAccountService) {
        this.customerAccountService = customerAccountService;
    }

    @GetMapping
    public List<CustomerAccountDto> getAll() {
        return customerAccountService.findAllActive().stream().map(CustomerAccountDto::fromEntity).toList();
    }

    @GetMapping("/trash")
    public List<CustomerAccountDto> getTrash() {
        return customerAccountService.findAllTrashed().stream().map(CustomerAccountDto::fromEntity).toList();
    }

    @GetMapping("/{id:\\d+}")
    public ResponseEntity<CustomerAccountDto> getById(@PathVariable Integer id) {
        return customerAccountService.findById(id)
                .map(CustomerAccountDto::fromEntity)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<CustomerAccountDto> create(@RequestBody CustomerAccountUpsertRequest req) {
        var created = customerAccountService.create(req);
        return ResponseEntity.status(HttpStatus.CREATED).body(CustomerAccountDto.fromEntity(created));
    }

    @PutMapping("/{id:\\d+}")
    public ResponseEntity<CustomerAccountDto> update(@PathVariable Integer id, @RequestBody CustomerAccountUpsertRequest req) {
        return customerAccountService.update(id, req)
                .map(CustomerAccountDto::fromEntity)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id:\\d+}/password")
    public ResponseEntity<Void> changePassword(@PathVariable Integer id, @RequestBody ChangePasswordRequest req) {
        customerAccountService.changePassword(id, req);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id:\\d+}/restore")
    public ResponseEntity<Void> restore(@PathVariable Integer id) {
        boolean ok = customerAccountService.restore(id);
        if (!ok) return ResponseEntity.notFound().build();
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id:\\d+}")
    public ResponseEntity<Void> delete(@PathVariable Integer id) {
        boolean ok = customerAccountService.softDelete(id);
        if (!ok) return ResponseEntity.notFound().build();
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id:\\d+}/force")
    public ResponseEntity<Void> deleteForever(@PathVariable Integer id) {
        boolean ok = customerAccountService.deleteForever(id);
        if (!ok) return ResponseEntity.notFound().build();
        return ResponseEntity.noContent().build();
    }
}
